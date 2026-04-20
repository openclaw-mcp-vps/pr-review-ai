export type PlanType = "repo" | "org";
export type SubscriptionStatus = "active" | "inactive" | "canceled";

export interface PullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
}

export interface PullRequestContext {
  owner: string;
  repo: string;
  repoFullName: string;
  pullNumber: number;
  title: string;
  body: string;
  author: string;
  headSha: string;
  files: PullRequestFile[];
  changedFiles: number;
}

export interface SubscriptionRecord {
  id: string;
  email: string;
  plan: PlanType;
  status: SubscriptionStatus;
  repoFullName?: string;
  orgName?: string;
  lemonOrderId?: string;
  lemonSubscriptionId?: string;
  renewsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessPayload {
  email: string;
  plan: PlanType;
  repoFullName?: string;
  iat: number;
  exp: number;
}
