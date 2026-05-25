import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';
import { Role } from '@prisma/client';
import { LoginDto } from './dto/auth.dto';
import { RedisService } from 'src/services/redis/redis.service';

type RefreshTokenPayload = {
  sub?: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
};
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private redisServices: RedisService,
  ) {}

  async login(dto: LoginDto, ipHash?: string, userAgent?: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user || user.status !== 'active')
        return { success: false, message: 'Invalid credentials' };

      const passwordValid = await bcrypt.compare(
        dto.password,
        user.passwordHash,
      );
      if (!passwordValid)
        return { success: false, message: 'Incorrect password' };

      const sessionId = createId();
      const { accessToken, refreshToken } = await this.generateTokens(
        user.id,
        user.email,
        user.role,
        sessionId,
      );

      const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const added = await this.prisma.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshTokenHash,
          ipHash: ipHash ?? null,
          userAgent: userAgent ?? null,
          expiresAt,
        },
      });
      if (!added)
        return { success: false, message: 'Failed to create session' };

      await this.redisServices.set(`session:${sessionId}`, user.id);

      this.logger.log(`User logged in: ${user.email} (${user.role})`);

      return { success: true, data: { accessToken, refreshToken, user } };
    } catch (error) {
      this.logger.error('Error in login service', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  async refresh(refreshToken: string) {
    try {
      const secret = this.config.get<string>('JWT_REFRESH_SECRET');
      const payload: RefreshTokenPayload = this.jwtService.verify(
        refreshToken,
        { secret },
      );
      if (!payload) return { success: false, message: 'Invalid refresh token' };

      const sessionId = payload?.sessionId;
      if (!sessionId) return { success: false, message: 'Invalid payload' };

      const redisSession = await this.redisServices.get(`session:${sessionId}`);
      if (!redisSession) return { success: false, message: 'Session expired' };

      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date())
        return { success: false, message: 'Session expired or revoked' };

      if (session.user.status !== 'active')
        return { success: false, message: 'Inactive account' };

      const tokenValid = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash,
      );
      if (!tokenValid)
        return { success: false, message: 'Invalidated refresh token' };

      await this.revokeSession(sessionId);

      const newSessionId = createId();
      const { accessToken, refreshToken: newRefreshToken } =
        await this.generateTokens(
          session.user.id,
          session.user.email,
          session.user.role,
          newSessionId,
        );

      const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const added = await this.prisma.session.create({
        data: {
          id: newSessionId,
          userId: session.user.id,
          refreshTokenHash: newRefreshTokenHash,
          ipHash: session.ipHash,
          userAgent: session.userAgent,
          expiresAt,
        },
      });
      if (!added) return { success: false, message: 'Failed to add session' };
      await this.redisServices.set(`session:${newSessionId}`, session.user.id);
      return {
        success: true,
        data: { accessToken, refreshToken: newRefreshToken },
        message: 'Token refreshed',
      };
    } catch (error) {
      this.logger.error('Error in refresh service', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  async logout(sessionId: string, userId: string) {
    try {
      const response = await this.revokeSession(sessionId);
      if (!response)
        return { success: false, message: 'Failed to revoke session' };
      this.logger.log(`User logged out: userId=${userId}`);
      return { success: true, message: 'Revoked success' };
    } catch (error) {
      this.logger.error('Error in logout service', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  async getMe(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      if (!user) return { success: false, message: 'User not found' };

      const notificationCnt = await this.prisma.notification.count({
        where: { userId, isRead: false },
      });

      const respObj = {
        ...user,
        navigation: this.buildNavigation(user.role),
        permissions: this.buildPermissions(user.role),
        notificationCnt,
      };

      return { success: true, data: respObj, message: 'Fetched success' };
    } catch (error) {
      this.logger.error('Error in getMe service', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  async revokeAllUserSessions(userId: string) {
    try {
      const sessions = await this.prisma.session.findMany({
        where: { userId, revokedAt: null },
        select: { id: true },
      });
      if (!sessions || !Array.isArray(sessions))
        return { success: false, message: 'Failed to get sessions' };

      for (const session of sessions) {
        const resp = await this.revokeSession(session.id);
        if (!resp)
          return {
            success: false,
            message: 'Failed to revoke session :: ' + session.id,
          };
      }

      this.logger.log(`All sessions revoked for userId=${userId}`);
      return { success: true, message: 'Success on revoke all ' };
    } catch (error) {
      this.logger.error('Error in revoke session service', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  // Helpers
  private async generateTokens(
    userId: string,
    email: string,
    role: Role,
    sessionId: string,
  ) {
    const payload = { sub: userId, email, role, sessionId };

    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET'),
      refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET'),
      accessExpiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES', '15m'),
      refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES', '7d');

    // parallelism
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret as string,
        expiresIn: accessExpiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret as string,
        expiresIn: refreshExpiresIn as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async revokeSession(sessionId: string) {
    const key = `session:${sessionId}`;
    const removeFromRedis = await this.redisServices.del(key);
    if (!removeFromRedis) return false;

    const updateSession = await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return !!updateSession;
  }

  private buildNavigation(role: Role) {
    const base = [
      { label: 'Dashboard', href: '/app/dashboard', icon: 'LayoutDashboard' },
      { label: 'Projects', href: '/app/projects', icon: 'FolderKanban' },
      { label: 'My Tasks', href: '/app/my-tasks', icon: 'CheckSquare' },
      { label: 'Notifications', href: '/app/notifications', icon: 'Bell' },
      { label: 'Reports', href: '/app/reports', icon: 'FileBarChart' },
    ];

    const custom = {
      users: { label: 'Users', href: '/app/admin/users', icon: 'Users' },
      auditLog: {
        label: 'Audit Log',
        href: '/app/admin/audit',
        icon: 'ShieldCheck',
      },
    };

    if (role === Role.ADMIN) {
      base.push(custom.users);
      base.push(custom.auditLog);
    }

    if (role === Role.BM) base.push(custom.auditLog);

    return base;
  }

  private buildPermissions(role: Role): Record<string, boolean> {
    const permissions: Record<string, boolean> = {
      'time.log': true,
      'time.editOwn': true,
      'report.export': true,
    };

    const custom: Record<string, boolean> = {
      'task.create': true,
      'task.assign': true,
      'expected_hours.read': true,
      'project.create': true,
      'project.viewAll': true,
      'audit.read': true,
      'capacity.team': true,
    };
    if (role === Role.ADMIN)
      return {
        ...custom,
        'admin.users': true,
        'project.addMember': true,
        ...permissions,
      };

    if (role === Role.BM) return { ...custom, ...permissions };

    return permissions;
  }
}
