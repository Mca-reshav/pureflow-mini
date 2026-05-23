export const QUEUE_SLUG = Object.freeze({
  NOTIFICATIONS: 'notifications',
} as const);

export const JOB_SLUG = Object.freeze({
  TASK_ASSIGNED: 'task.assigned',
  MEMBER_ADDED: 'project.member.added',
  TIME_LATE: 'time.late_logged',
} as const);
