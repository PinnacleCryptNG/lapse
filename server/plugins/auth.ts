import type { AuthPageProps } from "@agent-native/core/shared/auth-page-types";
import { createToolkitAuthPlugin, renderAuthPage } from "@agent-native/toolkit/app/auth/server";

import { brandScript } from "../lib/auth-brand";

export default createToolkitAuthPlugin({
  workspaceAppPublicPaths: ["/"],
  rootAuth: false,
  marketing: false,
  renderSignInPage: (props: AuthPageProps) =>
    renderAuthPage(props).replace(/\/icon-180\.svg/g, "/apple-touch-icon.png?v=3") + brandScript(props.appBasePath ?? ""),
});
