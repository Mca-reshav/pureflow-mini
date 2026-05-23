import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';
import { Public } from '../../decorators/public.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with credentials' })
  @ApiResponse({ status: 200, description: 'Returns access token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const ipHash = req.ip ?? 'unknown';
      const userAgent = req.headers['user-agent'];

      const loginResponse = await this.authService.login(
        dto,
        ipHash,
        userAgent,
      );

      if (!loginResponse || !loginResponse.success || !loginResponse.data)
        return {
          success: false,
          message: loginResponse?.message,
        };
      const { accessToken, refreshToken, user } = loginResponse.data;
      this.setRefreshCookie(res, refreshToken);
      const userObj = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
      return {
        success: true,
        data: {
          accessToken,
          user: userObj,
        },
        message: 'Logged-in success',
      };
    } catch (error) {
      this.logger.error('Error in login controller', error);
      return { success: false, message: 'Failed to login' };
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token' })
  @ApiResponse({ status: 200, description: 'Returns new access token' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const cookies = req.cookies as Record<string, string> | undefined;
      const refreshToken = cookies?.refresh_token;
      if (!refreshToken)
        return { success: false, message: 'Refresh token missing' };
      const response = await this.authService.refresh(refreshToken);

      if (!response || !response.success || !response.data)
        return {
          success: false,
          message: response.message || 'Failed to refresh',
        };
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      this.setRefreshCookie(res, newRefreshToken);

      return {
        success: true,
        message: 'Refreshed success',
        data: { accessToken },
      };
    } catch (error) {
      this.logger.error('Error in refresh controller', error);
      return { success: false, message: 'Failed to refresh' };
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke session' })
  @ApiBearerAuth('access-token')
  async logout(
    @CurrentUser() user: { sessionId: string; id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const response = await this.authService.logout(user.sessionId, user.id);
      if (!response || !response.success)
        return { success: false, message: response.message };
      res.clearCookie('refresh_token', { path: '/' });

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('Error in logout controller', error);
      return { success: false, message: 'Failed to logout' };
    }
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user info' })
  @ApiBearerAuth('access-token')
  @ApiResponse({
    status: 200,
    description: 'Returns user context',
  })
  async getMe(@CurrentUser() user: { id: string }) {
    try {
      const resp = await this.authService.getMe(user.id);
      if (!resp || !resp.success)
        return { success: false, message: resp.message };
      return { success: true, message: 'Fetched success', data: resp.data };
    } catch (error) {
      this.logger.error('Error in me controller', error);
      return { success: false, message: 'Failed to fetch user' };
    }
  }

  private setRefreshCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
