import { LedgerPage } from "@/components/ledger/LedgerPage";

export function meta() {
  return [
    { title: "Lapse — Never pay for something you forgot you had." },
    {
      name: "description",
      content: "Lapse finds subscriptions and free trials about to charge you and drafts the cancellation for you to send.",
    },
  ];
}

export default function LedgerRoute() {
  return <LedgerPage />;
}
