import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { IdentityService } from "../identity/application/identity.service";
import { SupabaseRestClient } from "../common/supabase/supabase-rest.client";
import { SpiritualAiService } from "./spiritual-ai.service";

interface ChatBody {
  organizationId?: string;
  prompt?: string;
  conversationId?: string;
}

interface ActiveMembership {
  id: string;
  organization_id: string;
  role_id: string;
  roles?: { key?: string; name?: string } | Array<{ key?: string; name?: string }> | null;
}

@Controller("v1/ai")
export class AiController {
  constructor(
    private readonly identity: IdentityService,
    private readonly db: SupabaseRestClient,
    private readonly spiritualAi: SpiritualAiService,
  ) {}

  @Post("chat")
  async chat(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: ChatBody,
  ) {
    const accessToken = authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) throw new UnauthorizedException("Bearer token is required.");

    if (typeof body?.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 12000) {
      throw new BadRequestException("prompt must contain between 1 and 12000 characters.");
    }
    if (typeof body.organizationId !== "string" || !body.organizationId.trim() || body.organizationId.length > 128) {
      throw new BadRequestException("organizationId is required.");
    }
    if (body.conversationId !== undefined && (typeof body.conversationId !== "string" || body.conversationId.length > 128)) {
      throw new BadRequestException("conversationId is invalid.");
    }

    const user = await this.identity.getCurrentUser(accessToken);
    const memberships = await this.db.get<ActiveMembership[]>(
      "organization_memberships",
      accessToken,
      "?select=id,organization_id,role_id,roles(key,name)" +
        "&user_id=eq." + encodeURIComponent(user.id) +
        "&organization_id=eq." + encodeURIComponent(body.organizationId.trim()) +
        "&status=eq.ACTIVE&limit=1",
    );
    const membership = memberships[0];
    if (!membership) {
      throw new ForbiddenException("An active membership in the selected organization is required.");
    }

    const roleRelation = Array.isArray(membership.roles) ? membership.roles[0] : membership.roles;
    const role = roleRelation?.key?.trim();
    return this.spiritualAi.enhance({
      userId: user.id,
      tenantId: membership.organization_id,
      roles: role ? [role] : [],
      prompt: body.prompt.trim(),
      ...(body.conversationId ? { conversationId: body.conversationId } : {}),
    });
  }
}
