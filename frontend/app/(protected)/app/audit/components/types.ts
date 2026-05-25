export interface AuditActor {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  beforeJson?: Record<string, any> | null;
  afterJson?: Record<string, any> | null;
  createdAt: string;
  actor: AuditActor;
}

export interface AuditFilters {
  entityType: string;
  action: string;
  actorId: string;
  limit: number;
  offset: number;
}