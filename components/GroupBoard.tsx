"use client";

import { useRef, useState } from "react";
import type { Group, Person } from "@/lib/store";
import { colorOf } from "@/lib/palette";

type Props = {
  groups: Group[];
  people: Person[];
  /**
   * 조별로 보여 줄 빈 자리 수.
   * 통에 남은 '그 조의 제비 수' 가 아니라 min(최대 정원 − 현재 인원, 남은 제비) 다.
   * 실제 제비 구성을 노출하면 "어느 조가 한 명 더 받는지" 가 뽑기 전에 새어 나가기 때문.
   */
  slotsByGroup: Record<string, number>;
  /** 방금 배정된 사람 (한 번 떨어지는 연출) */
  justAssigned: string | null;
  /** 조 id → 조장 person id. 뽑는 중(룰렛)에는 매 프레임 바뀐 값이 들어온다. */
  leaders?: Record<string, string>;
  /** 조장 확정 연출 트리거. 0 이면 꺼짐, 값이 바뀌면 연출이 다시 재생된다. */
  celebrate?: number;
  /** 다 뽑은 뒤에만 켠다 — 이름을 끌어 조를 바꿀 수 있는 상태 */
  editable?: boolean;
  onMove?: (personId: string, toGroupId: string) => void;
  onSwap?: (aId: string, bId: string) => void;
};

