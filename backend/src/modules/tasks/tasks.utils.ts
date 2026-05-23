export const baseSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  expectedMinutes: true,
  dueDate: true,
  createdAt: true,
};
export const fetchPopulate = {
  project: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
};
