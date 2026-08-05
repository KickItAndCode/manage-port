// TEMPORARY verification endpoint — deleted after confirming the Clerk->Convex chain.
import { query } from "./_generated/server";

export const whoami = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return {
      authenticated: identity !== null,
      subject: identity?.subject ?? null,
      issuer: identity?.issuer ?? null,
    };
  },
});
