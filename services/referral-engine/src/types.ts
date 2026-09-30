export interface Referral {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  code: string;
  status: "pending" | "qualified" | "rejected";
  createdAt: string;
  qualifiedAt?: string;
}

export interface ReferralReward {
  referralId: string;
  recipientUserId: string;
  points: number;
  reason: "qualified_referral";
  createdAt: string;
}
