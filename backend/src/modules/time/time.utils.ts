export const baseSelect = {
  id: true,
  minutes: true,
  entryDate: true,
  notes: true,
  isLate: true,
  createdAt: true,
};

export const populated = {
  task: { select: { id: true, title: true } },
  user: { select: { id: true, name: true } },
};

export const versionsSelect = {
  select: {
    id: true,
    versionNo: true,
    beforeJson: true,
    afterJson: true,
    editedBy: true,
    editedAt: true,
  },
};
