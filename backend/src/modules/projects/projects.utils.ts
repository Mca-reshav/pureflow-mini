export const baseSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  startDate: true,
  endDate: true,
  createdAt: true,
};
export const fetchPopulated = {
  owner: { select: { id: true, name: true, email: true } },
  members: {
    select: {
      id: true,
      addedAt: true,
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  },
  tasks: {
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      expectedMinutes: true,
      assignee: { select: { id: true, name: true } },
    },
  },
};