type DragRef = {
  personId: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

const DRAG_THRESHOLD = 6; // px — 이보다 덜 움직이면 '탭(선택)' 으로 본다

// 조장 이름표 주변에서 터지는 반짝이 자리
const SPARKS = [
  { at: "-top-2 left-1", delay: "0s" },
  { at: "-top-2.5 right-3", delay: "0.16s" },
  { at: "-bottom-2 right-0", delay: "0.32s" },
];

/** 좌표 아래에 있는 드롭 대상 찾기 (유령 조각은 pointer-events:none 이라 걸리지 않는다) */
function hitTest(x: number, y: number) {
  const el = document.elementFromPoint(x, y);
  return {
    personId: el?.closest<HTMLElement>("[data-person-id]")?.dataset.personId,
    groupId: el?.closest<HTMLElement>("[data-group-id]")?.dataset.groupId,
  };
}

export function GroupBoard({
  groups,
  people,
  slotsByGroup,
  justAssigned,
  leaders = {},
  celebrate = 0,
  editable = false,
  onMove,
  onSwap,
}: Props) {
  const drag = useRef<DragRef | null>(null);
  const suppressClick = useRef(false);
  const [ghost, setGhost] = useState<{ personId: string; x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ groupId?: string; personId?: string }>({});
  const [selected, setSelected] = useState<string | null>(null);

  const groupIndex = (id: string | null) => groups.findIndex((g) => g.id === id);

  const endDrag = () => {
    drag.current = null;
    setGhost(null);
    setHover({});
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>, personId: string) => {
    if (!editable || e.button > 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      personId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
    d.moved = true;
    setGhost({ personId: d.personId, x: e.clientX, y: e.clientY });
    const hit = hitTest(e.clientX, e.clientY);
    setHover({
      groupId: hit.groupId,
      personId: hit.personId !== d.personId ? hit.personId : undefined,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.moved) {
      endDrag(); // 그냥 탭 — 뒤이어 오는 click 이 선택을 처리한다
      return;
    }
    suppressClick.current = true; // 드래그 끝의 click 은 무시

    const hit = hitTest(e.clientX, e.clientY);
    const from = people.find((p) => p.id === d.personId)?.groupId ?? null;
    if (hit.personId && hit.personId !== d.personId) {
      onSwap?.(d.personId, hit.personId);
    } else if (hit.groupId && hit.groupId !== from) {
      onMove?.(d.personId, hit.groupId);
    }
    setSelected(null);
    endDrag();
  };

  /** 탭·키보드용 — 한 명 고르고 다른 조(또는 다른 사람)를 누르면 이동/교환 */
  const handlePersonClick = (personId: string) => {
    if (!editable) return;
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (!selected) return setSelected(personId);
    if (selected === personId) return setSelected(null);
    onSwap?.(selected, personId);
    setSelected(null);
  };

  const handleGroupClick = (e: React.MouseEvent<HTMLElement>, groupId: string) => {
    if (!editable || !selected) return;
    if ((e.target as HTMLElement).closest("[data-person-id]")) return; // 사람 클릭은 위에서 처리
    const from = people.find((p) => p.id === selected)?.groupId;
    if (from !== groupId) onMove?.(selected, groupId);
    setSelected(null);
  };

  const cheering = celebrate > 0;
  const ghostPerson = ghost ? people.find((p) => p.id === ghost.personId) : undefined;
  const ghostColor = ghostPerson ? colorOf(groupIndex(ghostPerson.groupId)) : null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {groups.map((g, i) => {
          const c = colorOf(i);
          const members = people.filter((p) => p.groupId === g.id);
          const empty = slotsByGroup[g.id] ?? 0;
          const isTarget = editable && hover.groupId === g.id && !hover.personId;

          return (
            <li
              key={g.id}
              data-group-id={g.id}
              onClick={(e) => handleGroupClick(e, g.id)}
              className={`paper-edge flex min-h-[132px] flex-col rounded-sm border transition-shadow ${
                editable && selected ? "cursor-pointer" : ""
              }`}
              style={{
                borderColor: c.ink,
                boxShadow: isTarget ? `0 0 0 3px ${c.ink}` : undefined,
                background: isTarget ? c.tint : "var(--color-card)",
              }}
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
                {members.map((p) => {
                  const isGhost = ghost?.personId === p.id;
                  const isSwapTarget = hover.personId === p.id;
                  const isSelected = selected === p.id;
                  const isLeader = leaders[g.id] === p.id;
                  const Tag = editable ? "button" : "div";
                  return (
                    <li key={`${p.id}-${p.groupId}`} className="relative">
                      <Tag
                        {...(editable
                          ? {
                              type: "button" as const,
                              onPointerDown: (e: React.PointerEvent<HTMLElement>) =>
                                handlePointerDown(e, p.id),
                              onPointerMove: handlePointerMove,
                              onPointerUp: handlePointerUp,
                              onPointerCancel: endDrag,
                              onClick: () => handlePersonClick(p.id),
                              "aria-pressed": isSelected,
                              title: "끌어서 다른 조로 옮기기 · 사람 위에 놓으면 자리 바꿈",
                            }
                          : {})}
                        data-person-id={p.id}
                        className={`w-full rounded-sm border px-2.5 py-1.5 text-center text-sm font-semibold select-none ${
                          p.id === justAssigned ? "animate-land" : ""
                        } ${editable ? "touch-none cursor-grab active:cursor-grabbing" : ""} ${
                          isGhost ? "opacity-35" : ""
                        }`}
                        style={{
                          borderColor: c.ink,
                          background: isSwapTarget || isSelected || isLeader ? c.soft : c.tint,
                          color: c.ink,
                          borderStyle: isSwapTarget ? "dashed" : "solid",
                          borderWidth: isLeader ? 2 : 1,
                          boxShadow: isSelected ? `0 0 0 2px ${c.ink}` : undefined,
                        }}
                      >
                        {isLeader && (
                          <>
                            <span
                              aria-hidden
                              key={`crown-${celebrate}`}
                              className={`mr-1 ${cheering ? "animate-crown" : ""}`}
                            >
                              👑
                            </span>
                            <span className="sr-only">조장 </span>
                          </>
                        )}
                        {p.name}
                      </Tag>

                      {/* 확정 순간에만 잠깐 — 퍼지는 링 + 반짝이 */}
                      {isLeader && cheering && (
                        <span key={`fx-${celebrate}`} aria-hidden>
                          <span
                            className="animate-halo pointer-events-none absolute inset-0 rounded-sm border-2"
                            style={{ borderColor: c.ink }}
                          />
                          <span
                            className="animate-halo-late pointer-events-none absolute inset-0 rounded-sm border-2"
                            style={{ borderColor: "#d9a441" }}
                          />
                          {SPARKS.map((s, si) => (
                            <span
                              key={si}
                              className={`animate-sparkle pointer-events-none absolute text-xs ${s.at}`}
                              style={{ animationDelay: s.delay }}
                            >
                              ✨
                            </span>
                          ))}
                        </span>
                      )}
                    </li>
                  );
                })}

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

      {/* 끌고 다니는 이름표 */}
      {ghost && ghostPerson && ghostColor && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rotate-3 rounded-sm border-2 px-3 py-1.5 text-sm font-semibold shadow-xl"
          style={{
            left: ghost.x,
            top: ghost.y,
            borderColor: ghostColor.ink,
            background: ghostColor.tint,
            color: ghostColor.ink,
          }}
        >
          {ghostPerson.name}
        </div>
      )}
    </>
  );
}
