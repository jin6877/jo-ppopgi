"use client";

import { useState } from "react";
import type { Person } from "@/lib/store";
import { playTick } from "@/lib/sound";

type Props = {
  waiting: Person[];
  disabled: boolean;
  onPick: (personId: string) => void;
  onAddLate: (name: string) => void;
  onRemove: (personId: string) => void;
};

export function WaitingList({ waiting, disabled, onPick, onAddLate, onRemove }: Props) {
  const [lateOpen, setLateOpen] = useState(false);
  const [lateName, setLateName] = useState("");

  const addLate = () => {
    if (!lateName.trim()) return;
    onAddLate(lateName);
    setLateName("");
    setLateOpen(false);
    playTick();
  };

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-hand text-xl font-bold">
          아직 안 뽑은 사람 <span className="text-ink-faint">{waiting.length}</span>
        </h2>
        <button
          type="button"
          onClick={() => setLateOpen((v) => !v)}
          className="text-xs text-ink-faint underline underline-offset-4 hover:text-ink"
        >
          {lateOpen ? "취소" : "＋ 늦게 온 사람"}
        </button>
      </div>

      {lateOpen && (
        <div className="animate-pop mb-3 flex gap-2">
          <input
            autoFocus
            value={lateName}
            onChange={(e) => setLateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLate()}
            placeholder="이름"
            aria-label="늦게 온 사람 이름"
            className="min-w-0 flex-1 rounded-sm border border-line bg-card px-3 py-2 text-sm outline-none focus:border-ink-soft"
          />
          <button
            type="button"
            onClick={addLate}
            className="rounded-sm border border-ink bg-ink px-3 py-2 text-sm font-semibold text-card"
          >
            제비 한 장 더 넣기
          </button>
        </div>
      )}

      {waiting.length === 0 ? (
        <p className="rounded-sm border border-dashed border-line px-4 py-6 text-center text-sm text-ink-faint">
          모두 뽑았습니다
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {waiting.map((p) => (
            <li key={p.id} className="group relative">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(p.id)}
                className="paper-edge rounded-sm border border-line bg-card px-4 py-2.5 text-base font-semibold transition enabled:hover:-translate-y-0.5 enabled:hover:border-accent enabled:hover:text-accent enabled:active:translate-y-0 disabled:opacity-50"
              >
                {p.name}
              </button>
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                aria-label={`${p.name} 명단에서 빼기`}
                className="absolute -top-1.5 -right-1.5 hidden h-5 w-5 rounded-full border border-line bg-paper text-xs leading-none text-ink-faint group-hover:block hover:border-accent hover:text-accent"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
