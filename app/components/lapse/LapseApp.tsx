import { sendToAgentChat } from "@agent-native/core/client/agent-chat";
import { useActionMutation, useActionQuery, useDbSync, writeClientAppState } from "@agent-native/core/client/hooks";
import { IconSparkles } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { TAB_ID } from "@/lib/tab-id";

import { AddScreen } from "./AddScreen";
import { DecideScreen } from "./DecideScreen";
import { DoneScreen } from "./DoneScreen";
import { LapseLogo } from "./Logo";
import { byUrgency, isCancelling, isKept, isOpen, type Screen, SCREENS, type Status, STATUS_WORD, type Sub } from "./format";

const LOCAL_MS = 6000;
const FLASH_MS = 4500;

/** Rows the agent changed (not this tab), so cards can show "Lapse just updated this". */
function useAgentChanges(rows: Sub[], ready: boolean, localEdits: React.MutableRefObject<Map<string, number>>) {
  const seen = useRef<Map<string, Sub> | null>(null);
  const [flashed, setFlashed] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!ready) return;
    const prev = seen.current;
    seen.current = new Map(rows.map((r) => [r.id, r]));
    if (!prev) return;
    const now = Date.now();
    const local = localEdits.current;
    if ((local.get("*") ?? 0) > now - LOCAL_MS) return;
    const changed = rows.filter((r) => {
      const p = prev.get(r.id);
      return p && p.updatedAt !== r.updatedAt && !((local.get(r.id) ?? 0) > now - LOCAL_MS);
    });
    if (!changed.length) return;
    for (const r of changed) {
      if (prev.get(r.id)?.status === r.status) continue;
      if (r.status === "cancel_drafted") toast(`Lapse wrote the cancel message for ${r.merchant}`);
      else if (r.decidedBy === "agent") toast(`Lapse moved ${r.merchant} to ${STATUS_WORD[r.status]}`);
    }
    setFlashed((f) => {
      const o = { ...f };
      for (const r of changed) o[r.id] = now;
      return o;
    });
    const t = setTimeout(
      () => setFlashed((f) => Object.fromEntries(Object.entries(f).filter(([, v]) => Date.now() - v < FLASH_MS))),
      FLASH_MS + 50,
    );
    return () => clearTimeout(t);
  }, [rows, ready, localEdits]);
  return useMemo(() => new Set(Object.keys(flashed)), [flashed]);
}

const STEPS: { id: Screen; label: string }[] = [
  { id: "add", label: "Add" },
  { id: "decide", label: "Decide" },
  { id: "done", label: "Save" },
];

