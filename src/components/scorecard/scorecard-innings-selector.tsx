"use client";

import { useMemo, useState } from "react";
import {
  InningsNotStartedPlaceholder,
  InningsScorecardSection,
} from "@/components/scorecard/innings-scorecard-section";
import { shouldShowSecondInningsPlaceholder } from "@/lib/scorecard/scorecard-innings-display";
import type {
  FullMatchScorecardData,
  ScorecardInningsBuilt,
} from "@/lib/scorecard/types";
import type { BattingSide } from "@/lib/database/types";
import { cn } from "@/lib/utils/cn";

function teamLabel(team: BattingSide, opponentName: string): string {
  return team === "red_wings" ? "Red Wings" : opponentName;
}

type InningsTab =
  | { kind: "innings"; key: string; label: string; built: ScorecardInningsBuilt }
  | { kind: "placeholder"; key: string; label: string; inningsNumber: number };

export function ScorecardInningsSelector({
  data,
}: {
  data: FullMatchScorecardData;
}) {
  const opponent = data.document.opponent;
  const showSecondPlaceholder = shouldShowSecondInningsPlaceholder(
    data.innings,
    data.status,
  );

  const tabs = useMemo((): InningsTab[] => {
    const list: InningsTab[] = data.innings.map((inn) => ({
      kind: "innings",
      key: inn.inningsId,
      label: teamLabel(inn.battingTeam, opponent),
      built: inn,
    }));
    if (showSecondPlaceholder && data.innings.length === 1) {
      const first = data.innings[0]!;
      const secondBatting: BattingSide =
        first.battingTeam === "red_wings" ? "opponent" : "red_wings";
      list.push({
        kind: "placeholder",
        key: "innings-2-placeholder",
        label: teamLabel(secondBatting, opponent),
        inningsNumber: 2,
      });
    }
    return list;
  }, [data.innings, opponent, showSecondPlaceholder]);

  const [activeKey, setActiveKey] = useState(tabs[0]?.key ?? "");

  const activeTab = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  if (!activeTab) {
    return null;
  }

  return (
    <div className="min-w-0 space-y-4">
      {tabs.length > 1 ? (
        <div
          className="grid min-w-0 gap-2"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          role="tablist"
          aria-label="Innings"
        >
          {tabs.map((tab) => {
            const active = tab.key === activeTab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn(
                  "rw-focus-ring min-w-0 rounded-lg px-2 py-2.5 text-center text-[11px] font-semibold leading-tight sm:text-xs",
                  active
                    ? "bg-[var(--rw-primary)] text-white"
                    : "bg-[var(--rw-surface-hover)] text-[var(--rw-text)]",
                )}
                onClick={() => setActiveKey(tab.key)}
              >
                <span className="line-clamp-2 break-words">{tab.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div role="tabpanel" className="min-w-0">
        {activeTab.kind === "placeholder" ? (
          <InningsNotStartedPlaceholder
            inningsNumber={activeTab.inningsNumber}
          />
        ) : (
          <InningsScorecardSection
            built={activeTab.built}
            opponentName={opponent}
            matchStatus={data.status}
          />
        )}
      </div>
    </div>
  );
}
