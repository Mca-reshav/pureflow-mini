export interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  expectedMinutes?: number;
  dueDate?: string;
  project: { id: string; name: string };
}

export interface TimeEntryVersion {
  id: string;
  versionNo: number;
  beforeJson: Record<string, any>;
  afterJson: Record<string, any>;
  editedBy: string;
  editedAt: string;
}

export interface TimeEntry {
  id: string;
  minutes: number;
  entryDate: string;
  notes?: string;
  isLate: boolean;
  createdAt: string;
  updatedAt: string;
  task: { id: string; title: string };
  user: { id: string; name: string; email: string };
  versions: TimeEntryVersion[];
}