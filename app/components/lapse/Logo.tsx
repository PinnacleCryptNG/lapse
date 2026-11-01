export function LapseMark({ size = 26, spin = false }: { size?: number; spin?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={spin ? "lp-mark lp-mark--spin" : "lp-mark"} fill="none">
      <circle cx="32" cy="32" r="18" stroke="#FFD23F" strokeWidth="8" strokeLinecap="round" strokeDasharray="86 27.1" transform="rotate(-6 32 32)" />
      <circle className="lp-mark__dot" cx="44.73" cy="19.27" r="6" fill="#FF4D6D" />
    </svg>
  );
}

export function LapseLogo({ size = 26 }: { size?: number }) {
  return (
    <span className="lp-logo" style={{ fontSize: size }}>
      <LapseMark size={size * 1.05} />
      <span>Lapse</span>
    </span>
  );
}