export function LapseApp() {
  const queryClient = useQueryClient();
  useDbSync({
    queryClient,
    ignoreSource: TAB_ID,
    realtime: { reason: "agent and user decide on the same subscription cards" },
  });

  const [params, setParams] = useSearchParams();
  const localEdits = useRef(new Map<string, number>());
  const touch = (id: string) => localEdits.current.set(id, Date.now());

  const { data, isLoading } = useActionQuery("list-subscriptions", {});
  const rows = useMemo(() => ((data as any)?.rows ?? []) as Sub[], [data]);
  const ready = data !== undefined;
  const flashed = useAgentChanges(rows, ready, localEdits);

  const [skipped, setSkipped] = useState<string[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  useEffect(() => {
    setHidden((h) => {
      const still = [...h].filter((id) => rows.some((r) => r.id === id && isOpen(r)));
      return still.length === h.size ? h : new Set(still);
    });
  }, [rows]);

  const queue = useMemo(
    () => rows.filter((r) => isOpen(r) && !hidden.has(r.id)).sort((a, b) => byUrgency(a, b, skipped)),
    [rows, hidden, skipped],
  );
  const cancelling = rows.filter(isCancelling);
  const kept = rows.filter(isKept);
  const isSample = rows.some((r) => r.source === "sample");

  const asked = params.get("s") as Screen | null;
  const auto: Screen = rows.length === 0 ? "add" : queue.length ? "decide" : "done";
  const screen: Screen =
    asked && SCREENS.includes(asked) && (asked === "add" || rows.length > 0) ? asked : auto;
  const go = (s: Screen | null) =>
    setParams((p) => {
      if (s) p.set("s", s);
      else p.delete("s");
      return p;
    });

  const prevQueue = useRef(queue.length);
  useEffect(() => {
    if (ready && screen === "decide" && prevQueue.current > 0 && queue.length === 0) go("done");
    prevQueue.current = queue.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length, screen, ready]);

  const mark = useActionMutation("mark-status");
  const loadSample = useActionMutation("load-sample-data", {
    onSuccess: (r: any) => {
      toast.success(`Found ${r?.inserted + r?.updated} subscriptions in the sample.`);
      go(null);
    },
  });
  const startSample = () => {
    localEdits.current.set("*", Date.now());
    loadSample.mutate({} as any);
  };

  const demoStarted = useRef(false);
  useEffect(() => {
    if (params.get("demo") !== "1" || !ready || demoStarted.current) return;
    demoStarted.current = true;
    if (rows.length === 0) startSample();
    setParams(
      (p) => {
        p.delete("demo");
        return p;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, params]);

  const top = screen === "decide" ? queue[0] ?? null : null;
  useEffect(() => {
    void writeClientAppState(
      `selection:${TAB_ID}`,
      { subscriptionIds: top ? [top.id] : [], openId: top?.id ?? null, screen },
      { requestSource: TAB_ID },
    );
  }, [top?.id, screen]);

  const setStatus = async (row: Sub, status: Status) => {
    touch(row.id);
    try {
      await mark.mutateAsync({ id: row.id, status } as any);
    } catch (e: any) {
      setHidden((h) => {
        const n = new Set(h);
        n.delete(row.id);
        return n;
      });
      toast.error(e?.message ?? "Couldn't save that");
    }
  };

  const decide = (row: Sub, status: "keep" | "cancel") => {
    setHidden((h) => new Set(h).add(row.id));
    void setStatus(row, status);
    toast(status === "keep" ? `Keeping ${row.merchant}` : `${row.merchant} is on your cancel list`, {
      duration: 4000,
      action: {
        label: "Undo",
        onClick: () => {
          setHidden((h) => {
            const n = new Set(h);
            n.delete(row.id);
            return n;
          });
          void setStatus(row, "detected");
          go("decide");
        },
      },
    });
  };

  const reopen = (row: Sub) => {
    void setStatus(row, "detected");
    go("decide");
  };

  const ask = (message: string) => sendToAgentChat({ message, submit: true });

  return (
    <div className="lp">
      <div className="lp-col">
        <header className="lp-top">
          <a className="lp-brand" href="/" aria-label="Lapse home">
            <LapseLogo size={22} />
          </a>
          {rows.length > 0 && (
            <button
              type="button"
              className="lp-ask"
              onClick={() => ask("Go through my undecided subscriptions with me, one at a time, soonest charge first.")}
            >
              <IconSparkles size={16} stroke={1.8} /> Ask Lapse
            </button>
          )}
        </header>

        <nav className="lp-steps" aria-label="Steps">
          {STEPS.map((s, i) => {
            const enabled = s.id === "add" || rows.length > 0;
            const doneMark = s.id === "add" ? rows.length > 0 : s.id === "decide" ? rows.length > 0 && queue.length === 0 : false;
            return (
              <button
                key={s.id}
                type="button"
                disabled={!enabled}
                aria-current={screen === s.id ? "step" : undefined}
                className={`lp-step${screen === s.id ? " is-on" : ""}${doneMark ? " is-done" : ""}`}
                onClick={() => go(s.id)}
              >
                <span className="lp-step__n">{doneMark ? "✓" : i + 1}</span>
                <span className="lp-step__label">{s.label}</span>
                {s.id === "decide" && queue.length > 0 && <span className="lp-step__badge">{queue.length}</span>}
              </button>
            );
          })}
        </nav>

        {isLoading || !ready ? (
          <div className="lp-loading" aria-label="Loading" />
        ) : screen === "add" ? (
          <AddScreen
            hasRows={rows.length > 0}
            sampleBusy={loadSample.isPending}
            onSample={startSample}
            onBulk={() => localEdits.current.set("*", Date.now())}
            onAdded={() => go(null)}
          />
        ) : screen === "decide" ? (
          <DecideScreen
            queue={queue}
            total={rows.filter((r) => r.status !== "cancelled").length}
            flashed={flashed}
            onDecide={decide}
            onSkip={(r) => setSkipped((s) => [...s.filter((x) => x !== r.id), r.id])}
            onAsk={(r) => ask(`Help me decide on ${r.merchant} (subscription ${r.id}): keep or cancel?`)}
            onDone={() => go("done")}
          />
        ) : (
          <DoneScreen
            cancelling={cancelling}
            kept={kept}
            flashed={flashed}
            onStatus={(r, s) => void setStatus(r, s)}
            onReopen={reopen}
            onAdd={() => go("add")}
            onAsk={ask}
          />
        )}

        {isSample && screen !== "add" && <p className="lp-sample">Sample data – illustrative amounts</p>}
        <footer className="lp-foot">Lapse never sends or cancels anything for you. You stay in control.</footer>
      </div>
    </div>
  );
}
