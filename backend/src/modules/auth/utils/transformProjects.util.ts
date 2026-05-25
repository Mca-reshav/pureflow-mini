type Project = {
  name: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
};

export const transformProjects = (projects: Project[]) => {
  const activeProjects = projects.filter(
    (project) => project.status === 'active',
  );

  const completedProjects = projects.filter(
    (project) => project.status === 'completed',
  );
  return {
    activeProjectsCount: activeProjects.length,
    completedProjectsCount: completedProjects.length,
    latestProject:
      projects.length > 0
        ? {
            name: projects[0].name,
            startDate: projects[0].startDate,
            endDate: projects[0].endDate,
          }
        : null,
  };
};
