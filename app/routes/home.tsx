import { redirect } from "react-router";

const SEO_TITLE = "Lapse — Never pay for something you forgot you had.";
const SEO_DESCRIPTION =
  "Lapse finds subscriptions and free trials about to charge you and drafts the cancellation for you to send.";

export function meta() {
  return [
    { title: SEO_TITLE },
    { name: "description", content: SEO_DESCRIPTION },
    { property: "og:title", content: SEO_TITLE },
    { property: "og:description", content: SEO_DESCRIPTION },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: SEO_TITLE },
    { name: "twitter:description", content: SEO_DESCRIPTION },
  ];
}

export function clientLoader() {
  return redirect("/ledger");
}

export default function HomeRoute() {
  return null;
}
