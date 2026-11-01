import { hueFor } from "./format";

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span className="lp-av" style={{ "--h": hueFor(name), width: size, height: size, fontSize: size * 0.42 } as React.CSSProperties} aria-hidden>
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
