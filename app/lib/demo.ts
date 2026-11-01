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
