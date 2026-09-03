export type ContentType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "TESTIMONY"
  | "PRAYER_REQUEST"
  | "BIBLE_VERSE"
  | "LIVE"
  | "MEETING"
  | "EVENT"
  | "ANNOUNCEMENT";


export type ReactionType =
  | "LIKE"
  | "AMEN"
  | "PRAY"
  | "LOVE"
  | "SUPPORT";


export interface UserReference {

  id: string;

  name: string;

  avatar?: string;

  verified?: boolean;

}


export interface ResaPost {

  id: string;

  author: UserReference;

  type: ContentType;

  title?: string;

  content: string;

  mediaUrl?: string;

  createdAt: Date;


  reactions: Reaction[];

  comments: Comment[];

}


export interface Comment {

  id: string;

  author: UserReference;

  content: string;

  createdAt: Date;

  replies?: Comment[];

}


export interface Reaction {

  id: string;

  user: UserReference;

  type: ReactionType;

  createdAt: Date;

}


export interface PrayerRequest {

  id: string;

  author: UserReference;

  title: string;

  description: string;

  prayerCount: number;

  createdAt: Date;

}


export interface ZionEvent {

  id: string;

  title: string;

  description: string;

  organizer: UserReference;

  date: Date;

  location?: string;

  online: boolean;

  participants: UserReference[];

}


export interface MeetingRoom {

  id: string;

  title: string;

  host: UserReference;

  type:
  | "PRAYER"
  | "BIBLE_STUDY"
  | "COMMUNITY"
  | "DEPARTMENT";


  privacy:
  | "PUBLIC"
  | "PRIVATE"
  | "INVITE_ONLY";


  participants: UserReference[];

  createdAt: Date;

}


export interface LiveSession {

  id: string;

  title: string;

  host: UserReference;

  viewers: number;

  isLive: boolean;

  startedAt: Date;

}


export interface Message {

  id: string;

  sender: UserReference;

  receiver?: UserReference;

  conversationId: string;

  content: string;

  createdAt: Date;

}
