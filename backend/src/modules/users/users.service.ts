import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private notificationService: NotificationsService,
  ) {}

  async findAll() {
    try {
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return {
        success: !!users,
        data: users || [],
        message: users ? 'Success on fetch all' : 'Failed to fetch all',
      };
    } catch (error) {
      this.logger.error('Error in findAll service', error);
      return { success: false, message: 'Failed to fetch all' };
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: !!user,
        data: user || {},
        message: user ? 'User fetched' : 'User not found',
      };
    } catch (error) {
      this.logger.error('Error in findOne service', error);
      return { success: false, message: 'Failed to fetch' };
    }
  }

  async create(dto: CreateUserDto) {
    try {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing)
        return { success: false, message: 'Email already registered' };

      const passwordHash = await bcrypt.hash(dto.password, 12);

      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: dto.role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      if (user) this.logger.log(`User created: ${user.email} (${user.role})`);
      return {
        success: !!user,
        data: user || {},
        message: user ? 'Created by success' : 'Failed to create',
      };
    } catch (error) {
      this.logger.error('Error in create service', error);
      return { success: false, message: 'Failed to create' };
    }
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) return { success: false, message: 'User not found' };

      const roleChanging = dto.role && dto.role !== user.role,
        statusChanging = dto.status && dto.status !== user.status;

      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.role && { role: dto.role }),
          ...(dto.status && { status: dto.status }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      if (!updated) return { success: false, message: 'Failed to update' };
      if (roleChanging) {
        const change = `From ${user.role} To ${dto.role}`;
        await this.notificationService.emitRoleChanged(id, actorId, change);
      }
      if (roleChanging || statusChanging) {
        const resp = await this.authService.revokeAllUserSessions(id);
        if (!resp || !resp.success)
          return { success: false, message: resp.message };
        this.logger.log(`Sessions revoked :: user ${id} by ${actorId}`);
      }

      return { success: true, data: updated, message: 'Success on update' };
    } catch (error) {
      this.logger.error('Error in update service', error);
      return { success: false, message: 'Failed to update' };
    }
  }

  async deactivate(id: string, actorId: string) {
    try {
      if (id === actorId)
        return { success: false, message: 'You cannot deactivate yourself' };

      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) return { success: true, message: 'User not found' };

      const updateResp = await this.prisma.user.update({
        where: { id },
        data: { status: 'inactive' },
      });
      if (!updateResp) return { success: false, message: 'Failed to update' };

      const revokeResp = await this.authService.revokeAllUserSessions(id);
      if (!revokeResp || !revokeResp.success)
        return { success: false, message: revokeResp.message };

      this.logger.log(`User deactivated :: ${user.email} by ${actorId}`);
      return { success: true, message: 'User deactivated' };
    } catch (error) {
      this.logger.error('Error in deactivate service', error);
      return { success: false, message: 'Failed to deactivate' };
    }
  }

  async reactivate(id: string, actorId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id, status: 'inactive' },
      });
      if (!user) return { success: true, message: 'User not found' };

      const updateResp = await this.prisma.user.update({
        where: { id },
        data: { status: 'active' },
      });
      if (!updateResp) return { success: false, message: 'Failed to update' };

      this.logger.log(`User reactivated :: ${user.email} by ${actorId}`);
      return { success: true, message: 'User reactivated' };
    } catch (error) {
      this.logger.error('Error in reactivate service', error);
      return { success: false, message: 'Failed to reactivate' };
    }
  }
}
