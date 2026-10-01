import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ResaSocialService } from '../application/resa-social.service';

@Controller('v1/resa')
export class ResaController {
  constructor(private readonly resa: ResaSocialService) {}

  private token(a?: string) {
    const t = a?.replace(/^Bearer\s+/i, '').trim();
    if (!t) throw new UnauthorizedException('Bearer token is required');
    return t;
  }

  @Get('content')
  content(@Headers('authorization') a: string | undefined, @Query('limit') limit?: string, @Query('before') before?: string) {
    return this.resa.listContent(this.token(a), Number(limit) || 30, before);
  }

  @Post('content')
  createContent(@Headers('authorization') a: string | undefined, @Body() b: any) {
    return this.resa.createContent(this.token(a), b);
  }

  @Get('content/:contentId/comments')
  comments(@Headers('authorization') a: string | undefined, @Param('contentId') id: string) {
    return this.resa.comments(this.token(a), id);
  }

  @Post('content/:contentId/comments')
  comment(@Headers('authorization') a: string | undefined, @Param('contentId') id: string, @Body() b: any) {
    return this.resa.comment(this.token(a), id, b);
  }

  @Post('content/:contentId/reactions')
  react(@Headers('authorization') a: string | undefined, @Param('contentId') id: string, @Body() b: { reaction_type: string }) {
    return this.resa.react(this.token(a), id, b.reaction_type);
  }

  @Delete('content/:contentId/reactions')
  removeReaction(@Headers('authorization') a: string | undefined, @Param('contentId') id: string) {
    return this.resa.removeReaction(this.token(a), id);
  }

  @Post('profiles/:userId/follow')
  follow(@Headers('authorization') a: string | undefined, @Param('userId') id: string) {
    return this.resa.follow(this.token(a), id);
  }

  @Delete('profiles/:userId/follow')
  unfollow(@Headers('authorization') a: string | undefined, @Param('userId') id: string) {
    return this.resa.unfollow(this.token(a), id);
  }

  @Get('profiles/:userId/following')
  follows(@Headers('authorization') a: string | undefined, @Param('userId') id: string) {
    return this.resa.follows(this.token(a), id);
  }

  @Post('content/:contentId/mentions')
  mention(@Headers('authorization') a: string | undefined, @Param('contentId') id: string, @Body() b: { mentioned_user_id: string }) {
    return this.resa.mention(this.token(a), id, b.mentioned_user_id);
  }

  @Post('topics')
  topic(@Headers('authorization') a: string | undefined, @Body() b: { name: string }) {
    return this.resa.topic(this.token(a), b.name);
  }

  @Post('content/:contentId/topics')
  attachTopic(@Headers('authorization') a: string | undefined, @Param('contentId') id: string, @Body() b: { topic_id: string }) {
    return this.resa.attachTopic(this.token(a), id, b.topic_id);
  }

  @Post('content/:contentId/save')
  save(@Headers('authorization') a: string | undefined, @Param('contentId') id: string) {
    return this.resa.save(this.token(a), id);
  }

  @Delete('content/:contentId/save')
  unsave(@Headers('authorization') a: string | undefined, @Param('contentId') id: string) {
    return this.resa.unsave(this.token(a), id);
  }

  @Post('content/:contentId/repost')
  repost(@Headers('authorization') a: string | undefined, @Param('contentId') id: string, @Body() b: { quote?: boolean; body?: string }) {
    return this.resa.repost(this.token(a), id, b.quote === true, b.body);
  }
}
