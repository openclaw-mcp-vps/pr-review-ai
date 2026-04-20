import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { PlanType, SubscriptionRecord, SubscriptionStatus } from "@/lib/types";

interface WebhookDelivery {
  id: string;
  source: "github" | "lemonsqueezy";
  receivedAt: string;
}

interface StoreData {
  subscriptions: SubscriptionRecord[];
  webhookDeliveries: WebhookDelivery[];
}

const STORE_PATH = path.join(process.cwd(), "data", "subscriptions.json");
let queue: Promise<void> = Promise.resolve();

const EMPTY_STORE: StoreData = {
  subscriptions: [],
  webhookDeliveries: []
};

async function ensureStore(): Promise<void> {
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
  }
}

async function readStore(): Promise<StoreData> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as StoreData;
    return {
      subscriptions: parsed.subscriptions ?? [],
      webhookDeliveries: parsed.webhookDeliveries ?? []
    };
  } catch {
    return EMPTY_STORE;
  }
}

async function writeStore(data: StoreData): Promise<void> {
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function withStore<T>(operation: (data: StoreData) => Promise<T> | T): Promise<T> {
  let result!: T;
  queue = queue.then(async () => {
    const data = await readStore();
    result = await operation(data);
    await writeStore(data);
  });
  await queue;
  return result;
}

export async function markWebhookDelivery(
  source: WebhookDelivery["source"],
  id: string
): Promise<boolean> {
  return withStore<boolean>((data) => {
    const existing = data.webhookDeliveries.find((delivery) => {
      return delivery.source === source && delivery.id === id;
    });

    if (existing) {
      return false;
    }

    data.webhookDeliveries.push({
      id,
      source,
      receivedAt: new Date().toISOString()
    });

    if (data.webhookDeliveries.length > 5000) {
      data.webhookDeliveries = data.webhookDeliveries.slice(-2000);
    }

    return true;
  });
}

export async function upsertSubscription(input: {
  email: string;
  plan: PlanType;
  status: SubscriptionStatus;
  lemonOrderId?: string;
  lemonSubscriptionId?: string;
  repoFullName?: string;
  orgName?: string;
  renewsAt?: string;
}): Promise<SubscriptionRecord> {
  return withStore<SubscriptionRecord>((data) => {
    const now = new Date().toISOString();
    const existing = data.subscriptions.find((record) => {
      if (input.lemonSubscriptionId && record.lemonSubscriptionId === input.lemonSubscriptionId) {
        return true;
      }

      if (input.lemonOrderId && record.lemonOrderId === input.lemonOrderId) {
        return true;
      }

      return (
        record.email.toLowerCase() === input.email.toLowerCase() &&
        record.plan === input.plan &&
        (record.repoFullName ?? "") === (input.repoFullName ?? "")
      );
    });

    if (existing) {
      existing.status = input.status;
      existing.updatedAt = now;
      existing.repoFullName = input.repoFullName ?? existing.repoFullName;
      existing.orgName = input.orgName ?? existing.orgName;
      existing.lemonOrderId = input.lemonOrderId ?? existing.lemonOrderId;
      existing.lemonSubscriptionId = input.lemonSubscriptionId ?? existing.lemonSubscriptionId;
      existing.renewsAt = input.renewsAt ?? existing.renewsAt;
      return existing;
    }

    const created: SubscriptionRecord = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      plan: input.plan,
      status: input.status,
      repoFullName: input.repoFullName,
      orgName: input.orgName,
      lemonOrderId: input.lemonOrderId,
      lemonSubscriptionId: input.lemonSubscriptionId,
      renewsAt: input.renewsAt,
      createdAt: now,
      updatedAt: now
    };

    data.subscriptions.push(created);
    return created;
  });
}

export async function assignRepoToSubscription(email: string, repoFullName: string): Promise<void> {
  await withStore<void>((data) => {
    const candidate = data.subscriptions
      .filter((record) => record.email.toLowerCase() === email.toLowerCase())
      .find((record) => record.plan === "repo" && record.status === "active");

    if (candidate) {
      candidate.repoFullName = repoFullName;
      candidate.updatedAt = new Date().toISOString();
    }
  });
}

export async function findActiveSubscriptionForRepo(
  repoFullName: string
): Promise<SubscriptionRecord | undefined> {
  const data = await readStore();
  return data.subscriptions.find((record) => {
    return record.status === "active" && record.repoFullName?.toLowerCase() === repoFullName.toLowerCase();
  });
}

export async function findActiveSubscriptionForEmail(
  email: string
): Promise<SubscriptionRecord | undefined> {
  const data = await readStore();
  return data.subscriptions.find((record) => {
    return record.status === "active" && record.email.toLowerCase() === email.toLowerCase();
  });
}

export async function listActiveSubscriptionsForEmail(email: string): Promise<SubscriptionRecord[]> {
  const data = await readStore();
  return data.subscriptions.filter((record) => {
    return record.status === "active" && record.email.toLowerCase() === email.toLowerCase();
  });
}
