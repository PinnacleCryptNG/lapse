import { appPath } from "@agent-native/core/client/api-path";

/** Creates a private throwaway account through the framework's own auth endpoints, then opens the sample. */
export async function startDemo(): Promise<void> {
  const rand = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}${Math.random()}`).replace(/[^a-z0-9]/gi, "");
  const id = rand().slice(0, 12).toLowerCase();
  const cred = { email: `demo-${id}@demo.lapse.app`, password: `Lapse-demo-${rand()}` };
  for (const path of ["/_agent-native/auth/register", "/_agent-native/auth/login"]) {
    const r = await fetch(appPath(path), {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cred),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error((j as { error?: string }).error ?? `HTTP ${r.status}`);
    }
  }
  window.location.assign(appPath("/ledger?demo=1"));
}

export const isDemoEmail = (email?: string | null) => !!email && email.endsWith("@demo.lapse.app");

export type Visitor = "guest" | "demo" | "member";

/** Who is looking at the public landing page: nobody, a throwaway demo account, or a real member. */
export async function whoIsVisiting(): Promise<Visitor> {
  try {
    const r = await fetch(appPath("/_agent-native/auth/session"), { credentials: "same-origin", cache: "no-store" });
    const s = (await r.json()) as { email?: string };
    if (!r.ok || !s.email) return "guest";
    return isDemoEmail(s.email) ? "demo" : "member";
  } catch {
    return "guest";
  }
}

/** Ends the demo session so "Sign in" shows the real sign-in form instead of the demo list. */
export async function leaveDemoAndSignIn(): Promise<void> {
  await fetch(appPath("/_agent-native/auth/logout"), { method: "POST", credentials: "same-origin" }).catch(() => {});
  window.location.assign(appPath("/ledger"));
}
