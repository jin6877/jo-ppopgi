"use client";

import { useState } from "react";
import type { Action, AppState } from "@/lib/store";
import { planSummary } from "@/lib/draw";
import { MAX_GROUPS, colorOf } from "@/lib/palette";
import { playTick } from "@/lib/sound";

type Props = {
  state: AppState;
  dispatch: (action: Action) => void;
};

/** "홍길동, 김철수\n이영희" 처럼 붙여넣어도 한 번에 받는다 */
function splitNames(raw: string): string[] {
  return raw.split(/[\n,،、·\t]+/g);
}

export function SetupPanel({ state, dispatch }: Props) {
  const [input, setInput] = useState("");
  const { people, groups } = state;

  const submit = () => {
    const names = splitNames(input);
    if (names.every((n) => !n.trim())) return;
    dispatch({ type: "addPeople", names });
    setInput("");
    playTick();
  };

  const canStart = people.length >= 1;

  return (
    <div className="flex flex-col gap-5">
      {/* ── 참가자 ─────────────────────────── */}
      <section className="paper-edge rounded-sm border border-line bg-card p-5 sm:p-6">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-hand text-2xl font-bold">누가 참여하나요?</h2>
          <span className="text-sm text-ink-faint">{people.length}명</span>
        </div>
        <p className="mb-4 text-sm text-ink-soft">
          한 명씩 입력하거나, 명단을 통째로 붙여넣으세요 (쉼표·줄바꿈으로 구분).
        </p>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="이름 입력 후 Enter"
            aria-label="참가자 이름"
            className="min-w-0 flex-1 rounded-sm border border-line bg-paper px-3 py-2.5 text-base outline-none placeholder:text-ink-faint focus:border-ink-soft"
          />
          <button
            type="button"
            onClick={submit}
            className="shrink-0 rounded-sm border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-card transition active:translate-y-px"
          >
            추가
          </button>
        </div>

        {people.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {people.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "removePerson", id: p.id })}
                  title="빼기"
                  className="group flex items-center gap-1.5 rounded-sm border border-line bg-paper py-1.5 pr-2 pl-3 text-sm transition hover:border-accent hover:text-accent"
                >
                  {p.name}
                  <span className="text-ink-faint transition group-hover:text-accent">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 조 ─────────────────────────────── */}
      <section className="paper-edge rounded-sm border border-line bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-hand text-2xl font-bold">몇 조로 나눌까요?</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "setGroupCount", count: groups.length - 1 });
                playTick();
              }}
              disabled={groups.length <= 2}
              aria-label="조 줄이기"
              className="h-9 w-9 rounded-sm border border-line text-lg leading-none transition hover:bg-paper disabled:opacity-35"
            >
              −
            </button>
            <span className="font-hand w-10 text-center text-2xl font-bold">{groups.length}</span>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "setGroupCount", count: groups.length + 1 });
                playTick();
              }}
              disabled={groups.length >= MAX_GROUPS}
              aria-label="조 늘리기"
              className="h-9 w-9 rounded-sm border border-line text-lg leading-none transition hover:bg-paper disabled:opacity-35"
            >
              +
            </button>
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {groups.map((g, i) => {
            const c = colorOf(i);
            return (
              <li key={g.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5" style={{ background: c.soft }}>
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: c.ink }}
                  aria-hidden
                />
                <input
                  value={g.name}
                  onChange={(e) => dispatch({ type: "renameGroup", id: g.id, name: e.target.value })}
                  aria-label={`${i + 1}번째 조 이름`}
                  className="w-full min-w-0 bg-transparent text-sm font-semibold outline-none"
                  style={{ color: c.ink }}
                />
              </li>
            );
          })}
        </ul>

        {people.length > 0 && (
          <p className="mt-4 text-sm text-ink-soft">
            {people.length}명을 {groups.length}조로 →{" "}
            <b className="text-ink">{planSummary(people.length, groups.length)}</b>
          </p>
        )}
      </section>

      <button
        type="button"
        disabled={!canStart}
        onClick={() => dispatch({ type: "start" })}
        className="paper-edge rounded-sm border-2 border-ink bg-accent px-6 py-4 text-lg font-bold text-card transition enabled:hover:brightness-110 enabled:active:translate-y-px disabled:cursor-not-allowed disabled:border-line disabled:bg-paper-deep disabled:text-ink-faint disabled:shadow-none"
      >
        {canStart ? `통에 제비 ${people.length}장 넣기` : "이름을 먼저 추가하세요"}
      </button>
    </div>
  );
}
