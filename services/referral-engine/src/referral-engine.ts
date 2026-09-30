import type { Referral, ReferralReward } from "./types";

export class ReferralEngine {
  createCode(userId: string, entropy = crypto.randomUUID()): string {
    const compact = entropy.replaceAll("-", "").slice(0, 10).toUpperCase();
    return `ZION-${compact}-${userId.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
  }

  createReferral(referrerUserId: string, referredUserId: string, code: string): Referral {
    if (referrerUserId === referredUserId) throw new Error("A user cannot refer themselves.");
    return {
      id: crypto.randomUUID(),
      referrerUserId,
      referredUserId,
      code,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }

  qualify(referral: Referral, rewardPoints = 50): { referral: Referral; reward: ReferralReward } {
    if (referral.status !== "pending") throw new Error("Only pending referrals can be qualified.");
    const qualifiedAt = new Date().toISOString();
    const updated = { ...referral, status: "qualified" as const, qualifiedAt };
    return {
      referral: updated,
      reward: {
        referralId: referral.id,
        recipientUserId: referral.referrerUserId,
        points: rewardPoints,
        reason: "qualified_referral",
        createdAt: qualifiedAt,
      },
    };
  }

  reject(referral: Referral): Referral {
    if (referral.status !== "pending") throw new Error("Only pending referrals can be rejected.");
    return { ...referral, status: "rejected" };
  }
}
