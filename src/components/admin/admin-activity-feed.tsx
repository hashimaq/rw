"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AdminAuditEventWithActor } from "@/lib/audit/types";
import { formatAdminActivityLine } from "@/lib/audit/format-activity";
import { EmptyState } from "@/components/ui/empty-state";

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return "just now";
  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

interface AdminActivityFeedProps {
  initialEvents: AdminAuditEventWithActor[];
  limit?: number;
}

export function AdminActivityFeed({
  initialEvents,
  limit = 30,
}: AdminActivityFeedProps) {
  const [events, setEvents] = useState(initialEvents);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("rw-admin-audit")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_audit_events",
        },
        async (payload) => {
          const id = (payload.new as { id?: string }).id;
          if (!id) return;

          const res = await fetch(`/api/admin/audit/${id}`);
          if (!res.ok) return;
          const body = (await res.json()) as { event?: AdminAuditEventWithActor };
          const row = body.event;
          if (!row) return;

          setEvents((prev) => {
            if (prev.some((e) => e.id === row.id)) return prev;
            return [row, ...prev].slice(0, limit);
          });

          const line = formatAdminActivityLine(row);
          setToast(line.text);
          window.setTimeout(() => setToast(null), 4500);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [limit]);

  const rows = useMemo(
    () =>
      events.map((event) => ({
        event,
        ...formatAdminActivityLine(event),
      })),
    [events],
  );

  return (
    <div className="relative">
      {toast ? (
        <div
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-full border border-[var(--rw-border)] bg-[var(--rw-surface)] px-4 py-2 text-center text-xs font-medium shadow-[var(--rw-shadow-md)] sm:bottom-8"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No admin activity yet"
          description="When an admin adds players, creates matches, or updates squad data, actions will appear here for all admins."
        />
      ) : (
        <ul className="divide-y divide-[var(--rw-border)]">
          {rows.map(({ event, text, href }) => (
            <li key={event.id} className="py-3 first:pt-0 last:pb-0">
              {href ? (
                <Link
                  href={href}
                  className="rw-focus-ring block rounded-lg px-1 py-0.5 hover:bg-[var(--rw-surface-hover)]"
                >
                  <p className="text-sm font-medium">{text}</p>
                  <p className="mt-0.5 text-xs text-[var(--rw-muted)]">
                    {formatRelativeTime(event.created_at)}
                  </p>
                </Link>
              ) : (
                <div className="px-1">
                  <p className="text-sm font-medium">{text}</p>
                  <p className="mt-0.5 text-xs text-[var(--rw-muted)]">
                    {formatRelativeTime(event.created_at)}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
