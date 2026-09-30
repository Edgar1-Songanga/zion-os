export type ZionProfileType = "personal" | "professional" | "pastor" | "ministry" | "organization" | "creator";
export type VerificationType = "professional" | "pastor" | "ministry" | "organization";
export type VerificationStatus = "pending" | "verified" | "rejected" | "expired";

export interface ZionProfile {
  id: string;
  userId: string;
  type: ZionProfileType;
  displayName: string;
  bio?: string;
  organizationIds: string[];
  skills: string[];
  active: boolean;
}

export interface ProfileVerification {
  id: string;
  profileId: string;
  type: VerificationType;
  status: VerificationStatus;
  evidenceRefs: string[];
  verifiedAt?: string;
  expiresAt?: string;
}

export class ProfileSystemService {
  validate(profile: Pick<ZionProfile, "userId" | "type" | "displayName">) {
    if (!profile.userId || !profile.displayName.trim()) throw new Error("Profile owner and display name are required.");
    return true;
  }
  canActivate(profile: ZionProfile) {
    return profile.active && Boolean(profile.userId && profile.displayName.trim());
  }
  requestVerification(input: Omit<ProfileVerification, "id" | "status">): ProfileVerification {
    return { ...input, id: crypto.randomUUID(), status: "pending" };
  }
}
