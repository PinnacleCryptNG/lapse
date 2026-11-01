/** The auto-renew arrow, stopped by a coral bar: the renewal you caught. */
export function LapseMark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className="lp-mark" fill="none">
      <path d="M47.41 39.18A17 17 0 1 1 40.5 17.28" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M46.13 20.53L37.75 22.04L43.25 12.52Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path className="lp-mark__bar" d="M40.9 30.75L56.75 28.52" stroke="#FF5A6E" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function LapseLogo({ size = 20 }: { size?: number }) {
  return (
    <span className="lp-logo" style={{ fontSize: size }}>
      <LapseMark size={size * 1.3} />
      <span>Lapse</span>
    </span>
  );
}
