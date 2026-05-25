export const QUEUE_SLUG = Object.freeze({
  NOTIFICATIONS: 'notifications',
  REPORT_EXPORT: 'report-export',
} as const);

export const JOB_SLUG = Object.freeze({
  TASK_ASSIGNED: 'task.assigned',
  MEMBER_ADDED: 'project.member.added',
  TIME_LATE: 'time.late_logged',
  REPORT_EXPORT: 'report.export',
  ROLE_CHANGED: 'user.role.changed',
  SESSION_ENDED: 'session.ended',
} as const);
