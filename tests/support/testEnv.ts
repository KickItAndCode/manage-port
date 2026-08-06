import fs from "fs";
import path from "path";

/**
 * Shared setup for tests that talk to the real Convex deployment as a real
 * Clerk user.
 *
 * Authentication goes through Clerk's sign-in-token API rather than driving the
 * sign-in form. Minting a token is one HTTP call and yields a session directly,
 * where the form flow depends on Clerk's markup, needs a password in the
 * environment, and was the slowest and least reliable part of the old suite.
 */

const ROOT = path.resolve(__dirname, "../..");

function readEnvFiles(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of [".env", ".env.local", ".env.test"]) {
    let raw: string;
    try {
      raw = fs.readFileSync(path.join(ROOT, file), "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const i = trimmed.indexOf("=");
      const key = trimmed.slice(0, i).trim();
      const value = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (value) out[key] = value;
    }
  }
  return { ...out, ...process.env } as Record<string, string>;
}

export const env = readEnvFiles();

export const CLERK_SECRET_KEY = env.CLERK_SECRET_KEY;
export const CONVEX_URL = env.NEXT_PUBLIC_CONVEX_URL;

/** True when the environment can reach Clerk and Convex. */
export function hasIntegrationCredentials(): boolean {
  return Boolean(CLERK_SECRET_KEY && CONVEX_URL);
}

async function clerkApi(pathname: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.clerk.com/v1${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Clerk ${pathname} -> ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body;
}

/** Lists users so tests can pick real accounts without hardcoding ids. */
export async function listUsers(limit = 20): Promise<
  Array<{ id: string; email: string }>
> {
  const users = await clerkApi(`/users?limit=${limit}`);
  return (users as any[]).map((u) => ({
    id: u.id,
    email: u.email_addresses?.[0]?.email_address ?? "",
  }));
}

const openedSessions: string[] = [];

/** Mints a Convex-audience JWT for a user, via a short-lived Clerk session. */
export async function mintJwt(userId: string): Promise<string> {
  const session = await clerkApi("/sessions", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
  openedSessions.push(session.id);
  const { jwt } = await clerkApi(`/sessions/${session.id}/tokens/convex`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return jwt;
}

/**
 * Mints a single-use sign-in ticket. Appended to /sign-in as a query
 * parameter it authenticates a browser with no password involved.
 * Note it must be a query parameter — in the URL fragment Clerk never sees it.
 */
export async function mintSignInTicket(userId: string): Promise<string> {
  const token = await clerkApi("/sign_in_tokens", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 1800 }),
  });
  return token.token;
}

/** Revokes every session these tests opened. Call from global teardown. */
export async function revokeOpenedSessions(): Promise<void> {
  await Promise.all(
    openedSessions.splice(0).map((id) =>
      clerkApi(`/sessions/${id}/revoke`, { method: "POST" }).catch(() => undefined)
    )
  );
}
