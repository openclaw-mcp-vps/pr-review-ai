import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool } from "pg";

export type SubscriptionPlan = "repo" | "org";
export type SubscriptionStatus = "active" | "inactive" | "cancelled" | "past_due";

export type UserRecord = {
  id: string;
  githubId: number;
  login: string;
  avatarUrl: string | null;
  accessToken: string;
  createdAt: string;
  updatedAt: string;
};

export type RepositoryRecord = {
  id: string;
  userId: string;
  owner: string;
  name: string;
  fullName: string;
  createdAt: string;
};

export type SubscriptionRecord = {
  id: string;
  scope: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  lemonSubscriptionId: string | null;
  lemonCustomerEmail: string | null;
  githubUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewRecord = {
  id: string;
  repoFullName: string;
  prNumber: number;
  commitSha: string;
  summary: string;
  findings: string;
  commentUrl: string | null;
  createdAt: string;
};

type JsonStore = {
  users: UserRecord[];
  repositories: RepositoryRecord[];
  subscriptions: SubscriptionRecord[];
  reviews: ReviewRecord[];
};

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
const JSON_STORE_PATH = path.join(process.cwd(), ".data", "db.json");

let schemaReady = false;
let jsonCache: JsonStore | null = null;

function nowIso() {
  return new Date().toISOString();
}

function mapUserRow(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    githubId: Number(row.github_id),
    login: String(row.login),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    accessToken: String(row.access_token),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapRepoRow(row: Record<string, unknown>): RepositoryRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    owner: String(row.owner),
    name: String(row.name),
    fullName: String(row.full_name),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapSubscriptionRow(row: Record<string, unknown>): SubscriptionRecord {
  return {
    id: String(row.id),
    scope: String(row.scope),
    plan: String(row.plan) as SubscriptionPlan,
    status: String(row.status) as SubscriptionStatus,
    lemonSubscriptionId: row.lemon_subscription_id ? String(row.lemon_subscription_id) : null,
    lemonCustomerEmail: row.lemon_customer_email ? String(row.lemon_customer_email) : null,
    githubUserId: row.github_user_id ? String(row.github_user_id) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapReviewRow(row: Record<string, unknown>): ReviewRecord {
  return {
    id: String(row.id),
    repoFullName: String(row.repo_full_name),
    prNumber: Number(row.pr_number),
    commitSha: String(row.commit_sha),
    summary: String(row.summary),
    findings: String(row.findings),
    commentUrl: row.comment_url ? String(row.comment_url) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

async function loadJsonStore(): Promise<JsonStore> {
  if (jsonCache) {
    return jsonCache;
  }

  try {
    const content = await fs.readFile(JSON_STORE_PATH, "utf8");
    jsonCache = JSON.parse(content) as JsonStore;
  } catch {
    await fs.mkdir(path.dirname(JSON_STORE_PATH), { recursive: true });
    jsonCache = {
      users: [],
      repositories: [],
      subscriptions: [],
      reviews: [],
    };
    await fs.writeFile(JSON_STORE_PATH, JSON.stringify(jsonCache, null, 2), "utf8");
  }

  return jsonCache;
}

async function saveJsonStore(store: JsonStore) {
  jsonCache = store;
  await fs.mkdir(path.dirname(JSON_STORE_PATH), { recursive: true });
  await fs.writeFile(JSON_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function ensureSchema() {
  if (!pool || schemaReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      github_id BIGINT NOT NULL UNIQUE,
      login TEXT NOT NULL,
      avatar_url TEXT,
      access_token TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS repositories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      full_name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      lemon_subscription_id TEXT,
      lemon_customer_email TEXT,
      github_user_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      repo_full_name TEXT NOT NULL,
      pr_number INT NOT NULL,
      commit_sha TEXT NOT NULL,
      summary TEXT NOT NULL,
      findings TEXT NOT NULL,
      comment_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_repo_created ON reviews(repo_full_name, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_scope_status ON subscriptions(scope, status);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(github_user_id, status);
  `);

  schemaReady = true;
}

export async function upsertUser(input: {
  githubId: number;
  login: string;
  avatarUrl?: string | null;
  accessToken: string;
}): Promise<UserRecord> {
  if (pool) {
    await ensureSchema();
    const id = randomUUID();
    const result = await pool.query(
      `
      INSERT INTO users (id, github_id, login, avatar_url, access_token, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (github_id)
      DO UPDATE SET
        login = EXCLUDED.login,
        avatar_url = EXCLUDED.avatar_url,
        access_token = EXCLUDED.access_token,
        updated_at = NOW()
      RETURNING *;
      `,
      [id, input.githubId, input.login, input.avatarUrl ?? null, input.accessToken],
    );

    return mapUserRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await loadJsonStore();
  const existing = store.users.find((user) => user.githubId === input.githubId);
  const timestamp = nowIso();

  if (existing) {
    existing.login = input.login;
    existing.avatarUrl = input.avatarUrl ?? null;
    existing.accessToken = input.accessToken;
    existing.updatedAt = timestamp;
    await saveJsonStore(store);
    return existing;
  }

  const record: UserRecord = {
    id: randomUUID(),
    githubId: input.githubId,
    login: input.login,
    avatarUrl: input.avatarUrl ?? null,
    accessToken: input.accessToken,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.users.push(record);
  await saveJsonStore(store);
  return record;
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  if (pool) {
    await ensureSchema();
    const result = await pool.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
    if ((result.rowCount ?? 0) === 0) {
      return null;
    }
    return mapUserRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await loadJsonStore();
  return store.users.find((user) => user.id === id) ?? null;
}

export async function getUserByGitHubId(githubId: number): Promise<UserRecord | null> {
  if (pool) {
    await ensureSchema();
    const result = await pool.query(`SELECT * FROM users WHERE github_id = $1 LIMIT 1`, [githubId]);
    if ((result.rowCount ?? 0) === 0) {
      return null;
    }

    return mapUserRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await loadJsonStore();
  return store.users.find((user) => user.githubId === githubId) ?? null;
}

export async function upsertRepository(input: {
  fullName: string;
  userId: string;
}): Promise<RepositoryRecord> {
  const [owner, name] = input.fullName.split("/");

  if (!owner || !name) {
    throw new Error("Repository full name must follow owner/repo format");
  }

  if (pool) {
    await ensureSchema();
    const id = randomUUID();
    const result = await pool.query(
      `
      INSERT INTO repositories (id, user_id, owner, name, full_name, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (full_name)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        owner = EXCLUDED.owner,
        name = EXCLUDED.name
      RETURNING *;
      `,
      [id, input.userId, owner, name, input.fullName],
    );

    return mapRepoRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await loadJsonStore();
  const existing = store.repositories.find((repo) => repo.fullName.toLowerCase() === input.fullName.toLowerCase());

  if (existing) {
    existing.userId = input.userId;
    existing.owner = owner;
    existing.name = name;
    existing.fullName = `${owner}/${name}`;
    await saveJsonStore(store);
    return existing;
  }

  const record: RepositoryRecord = {
    id: randomUUID(),
    userId: input.userId,
    owner,
    name,
    fullName: `${owner}/${name}`,
    createdAt: nowIso(),
  };

  store.repositories.push(record);
  await saveJsonStore(store);
  return record;
}

export async function getRepositoryByFullName(fullName: string): Promise<RepositoryRecord | null> {
  if (pool) {
    await ensureSchema();
    const result = await pool.query(`SELECT * FROM repositories WHERE full_name = $1 LIMIT 1`, [fullName]);
    if ((result.rowCount ?? 0) === 0) {
      return null;
    }

    return mapRepoRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await loadJsonStore();
  return store.repositories.find((repo) => repo.fullName.toLowerCase() === fullName.toLowerCase()) ?? null;
}

export async function listRepositoriesByUser(userId: string): Promise<RepositoryRecord[]> {
  if (pool) {
    await ensureSchema();
    const result = await pool.query(
      `SELECT * FROM repositories WHERE user_id = $1 ORDER BY created_at DESC, full_name ASC`,
      [userId],
    );
    return result.rows.map((row) => mapRepoRow(row as Record<string, unknown>));
  }

  const store = await loadJsonStore();
  return store.repositories
    .filter((repo) => repo.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function upsertSubscription(input: {
  scope: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  lemonSubscriptionId?: string | null;
  lemonCustomerEmail?: string | null;
  githubUserId?: string | null;
}): Promise<SubscriptionRecord> {
  if (pool) {
    await ensureSchema();
    const id = randomUUID();
    const result = await pool.query(
      `
      INSERT INTO subscriptions (
        id,
        scope,
        plan,
        status,
        lemon_subscription_id,
        lemon_customer_email,
        github_user_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (scope)
      DO UPDATE SET
        plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        lemon_subscription_id = EXCLUDED.lemon_subscription_id,
        lemon_customer_email = EXCLUDED.lemon_customer_email,
        github_user_id = EXCLUDED.github_user_id,
        updated_at = NOW()
      RETURNING *;
      `,
      [
        id,
        input.scope,
        input.plan,
        input.status,
        input.lemonSubscriptionId ?? null,
        input.lemonCustomerEmail ?? null,
        input.githubUserId ?? null,
      ],
    );

    return mapSubscriptionRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await loadJsonStore();
  const existing = store.subscriptions.find((sub) => sub.scope === input.scope);
  const timestamp = nowIso();

  if (existing) {
    existing.plan = input.plan;
    existing.status = input.status;
    existing.lemonSubscriptionId = input.lemonSubscriptionId ?? null;
    existing.lemonCustomerEmail = input.lemonCustomerEmail ?? null;
    existing.githubUserId = input.githubUserId ?? null;
    existing.updatedAt = timestamp;
    await saveJsonStore(store);
    return existing;
  }

  const record: SubscriptionRecord = {
    id: randomUUID(),
    scope: input.scope,
    plan: input.plan,
    status: input.status,
    lemonSubscriptionId: input.lemonSubscriptionId ?? null,
    lemonCustomerEmail: input.lemonCustomerEmail ?? null,
    githubUserId: input.githubUserId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.subscriptions.push(record);
  await saveJsonStore(store);
  return record;
}

export async function getSubscriptionByScope(scope: string): Promise<SubscriptionRecord | null> {
  if (pool) {
    await ensureSchema();
    const result = await pool.query(`SELECT * FROM subscriptions WHERE scope = $1 LIMIT 1`, [scope]);
    if ((result.rowCount ?? 0) === 0) {
      return null;
    }

    return mapSubscriptionRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await loadJsonStore();
  return store.subscriptions.find((sub) => sub.scope === scope) ?? null;
}

export async function hasActiveSubscriptionForUser(userId: string): Promise<boolean> {
  if (pool) {
    await ensureSchema();
    const result = await pool.query(
      `
      SELECT 1
      FROM subscriptions
      WHERE github_user_id = $1 AND status = 'active'
      LIMIT 1
      `,
      [userId],
    );

    return (result.rowCount ?? 0) > 0;
  }

  const store = await loadJsonStore();
  return store.subscriptions.some((sub) => sub.githubUserId === userId && sub.status === "active");
}

export async function listActiveScopesForUser(userId: string): Promise<string[]> {
  if (pool) {
    await ensureSchema();
    const result = await pool.query(
      `
      SELECT scope
      FROM subscriptions
      WHERE github_user_id = $1 AND status = 'active'
      ORDER BY scope ASC
      `,
      [userId],
    );

    return result.rows.map((row) => String((row as Record<string, unknown>).scope));
  }

  const store = await loadJsonStore();
  return store.subscriptions
    .filter((sub) => sub.githubUserId === userId && sub.status === "active")
    .map((sub) => sub.scope)
    .sort((a, b) => a.localeCompare(b));
}

export async function canUserAccessRepo(userId: string, repoFullName: string): Promise<boolean> {
  const [owner] = repoFullName.split("/");
  const orgScope = owner ? `org:${owner}` : null;

  if (pool) {
    await ensureSchema();
    const result = await pool.query(
      `
      SELECT 1
      FROM subscriptions
      WHERE github_user_id = $1
        AND status = 'active'
        AND (scope = $2 OR scope = $3)
      LIMIT 1
      `,
      [userId, repoFullName, orgScope],
    );

    return (result.rowCount ?? 0) > 0;
  }

  const store = await loadJsonStore();
  return store.subscriptions.some(
    (sub) =>
      sub.githubUserId === userId &&
      sub.status === "active" &&
      (sub.scope === repoFullName || (orgScope ? sub.scope === orgScope : false)),
  );
}

export async function isRepoSubscriptionActive(repoFullName: string): Promise<boolean> {
  const [owner] = repoFullName.split("/");
  const orgScope = owner ? `org:${owner}` : null;

  if (pool) {
    await ensureSchema();
    const result = await pool.query(
      `
      SELECT 1
      FROM subscriptions
      WHERE status = 'active'
        AND (scope = $1 OR scope = $2)
      LIMIT 1
      `,
      [repoFullName, orgScope],
    );

    return (result.rowCount ?? 0) > 0;
  }

  const store = await loadJsonStore();
  return store.subscriptions.some(
    (sub) => sub.status === "active" && (sub.scope === repoFullName || (orgScope ? sub.scope === orgScope : false)),
  );
}

export async function insertReview(input: {
  repoFullName: string;
  prNumber: number;
  commitSha: string;
  summary: string;
  findings: string;
  commentUrl?: string | null;
}): Promise<ReviewRecord> {
  if (pool) {
    await ensureSchema();
    const result = await pool.query(
      `
      INSERT INTO reviews (id, repo_full_name, pr_number, commit_sha, summary, findings, comment_url, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *;
      `,
      [
        randomUUID(),
        input.repoFullName,
        input.prNumber,
        input.commitSha,
        input.summary,
        input.findings,
        input.commentUrl ?? null,
      ],
    );

    return mapReviewRow(result.rows[0] as Record<string, unknown>);
  }

  const store = await loadJsonStore();
  const record: ReviewRecord = {
    id: randomUUID(),
    repoFullName: input.repoFullName,
    prNumber: input.prNumber,
    commitSha: input.commitSha,
    summary: input.summary,
    findings: input.findings,
    commentUrl: input.commentUrl ?? null,
    createdAt: nowIso(),
  };

  store.reviews.push(record);
  await saveJsonStore(store);
  return record;
}

export async function listRecentReviewsForUser(userId: string, limit = 15): Promise<ReviewRecord[]> {
  if (pool) {
    await ensureSchema();
    const result = await pool.query(
      `
      SELECT rv.*
      FROM reviews rv
      JOIN repositories repo ON repo.full_name = rv.repo_full_name
      WHERE repo.user_id = $1
      ORDER BY rv.created_at DESC
      LIMIT $2
      `,
      [userId, limit],
    );

    return result.rows.map((row) => mapReviewRow(row as Record<string, unknown>));
  }

  const store = await loadJsonStore();
  const repos = new Set(store.repositories.filter((repo) => repo.userId === userId).map((repo) => repo.fullName));

  return store.reviews
    .filter((review) => repos.has(review.repoFullName))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}

export async function getWebhookRepoContext(repoFullName: string): Promise<{
  owner: string;
  name: string;
  accessToken: string | null;
  subscriptionActive: boolean;
} | null> {
  const repo = await getRepositoryByFullName(repoFullName);

  if (!repo) {
    return null;
  }

  const subscriptionActive = await isRepoSubscriptionActive(repoFullName);

  const user = await getUserById(repo.userId);
  const token = user?.accessToken ?? process.env.GITHUB_TOKEN ?? null;

  return {
    owner: repo.owner,
    name: repo.name,
    accessToken: token,
    subscriptionActive,
  };
}
