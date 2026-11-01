import { getSession, logout } from "@agent-native/core/server";
import { defineEventHandler, getRequestURL } from "h3";

// Opening sign-in while a throwaway demo session is active would let the
// framework's auth page bounce straight back into the demo. End the demo
// session first so the sign-in form stays on screen.
export default defineEventHandler(async (event) => {
  if (event.method !== "GET") return;
  const path = getRequestURL(event).pathname.replace(/\/+$/, "");
  if (!path.endsWith("/sign-in")) return;
  const session = await getSession(event).catch(() => null);
  if (!session?.email?.endsWith("@demo.lapse.app")) return;
  await logout(event).catch(() => {});
  delete (event.context as { __anSessionCache?: unknown }).__anSessionCache;
});
