import { BadRequestException, Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from "@nestjs/common";
import { getSupabaseUser } from "../identity/infrastructure/supabase-auth.client";
import { SupabaseRestClient } from "../common/supabase/supabase-rest.client";

type ConversationRow = { id: string; user_id: string; title: string; created_at: string; updated_at: string };
type MessageRow = { id: string; conversation_id: string; user_id: string; role: "user" | "assistant"; content: string; payload: Record<string, unknown>; created_at: string };

@Controller("v1/spiritual/chat")
export class SpiritualChatController {
  constructor(private readonly db: SupabaseRestClient) {}

  private async actor(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new UnauthorizedException("Bearer token is required");
    const user = await getSupabaseUser(token);
    if (!user) throw new UnauthorizedException("Invalid or expired Supabase session");
    return { token, user };
  }

  @Get("conversations")
  async listConversations(@Headers("authorization") authorization?: string) {
    const { token, user } = await this.actor(authorization);
    const rows = await this.db.get<ConversationRow[]>(
      "spiritual_chat_conversations", token,
      "?user_id=eq." + encodeURIComponent(user.id) + "&order=updated_at.desc&limit=50",
    );
    return { items: rows };
  }

  @Post("conversations")
  async createConversation(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { title?: string },
  ) {
    const { token, user } = await this.actor(authorization);
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 160) : "";
    if (!title) throw new BadRequestException("Conversation title is required.");
    const rows = await this.db.post<ConversationRow[]>("spiritual_chat_conversations", token, {
      user_id: user.id, title,
    });
    return rows[0];
  }

  @Get("conversations/:id/messages")
  async listMessages(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ) {
    const { token, user } = await this.actor(authorization);
    const owned = await this.db.get<ConversationRow[]>(
      "spiritual_chat_conversations", token,
      "?id=eq." + encodeURIComponent(id) + "&user_id=eq." + encodeURIComponent(user.id) + "&limit=1",
    );
    if (!owned[0]) return { items: [] };
    const rows = await this.db.get<MessageRow[]>(
      "spiritual_chat_messages", token,
      "?conversation_id=eq." + encodeURIComponent(id) + "&user_id=eq." + encodeURIComponent(user.id) + "&order=created_at.asc&limit=500",
    );
    return { items: rows };
  }

  @Post("conversations/:id/messages")
  async appendExchange(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: { question?: string; answer?: string; payload?: Record<string, unknown> },
  ) {
    const { token, user } = await this.actor(authorization);
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
    if (!question || question.length > 20000 || !answer || answer.length > 20000) {
      throw new BadRequestException("A valid question and answer are required.");
    }
    const owned = await this.db.get<ConversationRow[]>(
      "spiritual_chat_conversations", token,
      "?id=eq." + encodeURIComponent(id) + "&user_id=eq." + encodeURIComponent(user.id) + "&limit=1",
    );
    if (!owned[0]) throw new UnauthorizedException("Conversation not found.");
    const rows = await this.db.post<MessageRow[]>("spiritual_chat_messages", token, [
      { conversation_id: id, user_id: user.id, role: "user", content: question, payload: {} },
      { conversation_id: id, user_id: user.id, role: "assistant", content: answer, payload: body.payload ?? {} },
    ]);
    await this.db.patch("spiritual_chat_conversations", token, { updated_at: new Date().toISOString() },
      "?id=eq." + encodeURIComponent(id) + "&user_id=eq." + encodeURIComponent(user.id));
    return { items: rows };
  }
}
