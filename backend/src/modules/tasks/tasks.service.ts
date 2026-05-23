import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { AssignTaskDto, CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { baseSelect, fetchPopulate } from './tasks.utils';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, role: Role, projectId?: string) {
    try {
      const where: Prisma.TaskWhereInput = {};

      if (projectId) where.projectId = projectId;

      if (role === Role.ANALYST) where.assigneeId = userId;

      const tasks = await this.prisma.task.findMany({
        where,
        select: {
          ...baseSelect,
          updatedAt: true,
          ...fetchPopulate,
          _count: { select: { timeEntries: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: this.sanitizeTasks(tasks, role),
        message: 'Tasks fetched success',
      };
    } catch (error) {
      this.logger.error('Error in findAll', error);
      return { success: false, data: [], message: 'Failed to fetch tasks' };
    }
  }

  async findMyTasks(userId: string, role: Role) {
    try {
      const tasks = await this.prisma.task.findMany({
        where: { assigneeId: userId },
        select: {
          ...baseSelect,
          updatedAt: true,
          ...fetchPopulate,
          _count: { select: { timeEntries: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: this.sanitizeTasks(tasks, role),
        message: 'My tasks fetched success',
      };
    } catch (error) {
      this.logger.error('Error in findMyTasks', error);
      return { success: false, data: [], message: 'Failed to fetch my tasks' };
    }
  }

  async findOne(id: string, userId: string, role: Role) {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id },
        select: {
          ...baseSelect,
          updatedAt: true,
          ...fetchPopulate,
          timeEntries: {
            select: {
              id: true,
              minutes: true,
              entryDate: true,
              notes: true,
              isLate: true,
              user: { select: { id: true, name: true } },
            },
            orderBy: { entryDate: 'desc' },
          },
        },
      });

      if (!task) return { success: false, message: 'Task not found' };

      if (role === Role.ANALYST) {
        const membership = await this.prisma.projectMember.findUnique({
          where: {
            projectId_userId: { projectId: task.project.id, userId },
          },
        });
        if (!membership) return { success: false, message: 'Task not found' };
      }

      return {
        success: true,
        data: this.sanitizeTask(task, role),
        message: 'Task fetched success',
      };
    } catch (error) {
      this.logger.error('Error in findOne', error);
      return { success: false, message: 'Failed to fetch task' };
    }
  }

  async create(dto: CreateTaskDto, createdById: string) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
      });
      if (!project) return { success: false, message: 'Project not found' };

      if (dto.assigneeId) {
        const assignee = await this.prisma.user.findUnique({
          where: { id: dto.assigneeId },
        });
        if (!assignee) return { success: false, message: 'Assignee not found' };
      }

      const task = await this.prisma.task.create({
        data: {
          projectId: dto.projectId,
          title: dto.title,
          description: dto.description,
          priority: dto.priority ?? 'medium',
          assigneeId: dto.assigneeId ?? null,
          createdById,
          expectedMinutes: dto.expectedMinutes ?? null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        },
        select: {
          ...baseSelect,
          ...fetchPopulate,
        },
      });

      this.logger.log(`Task created: ${task.title} by ${createdById}`);
      return {
        success: true,
        data: task,
        message: 'Task created success',
      };
    } catch (error) {
      this.logger.error('Error in create', error);
      return { success: false, message: 'Failed to create task' };
    }
  }

  async update(id: string, dto: UpdateTaskDto, userId: string, role: Role) {
    try {
      const task = await this.prisma.task.findUnique({ where: { id } });
      if (!task) return { success: false, message: 'Task not found' };

      if (role === Role.ANALYST) {
        if (task.assigneeId !== userId)
          return { success: false, message: 'Task not assigned' };
        if (!dto.status)
          return { success: false, message: 'Only update task status' };
      }

      const updateData: Prisma.TaskUpdateInput =
        role === Role.ANALYST
          ? { status: dto.status }
          : {
              ...(dto.title && { title: dto.title }),
              ...(dto.description !== undefined && {
                description: dto.description,
              }),
              ...(dto.status && { status: dto.status }),
              ...(dto.priority && { priority: dto.priority }),
              ...(dto.expectedMinutes !== undefined && {
                expectedMinutes: dto.expectedMinutes,
              }),
              ...(dto.dueDate && {
                dueDate: new Date(dto.dueDate),
              }),
            };

      const updated = await this.prisma.task.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          expectedMinutes: true,
          dueDate: true,
          updatedAt: true,
          assignee: { select: { id: true, name: true } },
        },
      });

      return {
        success: true,
        data: this.sanitizeTask(updated, role),
        message: 'Task updated success',
      };
    } catch (error) {
      this.logger.error('Error in task update', error);
      return { success: false, message: 'Failed to update task' };
    }
  }

  async assign(id: string, dto: AssignTaskDto) {
    try {
      const task = await this.prisma.task.findUnique({ where: { id } });
      if (!task) return { success: false, message: 'Task not found' };

      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assigneeId },
      });
      if (!assignee) return { success: false, message: 'Assignee not found' };

      const updated = await this.prisma.task.update({
        where: { id },
        data: { assigneeId: dto.assigneeId },
        select: {
          id: true,
          title: true,
          status: true,
          assignee: fetchPopulate.assignee,
          updatedAt: true,
        },
      });

      this.logger.log(`Task ${id} assigned to ${dto.assigneeId}`);
      return {
        success: true,
        data: updated,
        message: 'Task assigned success',
      };
    } catch (error) {
      this.logger.error('Error in assign', error);
      return { success: false, message: 'Failed to assign task' };
    }
  }

  async remove(id: string) {
    try {
      const task = await this.prisma.task.findUnique({ where: { id } });
      if (!task) return { success: false, message: 'Task not found' };

      await this.prisma.task.delete({ where: { id } });

      return { success: true, message: 'Task deleted success' };
    } catch (error) {
      this.logger.error('Error in remove', error);
      return { success: false, message: 'Failed to delete task' };
    }
  }

  //helpers
  private sanitizeTask<T extends Record<string, unknown>>(
    task: T,
    role: Role,
  ): T {
    if (role === Role.ANALYST) {
      const newTask = { ...task } as Record<string, unknown>;
      delete newTask.expectedMinutes;
      return newTask as T;
    }
    return task;
  }

  private sanitizeTasks<T extends Record<string, unknown>>(
    tasks: T[],
    role: Role,
  ): T[] {
    return tasks.map((t) => this.sanitizeTask(t, role));
  }
}
