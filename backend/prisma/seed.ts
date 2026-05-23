import {
  PrismaClient,
  Role,
  UserStatus,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
export const password = 'Password@123',
  emailObj = Object.freeze({
    admin: 'admin@pureflow.dev',
    analyst: 'analyst@pureflow.dev',
    bm: 'bm@pureflow.dev',
  } as const);

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email: emailObj.admin },
    update: {},
    create: {
      name: 'Admin User',
      email: emailObj.admin,
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.active,
    },
  });

  const bm = await prisma.user.upsert({
    where: { email: emailObj.bm },
    update: {},
    create: {
      name: 'Business Manager',
      email: emailObj.bm,
      passwordHash,
      role: Role.BM,
      status: UserStatus.active,
    },
  });

  const analyst = await prisma.user.upsert({
    where: { email: emailObj.analyst },
    update: {},
    create: {
      name: 'Analyst User',
      email: emailObj.analyst,
      passwordHash,
      role: Role.ANALYST,
      status: UserStatus.active,
    },
  });

  console.log('Users created :: ', [admin.role, bm.role, analyst.role]);

  const project = await prisma.project.upsert({
    where: { id: 'seed-project-001' },
    update: {},
    create: {
      id: 'seed-project-001',
      name: 'PureFlow Platform',
      description: 'Main product development project',
      status: ProjectStatus.active,
      ownerId: bm.id,
      startDate: new Date('2026-05-22'),
      endDate: new Date('2026-06-22'),
    },
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: analyst.id } },
    update: {},
    create: {
      projectId: project.id,
      userId: analyst.id,
      addedBy: bm.id,
    },
  });

  console.log('Project created :: ', project.name);

  const task1 = await prisma.task.upsert({
    where: { id: 'seed-task-001' },
    update: {},
    create: {
      id: 'seed-task-001',
      projectId: project.id,
      title: 'Setup authentication module',
      description: 'Implement JWT-based auth with refresh tokens',
      status: TaskStatus.in_progress,
      priority: TaskPriority.high,
      assigneeId: analyst.id,
      createdById: bm.id,
      expectedMinutes: 240,
      dueDate: new Date('2026-05-30'),
    },
  });

  const task2 = await prisma.task.upsert({
    where: { id: 'seed-task-002' },
    update: {},
    create: {
      id: 'seed-task-002',
      projectId: project.id,
      title: 'Design database schema',
      description: 'Create all domain schemas with proper indexes',
      status: TaskStatus.done,
      priority: TaskPriority.critical,
      assigneeId: analyst.id,
      createdById: bm.id,
      expectedMinutes: 180,
    },
  });

  console.log('Tasks created :: ', task1.title, '|', task2.title);

  await prisma.timeEntry.upsert({
    where: { id: 'seed-time-001' },
    update: {},
    create: {
      id: 'seed-time-001',
      taskId: task1.id,
      projectId: project.id,
      userId: analyst.id,
      minutes: 90,
      entryDate: new Date(),
      notes: 'Initial setup and planning',
      isLate: false,
    },
  });

  console.log('Time entry created :: ');

  console.log('Seed completed ::');
  console.log('Login credentials :: ' + password);
  console.log('ADMIN :: ' + emailObj.admin);
  console.log('BM :: ' + emailObj.bm);
  console.log('ANALYST :: ' + emailObj.analyst);
}

main()
  .catch((e) => {
    console.error('Seed failed :: ', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
