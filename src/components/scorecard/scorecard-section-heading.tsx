export function ScorecardSectionHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--rw-muted)]">
      {children}
    </h3>
  );
}
