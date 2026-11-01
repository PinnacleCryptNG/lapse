import { createH3SSRHandler } from "@agent-native/core/server/ssr-handler";
import { defineEventHandler } from "h3";

const ssr = createH3SSRHandler(() => import("virtual:react-router/server-build"));
const AUTH_REDIRECT = /<script data-agent-native-auth-redirect>[\s\S]*?<\/script>/g;

// `/` is Lapse's public landing page for everyone, signed in or not, so drop the
// framework script that bounces signed-in visitors to the app home.
export default defineEventHandler(async (event) => {
  const res = (await ssr(event as any)) as unknown;
  if (!(res instanceof Response) || !res.headers.get("content-type")?.includes("text/html")) return res as any;
  const html = (await res.text()).replace(AUTH_REDIRECT, "");
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  return new Response(html, { status: res.status, statusText: res.statusText, headers });
});
