export default {
  providers: [
    {
      // Clerk Frontend API URL. Set via `npx convex env set CLERK_JWT_ISSUER_DOMAIN`
      // on each deployment (dev and prod use different Clerk instances).
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      // Must match the name of the JWT template configured in Clerk.
      applicationID: "convex",
    },
  ],
};
