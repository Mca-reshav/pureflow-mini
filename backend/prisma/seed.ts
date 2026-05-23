import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  emailObj,
  passwordObj,
  usersData,
  projectsData,
  tasksData,
  timeEntriesData,
} from './seed.data';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const userMap: Record<string, string> = {};

  for (const u of usersData) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        status: u.status,
      },
    });
    userMap[u.email] = user.id;
  }

  console.log('Users created ::', Object.keys(userMap).length);

  for (const p of projectsData) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        ownerId: userMap[p.ownerEmail],
        startDate: p.startDate,
        endDate: p.endDate,
      },
    });
  }

  console.log('Projects created ::', projectsData.length);

  const memberCombos = [
    {
      projectId: 'seed-project-001',
      userId: userMap[emailObj.analyst],
      addedBy: userMap[emailObj.bm],
    },
    {
      projectId: 'seed-project-002',
      userId: userMap[emailObj.analyst],
      addedBy: userMap[emailObj.bm],
    },
    {
      projectId: 'seed-project-001',
      userId: userMap[emailObj.bm],
      addedBy: userMap[emailObj.admin],
    },
    {
      projectId: 'seed-project-002',
      userId: userMap[emailObj.bm],
      addedBy: userMap[emailObj.admin],
    },
  ];

  for (const m of memberCombos) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: m.projectId, userId: m.userId } },
      update: {},
      create: m,
    });
  }

  console.log('Project members added :: ' + memberCombos.length);

  for (const t of tasksData) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        projectId: t.projectId,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assigneeId: userMap[t.assigneeEmail],
        createdById: userMap[emailObj.bm],
        expectedMinutes: t.expectedMinutes,
        dueDate: t.dueDate,
      },
    });
  }

  console.log('Tasks created ::', tasksData.length);

  for (const e of timeEntriesData) {
    await prisma.timeEntry.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        taskId: e.taskId,
        projectId: e.projectId,
        userId: userMap[e.userEmail],
        minutes: e.minutes,
        entryDate: e.entryDate,
        notes: e.notes,
        isLate: e.isLate,
      },
    });
  }

  console.log('Time entries created :: ' + timeEntriesData.length);

  console.log('Seed completed ::');
  console.log('ADMIN :: ', [emailObj.admin, passwordObj.admin]);
  console.log('BM :: ', [emailObj.bm, passwordObj.bm]);
  console.log('ANALYST :: ', [emailObj.analyst, passwordObj.analyst]);
}

main()
  .catch((e) => {
    console.error('Seed failed :: ', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
