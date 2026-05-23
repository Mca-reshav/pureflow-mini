import {
  Role,
  UserStatus,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
} from '@prisma/client';

export const passwordObj = Object.freeze({
  admin: 'Admin1234!',
  bm: 'Manager1234!',
  analyst: 'Analyst1234!',
} as const);

export const emailObj = Object.freeze({
  admin: 'admin@pureflow.dev',
  bm: 'bm@pureflow.dev',
  analyst: 'analyst@pureflow.dev',
} as const);

export const usersData = [
  {
    email: emailObj.admin,
    name: 'Alex Admin',
    role: Role.ADMIN,
    status: UserStatus.active,
    password: passwordObj.admin,
  },
  {
    email: emailObj.bm,
    name: 'Blake Manager',
    role: Role.BM,
    status: UserStatus.active,
    password: passwordObj.bm,
  },
  {
    email: emailObj.analyst,
    name: 'Casey Analyst',
    role: Role.ANALYST,
    status: UserStatus.active,
    password: passwordObj.analyst,
  },
] as const;

export const projectsData = [
  {
    id: 'seed-project-001',
    name: 'PureFlow Platform',
    description: 'Main product development project',
    status: ProjectStatus.active,
    startDate: new Date('2026-05-22'),
    endDate: new Date('2026-06-22'),
    ownerEmail: emailObj.bm,
  },
  {
    id: 'seed-project-002',
    name: 'PureFlow Platform 2.0',
    description: 'Main product development project 2.0',
    status: ProjectStatus.active,
    startDate: new Date('2026-05-22'),
    endDate: new Date('2026-06-22'),
    ownerEmail: emailObj.bm,
  },
] as const;

export const tasksData = [
  {
    id: 'seed-task-001',
    projectId: 'seed-project-001',
    title: 'Task title 1.1',
    description: 'Task description 1.1',
    status: TaskStatus.in_progress,
    priority: TaskPriority.high,
    assigneeEmail: emailObj.analyst,
    expectedMinutes: 240,
    dueDate: new Date('2026-05-30'),
  },
  {
    id: 'seed-task-002',
    projectId: 'seed-project-001',
    title: 'Task title 1.2',
    description: 'Task description 1.2',
    status: TaskStatus.done,
    priority: TaskPriority.critical,
    assigneeEmail: emailObj.analyst,
    expectedMinutes: 180,
    dueDate: new Date('2026-05-30'),
  },
  {
    id: 'seed-task-003',
    projectId: 'seed-project-001',
    title: 'Task title 1.3',
    description: 'Task description 1.3',
    status: TaskStatus.todo,
    priority: TaskPriority.medium,
    assigneeEmail: emailObj.bm,
    expectedMinutes: 360,
    dueDate: new Date('2026-05-30'),
  },
  {
    id: 'seed-task-004',
    projectId: 'seed-project-001',
    title: 'Task title 1.4',
    description: 'Task description 1.4',
    status: TaskStatus.todo,
    priority: TaskPriority.low,
    assigneeEmail: emailObj.bm,
    expectedMinutes: 120,
    dueDate: new Date('2026-05-30'),
  },
  {
    id: 'seed-task-005',
    projectId: 'seed-project-002',
    title: 'Task title 2.1',
    description: 'Task description 2.1',
    status: TaskStatus.in_progress,
    priority: TaskPriority.high,
    assigneeEmail: emailObj.bm,
    expectedMinutes: 200,
    dueDate: new Date('2026-06-01'),
  },
  {
    id: 'seed-task-006',
    projectId: 'seed-project-002',
    title: 'Task title 2.2',
    description: 'Task description 2.2',
    status: TaskStatus.blocked,
    priority: TaskPriority.critical,
    assigneeEmail: emailObj.bm,
    expectedMinutes: 480,
    dueDate: new Date('2026-06-01'),
  },
] as const;

export const timeEntriesData = [
  {
    id: 'seed-time-001',
    taskId: 'seed-task-001',
    projectId: 'seed-project-001',
    userEmail: emailObj.analyst,
    minutes: 90,
    entryDate: new Date(),
    notes: 'General 1',
    isLate: false,
  },
  {
    id: 'seed-time-002',
    taskId: 'seed-task-001',
    projectId: 'seed-project-001',
    userEmail: emailObj.analyst,
    minutes: 120,
    entryDate: new Date(Date.now() - 1 * 86400000),
    notes: 'General 2',
    isLate: false,
  },
  {
    id: 'seed-time-003',
    taskId: 'seed-task-002',
    projectId: 'seed-project-001',
    userEmail: emailObj.analyst,
    minutes: 180,
    entryDate: new Date(Date.now() - 2 * 86400000),
    notes: 'General 3',
    isLate: false,
  },
  {
    id: 'seed-time-004',
    taskId: 'seed-task-002',
    projectId: 'seed-project-001',
    userEmail: emailObj.analyst,
    minutes: 60,
    entryDate: new Date(Date.now() - 5 * 86400000),
    notes: 'Late log',
    isLate: true,
  },
] as const;
