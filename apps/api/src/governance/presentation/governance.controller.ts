import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { GovernanceService } from '../application/governance.service';

@Controller('v1/governance')
export class GovernanceController {
 constructor(private readonly gov: GovernanceService){}
 private token(a?:string){const t=a?.replace(/^Bearer\s+/i,'').trim();if(!t)throw new UnauthorizedException('Bearer token is required');return t;}
 @Get('organizations/:organizationId/councils')
 councils(@Headers('authorization') a:string|undefined,@Param('organizationId') o:string){return this.gov.councils(this.token(a),o);}
 @Post('organizations/:organizationId/councils')
 createCouncil(@Headers('authorization')a:string|undefined,@Param('organizationId')o:string,@Body()b:any){return this.gov.createCouncil(this.token(a),o,b);}
 @Get('councils/:councilId/members')
 councilMembers(@Headers('authorization')a:string|undefined,@Param('councilId')c:string){return this.gov.councilMembers(this.token(a),c);}
 @Post('councils/:councilId/members')
 addCouncilMember(@Headers('authorization')a:string|undefined,@Param('councilId')c:string,@Body()b:{membership_id:string;member_role?:string;is_voting_member?:boolean}){return this.gov.addCouncilMember(this.token(a),c,b.membership_id,b);}
 @Get('councils/:councilId/meetings')
 meetings(@Headers('authorization')a:string|undefined,@Param('councilId')c:string){return this.gov.meetings(this.token(a),c);}
 @Post('councils/:councilId/meetings')
 createMeeting(@Headers('authorization')a:string|undefined,@Param('councilId')c:string,@Body()b:any){return this.gov.createMeeting(this.token(a),c,b);}
 @Get('meetings/:meetingId/agenda')
 agenda(@Headers('authorization')a:string|undefined,@Param('meetingId')m:string){return this.gov.agenda(this.token(a),m);}
 @Post('meetings/:meetingId/agenda')
 addAgenda(@Headers('authorization')a:string|undefined,@Param('meetingId')m:string,@Body()b:any){return this.gov.addAgenda(this.token(a),m,b);}
 @Get('meetings/:meetingId/motions')
 motions(@Headers('authorization')a:string|undefined,@Param('meetingId')m:string){return this.gov.motions(this.token(a),m);}
 @Post('meetings/:meetingId/motions')
 createMotion(@Headers('authorization')a:string|undefined,@Param('meetingId')m:string,@Body()b:any){return this.gov.createMotion(this.token(a),m,b);}
 @Post('motions/:motionId/votes')
 vote(@Headers('authorization')a:string|undefined,@Param('motionId')m:string,@Body()b:{council_member_id:string;choice:string}){return this.gov.vote(this.token(a),m,b.council_member_id,b.choice);}
 @Post('motions/:motionId/decision')
 decide(@Headers('authorization')a:string|undefined,@Param('motionId')m:string,@Body()b:{outcome:string}){return this.gov.decide(this.token(a),m,b.outcome);}
 @Get('meetings/:meetingId/minutes')
 minutes(@Headers('authorization')a:string|undefined,@Param('meetingId')m:string){return this.gov.minutes(this.token(a),m);}
 @Post('meetings/:meetingId/minutes')
 saveMinutes(@Headers('authorization')a:string|undefined,@Param('meetingId')m:string,@Body()b:{content:string;status?:string}){return this.gov.saveMinutes(this.token(a),m,b.content,b.status);}
}
