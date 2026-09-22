import { cn } from "@/lib/utils/cn";

export interface ScorecardStatRow {
  key: string;
  name: string;
  cells: string[];
  sub?: string | null;
}

export interface ScorecardStatFooterRow {
  key: string;
  label: string;
  detail: string;
  emphasizeDetail?: boolean;
}

interface ScorecardStatTableProps {
  headers: string[];
  rows: ScorecardStatRow[];
  nameHeader?: string;
  emptyMessage?: string;
  desktopGridTemplate?: string;
  footerRows?: ScorecardStatFooterRow[];
}

/** Responsive batting/bowling table: cards on mobile, grid table from sm+. */
export function ScorecardStatTable({
  headers,
  rows,
  nameHeader = "Player",
  emptyMessage = "No data yet.",
  desktopGridTemplate,
  footerRows,
}: ScorecardStatTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--rw-muted)]">{emptyMessage}</p>
    );
  }

  const numericHeaders = headers.slice(1);
  const gridCols =
    desktopGridTemplate ??
    `minmax(0,1.8fr) repeat(${numericHeaders.length}, minmax(2rem,1fr))`;

  return (
    <>
      <ul className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <li
            key={row.key}
            className="rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface)] px-3 py-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--rw-muted)]">
              {nameHeader}
            </p>
            <p className="mt-0.5 break-words text-base font-semibold leading-snug">
              {row.name}
            </p>
            <p className="mt-2 text-sm tabular-nums text-[var(--rw-text)]">
              {numericHeaders.map((h, i) => (
                <span key={h}>
                  {i > 0 ? " · " : ""}
                  <span className="text-[var(--rw-muted)]">{h} </span>
                  {row.cells[i + 1]}
                </span>
              ))}
            </p>
            {row.sub ? (
              <p className="mt-1.5 text-xs text-[var(--rw-muted)]">{row.sub}</p>
            ) : null}
          </li>
        ))}
        {footerRows?.map((footer) => (
          <li
            key={footer.key}
            className="rounded-xl border border-[var(--rw-border)] bg-[var(--rw-surface-hover)]/50 px-3 py-3 text-sm"
          >
            <span className="font-semibold text-[var(--rw-text)]">
              {footer.label}
            </span>
            <p
              className={cn(
                "mt-1 tabular-nums text-[var(--rw-text)]",
                footer.emphasizeDetail &&
                  "text-base font-bold text-[var(--rw-primary)]",
              )}
            >
              {footer.detail}
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden sm:block">
        <div
          className="grid gap-x-2 border-b border-[var(--rw-border)] px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--rw-muted)]"
          style={{ gridTemplateColumns: gridCols }}
        >
          <span className="text-left">{headers[0]}</span>
          {numericHeaders.map((h) => (
            <span key={h} className="text-right">
              {h}
            </span>
          ))}
        </div>
        <ul className="divide-y divide-[var(--rw-border)]">
          {rows.map((row) => (
            <li key={row.key}>
              <div
                className="grid items-baseline gap-x-2 px-2 py-2.5 text-[13px] tabular-nums"
                style={{ gridTemplateColumns: gridCols }}
              >
                <span className="break-words text-left">
                  <span className="font-semibold text-[var(--rw-text)]">
                    {row.cells[0] ?? row.name}
                  </span>
                  {row.sub ? (
                    <span className="mt-0.5 block text-[12px] font-normal leading-snug text-[var(--rw-muted)]">
                      {row.sub}
                    </span>
                  ) : null}
                </span>
                {row.cells.slice(1).map((cell, i) => (
                  <span
                    key={`${row.key}-${i + 1}`}
                    className={cn(
                      "text-right font-medium text-[var(--rw-text)]",
                      i === 0 && "font-semibold",
                      headers.includes("W") && i === 3 && "font-bold",
                    )}
                  >
                    {cell}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {footerRows && footerRows.length > 0 ? (
          <ul className="divide-y divide-[var(--rw-border)] border-t border-[var(--rw-border)]">
            {footerRows.map((footer) => (
              <li
                key={footer.key}
                className="grid gap-x-2 px-2 py-2.5 text-[13px]"
                style={{ gridTemplateColumns: gridCols }}
              >
                <span className="font-semibold text-[var(--rw-text)]">
                  {footer.label}
                </span>
                <span
                  className={cn(
                    "col-span-full text-left tabular-nums text-[var(--rw-text)] sm:col-span-1 sm:col-start-2 sm:text-right",
                    footer.emphasizeDetail && "text-base font-bold text-[var(--rw-primary)]",
                  )}
                  style={{
                    gridColumn: `2 / -1`,
                  }}
                >
                  {footer.detail}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
}
