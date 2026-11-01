import { fail } from "@agent-native/core/action";
import { getRequestUserEmail } from "@agent-native/core/server";

/** Resolve the signed-in user's email for row scoping. Every Lapse query filters by it. */
export function requireOwner(ctx?: { userEmail?: string }): string {
  const email = ctx?.userEmail ?? getRequestUserEmail();
  if (!email) {
    throw fail("Sign in first: Lapse scopes every row to your account.", {
      errorCode: "unauthenticated",
      statusCode: 401,
    });
  }
  return email;
}
