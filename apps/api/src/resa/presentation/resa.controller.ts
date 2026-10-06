import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ResaSocialService } from '../application/resa-social.service';

@Controller('v1/resa')
export class ResaController {
  constructor(private readonly resa: ResaSocialService) {}
  private token(a?: string) { const t = a?.replace(/^Bearer\s+/i, '').trim(); if (!t) throw new UnauthorizedException('Bearer token is required'); return t; }
  @Get('content') content(@Headers('authorization') a: string | undefined, @Query('limit') limit?: string, @Query('before') before?: string) { return this.resa.listContent(this.token(a), Number(limit) || 30, before); }
  @Get('feed') feed(@Headers('authorization') a: string | undefined, @Query('limit') limit?: string) { return this.resa.feed(this.token(a), Number(limit) || 30); }
  @Get('explore') explore(@Headers('authorization') a: string | undefined, @Query('q') query?: string, @Query('limit') limit?: string) { return this.resa.explore(this.token(a), query, Number(limit) || 30); }
  @Get('stories') stories(@Headers('authorization') a: string | undefined, @Query('limit') limit?: string) { return this.resa.stories(this.token(a), Number(limit) || 30); }
  @Post('content') createContent(@Headers('authorization') a: string | undefined, @Body() b: any) { return this.resa.createContent(this.token(a), b); }
  @Get('content/:contentId/comments') comments(@Headers('authorization') a: string | undefined, @Param('contentId') id: string) { return this.resa.comments(this.token(a), id); }
  @Post('content/:contentId/comments') comment(@Headers('authorization') a: string | undefined, @Param('contentId') id: string, @Body() b: any) { return this.resa.comment(this.token(a), id, b); }
  @Post('content/:contentId/reactions') react(@Headers('authorization') a: string | undefined, @Param('contentId') id: string, @Body() b: { reaction_type: string }) { return this.resa.react(this.token(a), id, b.reaction_type); }
  @Delete('content/:contentId/reactions') removeReaction(@Headers('authorization') a: string | undefined, @Param('contentId') id: string) { return this.resa.removeReaction(this.token(a), id); }
  @Post('profiles/:userId/follow') follow(@Headers('authorization') a: string | undefined, @Param('userId') id: string) { return this.resa.follow(this.token(a), id); }
  @Delete('profiles/:userId/follow') unfollow(@Headers('authorization') a: string | undefined, @Param('userId') id: string) { return this.resa.unfollow(this.token(a), id); }
  @Get('profiles/:userId/following') follows(@Headers('authorization') a: string | undefined, @Param('userId') id: string) { return this.resa.follows(this.token(a), id); }
  @Get('profiles/:userId/social') social(@Headers('authorization') a: string | undefined, @Param('userId') id: string) { return this.resa.social(this.token(a), id); }
  @Get('profiles/suggestions') suggestions(@Headers('authorization') a: string | undefined, @Query('limit') limit?: string) { return this.resa.suggestions(this.token(a), Number(limit) || 12); }
  @Post('content/:contentId/mentions') mention(@Headers('authorization') a: string | undefined, @Param('contentId') id: string, @Body() b: { mentioned_user_id: string }) { return this.resa.mention(this.token(a), id, b.mentioned_user_id); }
  @Post('topics') topic(@Headers('authorization') a: string | undefined, @Body() b: { name: string }) { return this.resa.topic(this.token(a), b.name); }
  @Post('content/:contentId/topics') attachTopic(@Headers('authorization') a: string | undefined, @Param('contentId') id: string, @Body() b: { topic_id: string }) { return this.resa.attachTopic(this.token(a), id, b.topic_id); }
  @Post('content/:contentId/save') save(@Headers('authorization') a: string | undefined, @Param('contentId') id: string) { return this.resa.save(this.token(a), id); }
  @Delete('content/:contentId/save') unsave(@Headers('authorization') a: string | undefined, @Param('contentId') id: string) { return this.resa.unsave(this.token(a), id); }
  @Post('content/:contentId/repost') repost(@Headers('authorization') a: string | undefined, @Param('contentId') id: string, @Body() b: { quote?: boolean; body?: string }) { return this.resa.repost(this.token(a), id, b.quote === true, b.body); }
  @Post('content/:contentId/feedback') feedback(@Headers('authorization') a: string | undefined, @Param('contentId') id: string, @Body() b: { feedback: string }) { return this.resa.feedback(this.token(a), id, b.feedback); }
  @Post('creator/schedules') schedule(@Headers('authorization') a: string | undefined, @Body() b: { content_id: string; scheduled_for: string }) { return this.resa.schedule(this.token(a), b.content_id, b.scheduled_for); }
  @Get('creator/schedules') schedules(@Headers('authorization') a: string | undefined, @Query('limit') limit?: string) { return this.resa.schedules(this.token(a), Number(limit) || 50); }
  @Delete('creator/schedules/:scheduleId') cancelSchedule(@Headers('authorization') a: string | undefined, @Param('scheduleId') id: string) { return this.resa.cancelSchedule(this.token(a), id); }
}
