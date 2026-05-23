import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { AddMemberDto, CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { baseSelect, fetchPopulated } from './projects.utils';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(userId: string, role: Role) {
    try {
      const where =
        role === Role.ANALYST ? { members: { some: { userId } } } : {};
      const projects = await this.prisma.project.findMany({
        where,
        select: {
          ...baseSelect,
          owner: fetchPopulated.owner,
          _count: { select: { members: true, tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: projects,
        message: 'Projects fetched success',
      };
    } catch (error) {
      this.logger.error('Error in findAll', error);
      return { success: false, data: [], message: 'Failed to fetch projects' };
    }
  }

  async findOne(id: string) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id },
        select: {
          ...baseSelect,
          updatedAt: true,
          owner: fetchPopulated.owner,
          members: fetchPopulated.members,
          tasks: {
            select: fetchPopulated.tasks.select,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!project) return { success: false, message: 'Project not found' };

      return {
        success: true,
        data: project,
        message: 'Project fetched success',
      };
    } catch (error) {
      this.logger.error('Error in findOne', error);
      return { success: false, message: 'Failed to fetch project' };
    }
  }

  async create(dto: CreateProjectDto, ownerId: string) {
    try {
      const project = await this.prisma.project.create({
        data: {
          name: dto.name,
          description: dto.description,
          ownerId,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        },
        select: {
          ...baseSelect,
          owner: fetchPopulated.owner,
        },
      });

      this.logger.log(`Project created :: ${project.name} by ${ownerId}`);
      return {
        success: true,
        data: project,
        message: 'Project created success',
      };
    } catch (error) {
      this.logger.error('Error in create', error);
      return { success: false, message: 'Failed to create project' };
    }
  }

  async update(id: string, dto: UpdateProjectDto) {
    try {
      const project = await this.prisma.project.findUnique({ where: { id } });
      if (!project) return { success: false, message: 'Project not found' };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createdAt, ...base } = baseSelect;
      const updated = await this.prisma.project.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.status && { status: dto.status }),
          ...(dto.startDate && { startDate: new Date(dto.startDate) }),
          ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        },
        select: {
          ...base,
          updatedAt: true,
        },
      });

      return {
        success: true,
        data: updated,
        message: 'Project updated success',
      };
    } catch (error) {
      this.logger.error('Error in update', error);
      return { success: false, message: 'Failed to update project' };
    }
  }

  async archive(id: string) {
    try {
      const project = await this.prisma.project.findUnique({ where: { id } });
      if (!project) return { success: false, message: 'Project not found' };

      if (project.status === 'archived')
        return { success: false, message: 'Project is already archived' };

      await this.prisma.project.update({
        where: { id },
        data: { status: 'archived' },
      });

      return { success: true, message: 'Project archived success' };
    } catch (error) {
      this.logger.error('Error in archive', error);
      return { success: false, message: 'Failed to archive project' };
    }
  }

  async addMember(projectId: string, dto: AddMemberDto, actorId: string) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) return { success: false, message: 'Project not found' };

      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });
      if (!user) return { success: false, message: 'User not found' };

      // Check exist
      const existing = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: dto.userId },
        },
      });
      if (existing) return { success: false, message: 'Already a member' };

      const member = await this.prisma.projectMember.create({
        data: {
          projectId,
          userId: dto.userId,
          addedBy: actorId,
        },
        select: {
          id: true,
          addedAt: true,
          user: { select: { ...fetchPopulated.owner.select, role: true } },
        },
      });

      if (member)
        await this.notificationsService.emitMemberAdded({
          projectId,
          projectName: project.name,
          userId: dto.userId,
          addedBy: actorId,
        });

      this.logger.log(`Member added ::  ${projectId} by ${actorId}`);
      return {
        success: true,
        data: member,
        message: 'Member added success',
      };
    } catch (error) {
      this.logger.error('Error in addMember', error);
      return { success: false, message: 'Failed to add member' };
    }
  }

  async removeMember(projectId: string, userId: string) {
    try {
      const membership = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      if (!membership) return { success: false, message: 'Member not found' };

      await this.prisma.projectMember.delete({
        where: { projectId_userId: { projectId, userId } },
      });

      return { success: true, message: 'Member removed success' };
    } catch (error) {
      this.logger.error('Error in removeMember', error);
      return { success: false, message: 'Failed to remove member' };
    }
  }
}
