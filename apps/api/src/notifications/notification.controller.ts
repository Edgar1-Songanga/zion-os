import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('v1/notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}
  private token(authorization?: string) { const token = authorization?.replace(/^Bearer\s+/i, '').trim(); if (!token) throw new UnauthorizedException('Bearer token is required'); return token; }
  @Get() list(@Headers('authorization') authorization: string | undefined, @Query('unread') unread?: string, @Query('limit') limit?: string) { return this.notifications.list(this.token(authorization), unread === 'true', Number(limit) || 50); }
  @Patch(':notificationId/read') read(@Headers('authorization') authorization: string | undefined, @Param('notificationId') id: string) { return this.notifications.markRead(this.token(authorization), id); }
  @Post('read-all') readAll(@Headers('authorization') authorization: string | undefined) { return this.notifications.markAllRead(this.token(authorization)); }
  @Get('preferences') preferences(@Headers('authorization') authorization: string | undefined) { return this.notifications.preferences(this.token(authorization)); }
  @Patch('preferences') updatePreferences(@Headers('authorization') authorization: string | undefined, @Body() body: any) { return this.notifications.updatePreferences(this.token(authorization), body); }
}
