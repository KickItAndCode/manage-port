import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";

/**
 * Authentication helpers.
 *
 * Every query/mutation that touches user data must derive the caller's identity
 * from the verified Clerk JWT via these helpers. Never accept `userId` as an
 * argument — Convex functions are public endpoints, so a client-supplied userId
 * is an assertion, not proof.
 */

// Minimal shape shared by QueryCtx, MutationCtx and ActionCtx.
type AuthCtx = { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } };
type DbCtx = AuthCtx & { db: { get: (id: any) => Promise<any> } };

/**
 * Returns the authenticated Clerk user ID (the JWT `sub` claim), or throws.
 *
 * For Clerk this is the same value as `useUser().user.id` on the client, which
 * is what existing rows are keyed by — so no data migration is required.
 */
export async function requireUser(ctx: AuthCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "You must be signed in to perform this action.",
    });
  }
  return identity.subject;
}

/**
 * Returns the authenticated Clerk user ID, or null when signed out.
 * Use for queries that should render empty rather than error during sign-in.
 */
export async function getUserOrNull(ctx: AuthCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

/**
 * Loads a document and asserts the caller owns it.
 * Works for any table carrying a `userId` column.
 */
export async function requireOwned<T extends { userId: string }>(
  ctx: DbCtx,
  id: Id<any>,
): Promise<T> {
  const userId = await requireUser(ctx);
  const doc = (await ctx.db.get(id)) as T | null;
  if (!doc) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Resource not found." });
  }
  if (doc.userId !== userId) {
    // Same error as NOT_FOUND so we don't leak which IDs exist.
    throw new ConvexError({ code: "NOT_FOUND", message: "Resource not found." });
  }
  return doc;
}

/**
 * Asserts the caller owns the given property.
 * Tables without their own `userId` (units, utilityCharges, leaseUtilitySettings,
 * utilityPayments) must reach ownership through the parent property or lease.
 */
export async function requirePropertyOwner(
  ctx: DbCtx,
  propertyId: Id<"properties">,
): Promise<string> {
  const property = await requireOwned<{ userId: string }>(ctx, propertyId);
  return property.userId;
}
