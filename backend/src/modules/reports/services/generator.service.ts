/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

export interface ReportPermSnapshot {
  userId: string;
  role: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  canViewExpectedMinutes: boolean;
}

interface ReportRow {
  project: string;
  task: string;
  assignee: string;
  date: string;
  minutesLogged: number;
  expectedMinutes?: number;
  lateEntry: string;
  notes: string;
}

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);

  constructor(private prisma: PrismaService) {}

  async fetchData(snapshot: ReportPermSnapshot): Promise<ReportRow[]> {
    const where: any = {};

    if (snapshot.projectId) where.projectId = snapshot.projectId;
    if (snapshot.dateFrom || snapshot.dateTo) {
      where.entryDate = {
        ...(snapshot.dateFrom && { gte: new Date(snapshot.dateFrom) }),
        ...(snapshot.dateTo && { lte: new Date(snapshot.dateTo) }),
      };
    }
    if (snapshot.role === 'ANALYST') {
      where.userId = snapshot.userId;
      where.task = {
        project: { members: { some: { userId: snapshot.userId } } },
      };
    }

    const entries = await this.prisma.timeEntry.findMany({
      where,
      select: {
        minutes: true,
        entryDate: true,
        notes: true,
        isLate: true,
        task: {
          select: {
            title: true,
            expectedMinutes: true,
            project: { select: { name: true } },
            assignee: { select: { name: true } },
          },
        },
      },
      orderBy: { entryDate: 'asc' },
    });

    return entries.map((e) => {
      const row: ReportRow = {
        project: e.task.project.name,
        task: e.task.title,
        assignee: e.task.assignee?.name ?? 'Unassigned',
        date: e.entryDate.toISOString().split('T')[0],
        minutesLogged: e.minutes,
        lateEntry: e.isLate ? 'Yes' : 'No',
        notes: e.notes ?? '',
      };

      if (snapshot.canViewExpectedMinutes)
        row.expectedMinutes = e.task.expectedMinutes ?? undefined;

      return row;
    });
  }

  async generateCsv(snapshot: ReportPermSnapshot): Promise<Buffer> {
    const rows = await this.fetchData(snapshot);

    const headers = [
      'Project',
      'Task',
      'Assignee',
      'Date',
      'Minutes Logged',
      ...(snapshot.canViewExpectedMinutes ? ['Expected Minutes'] : []),
      'Late Entry',
      'Notes',
    ];

    const lines = [
      headers.join(','),
      ...rows.map((r) => {
        const cols = [
          `"${r.project}"`,
          `"${r.task}"`,
          `"${r.assignee}"`,
          r.date,
          r.minutesLogged,
          ...(snapshot.canViewExpectedMinutes ? [r.expectedMinutes ?? ''] : []),
          r.lateEntry,
          `"${r.notes}"`,
        ];
        return cols.join(',');
      }),
    ];

    this.logger.log(`CSV generated :: ${rows.length} rows`);
    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  async generateXlsx(snapshot: ReportPermSnapshot): Promise<Buffer> {
    const rows = await this.fetchData(snapshot);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PureFlow Mini';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Time Report');

    const columns: Partial<ExcelJS.Column>[] = [
      { header: 'Project', key: 'project', width: 30 },
      { header: 'Task', key: 'task', width: 30 },
      { header: 'Assignee', key: 'assignee', width: 20 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Minutes Logged', key: 'minutesLogged', width: 20 },
      ...(snapshot.canViewExpectedMinutes
        ? [
            {
              header: 'Expected Minutes',
              key: 'expectedMinutes',
              width: 20,
            } as Partial<ExcelJS.Column>,
          ]
        : []),
      { header: 'Late Entry', key: 'lateEntry', width: 20 },
      { header: 'Notes', key: 'notes', width: 50 },
    ];

    sheet.columns = columns;

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };

    rows.forEach((r) => {
      const row: any = {
        project: r.project,
        task: r.task,
        assignee: r.assignee,
        date: r.date,
        minutesLogged: r.minutesLogged,
        lateEntry: r.lateEntry,
        notes: r.notes,
      };
      if (snapshot.canViewExpectedMinutes) {
        row.expectedMinutes = r.expectedMinutes ?? '';
      }
      sheet.addRow(row);
    });

    sheet.addRow({});
    const totalRow = sheet.addRow({
      project: 'TOTAL',
      minutesLogged: rows.reduce((sum, r) => sum + r.minutesLogged, 0),
    });
    totalRow.font = { bold: true };

    this.logger.log(`XLSX generated :: ${rows.length} rows`);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
