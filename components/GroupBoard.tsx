"use client";

import type { Group, Person } from "@/lib/store";
import { colorOf } from "@/lib/palette";

type Props = {
  groups: Group[];
  people: Person[];
  /** 조별로 통에 남은 제비 수 = 아직 빈 자리 */
  remainingByGroup: Record<string, number>;
  /** 방금 배정된 사람 (한 번 떨어지는 연출) */
  justAssigned: string | null;
};

export function GroupBoard({ groups, people, remainingByGroup, justAssigned }: Props) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {groups.map((g, i) => {
        const c = colorOf(i);
        const members = people.filter((p) => p.groupId === g.id);
        const empty = remainingByGroup[g.id] ?? 0;

        return (
          <li
            key={g.id}
            className="paper-edge flex min-h-[132px] flex-col rounded-sm border bg-card"
            style={{ borderColor: c.ink }}
          >
            <div
              className="flex items-baseline justify-between px-3 py-2"
              style={{ background: c.soft }}
            >
              <span className="font-hand truncate text-xl font-bold" style={{ color: c.ink }}>
                {g.name}
              </span>
              <span className="text-xs font-semibold" style={{ color: c.ink }}>
                {members.length}명
              </span>
            </div>

            <ul className="flex flex-1 flex-col gap-1.5 p-2.5">
              {members.map((p) => (
                <li
                  key={p.id}
                  className={`rounded-sm border px-2.5 py-1.5 text-center text-sm font-semibold ${
                    p.id === justAssigned ? "animate-land" : ""
                  }`}
                  style={{ borderColor: c.ink, background: c.tint, color: c.ink }}
                >
                  {p.name}
                </li>
              ))}
              {Array.from({ length: empty }).map((_, k) => (
                <li
                  key={`ghost-${k}`}
                  aria-hidden
                  className="rounded-sm border border-dashed border-line px-2.5 py-1.5 text-center text-sm text-ink-faint"
                >
                  ?
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
