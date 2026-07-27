"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BucketArt } from "@/components/BucketArt";
import { Confetti, GOLD } from "@/components/Confetti";
import { DrawOverlay } from "@/components/DrawOverlay";
import { GroupBoard } from "@/components/GroupBoard";
import { SetupPanel } from "@/components/SetupPanel";
import { WaitingList } from "@/components/WaitingList";
import { capacityLabel, randInt, seatCap } from "@/lib/draw";
import { playFanfare, playReveal, playRustle, playTick, setMuted as applyMute } from "@/lib/sound";
import { useAppState } from "@/lib/store";

type Reveal = { personId: string; groupId: string; remaining: number };

export default function Home() {
  const [state, dispatch] = useAppState();
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [justAssigned, setJustAssigned] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [copied, setCopied] = useState(false);
  const drewThisSession = useRef(false);
  const celebrated = useRef(false);

  const [spinning, setSpinning] = useState(false);
  const [spinLeaders, setSpinLeaders] = useState<Record<string, string> | null>(null);
  /** 조장 확정 연출 — 값이 바뀔 때마다 다시 재생된다(0 이면 꺼짐) */
  const [cheer, setCheer] = useState(0);

  const { people, groups, bucket, started, log, muted, leaders } = state;
  const waiting = useMemo(() => people.filter((p) => !p.groupId), [people]);
  const done = started && people.length > 0 && waiting.length === 0;

  // 빈 자리 표시는 '실제 제비 구성' 이 아니라 '모든 조에 열려 있는 최대 정원' 기준.
  // 13명 4조라면 네 조 모두 4자리로 보인다 — 어느 조가 4명이 될지는 뽑아야 알 수 있게.
  const slotsByGroup = useMemo(() => {
    const cap = seatCap(people.length, groups.length);
    const out: Record<string, number> = {};
    for (const g of groups) {
      const members = people.filter((p) => p.groupId === g.id).length;
      out[g.id] = Math.max(0, Math.min(cap - members, bucket.length));
    }
    return out;
  }, [people, groups, bucket.length]);

  // 음소거 설정은 나머지 상태와 함께 저장된다 — 여기선 사운드 모듈에만 반영
  useEffect(() => {
    applyMute(muted);
  }, [muted]);

  const toggleMute = () => {
    dispatch({ type: "toggleMute" });
    if (muted) {
      applyMute(false); // 켜는 순간 바로 소리가 나도록
      playTick();
    }
  };

  // 마지막 한 명까지 뽑히면 축포 — 이번 세션에 실제로 뽑았을 때만(새로고침 복원 땐 조용히)
  useEffect(() => {
    if (!done || reveal) {
      if (!done) celebrated.current = false;
      return;
    }
    if (celebrated.current || !drewThisSession.current) return;
    celebrated.current = true;
    playFanfare();
    setConfetti(true);
    const t = window.setTimeout(() => setConfetti(false), 3800);
    return () => window.clearTimeout(t);
  }, [done, reveal]);

  // 조장 룰렛 — 조마다 왕관이 돌다가 1.1초 뒤 멈춘다
  useEffect(() => {
    if (!spinning) return;
    const roll = () => {
      const next: Record<string, string> = {};
      for (const g of groups) {
        const members = people.filter((p) => p.groupId === g.id);
        if (members.length > 0) next[g.id] = members[randInt(members.length)].id;
      }
      setSpinLeaders(next);
    };
    const iv = window.setInterval(roll, 90);
    const stop = window.setTimeout(() => {
      setSpinning(false);
      setSpinLeaders(null);
      dispatch({ type: "pickLeaders" });
      playFanfare();
      setCheer((n) => n + 1);
    }, 1100);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(stop);
    };
  }, [spinning, groups, people, dispatch]);

  // 확정 연출은 잠깐만 (링·반짝이·금색 축포)
  useEffect(() => {
    if (!cheer) return;
    const t = window.setTimeout(() => setCheer(0), 2600);
    return () => window.clearTimeout(t);
  }, [cheer]);

  const rollLeaders = () => {
    if (spinning) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      dispatch({ type: "pickLeaders" });
      playReveal();
      return;
    }
    playRustle(1.1);
    setSpinning(true);
  };

  const pick = (personId: string) => {
    if (reveal) return;
    const slip = bucket[bucket.length - 1];
    if (!slip) return;
    drewThisSession.current = true;
    dispatch({ type: "draw", personId });
    setReveal({ personId, groupId: slip, remaining: bucket.length - 1 });
  };

  const pickRandom = () => {
    if (waiting.length === 0) return;
    pick(waiting[randInt(waiting.length)].id);
  };

  const closeReveal = () => {
    if (reveal) setJustAssigned(reveal.personId);
    setReveal(null);
  };

  const resultText = () => {
    const hasLeader = Object.keys(leaders).length > 0;
    const lines = [`🎲 조뽑기 결과 — ${people.length}명 · ${groups.length}조`, ""];
    for (const g of groups) {
      const members = people.filter((p) => p.groupId === g.id);
      const names = members.map((p) => (leaders[g.id] === p.id ? `👑${p.name}` : p.name));
      lines.push(`${g.name} (${members.length}명): ${names.join(", ") || "-"}`);
    }
    if (hasLeader) lines.push("", "👑 = 조장");
    lines.push("", "https://jo-ppopgi.vercel.app");
    return lines.join("\n");
  };

  const copyResult = async () => {
    const text = resultText();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 클립보드 API 를 막아둔 브라우저 폴백
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    playTick();
    window.setTimeout(() => setCopied(false), 1800);
  };

  const revealGroup = reveal ? groups.find((g) => g.id === reveal.groupId) : undefined;
  const revealPerson = reveal ? people.find((p) => p.id === reveal.personId) : undefined;

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-14 sm:px-6">
      <header className="flex items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-2">
          <BucketArt remaining={3} capacity={5} className="h-9 w-9" />
          <h1 className="font-hand text-2xl leading-none font-bold">조뽑기 통</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? "소리 켜기" : "소리 끄기"}
            className="rounded-sm border border-line bg-card px-2.5 py-1.5 text-sm transition hover:border-ink-soft"
          >
            {muted ? "🔇" : "🔊"}
          </button>
          {(started || people.length > 0) && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("명단과 결과를 모두 지우고 처음부터 할까요?")) {
                  dispatch({ type: "resetAll" });
                  drewThisSession.current = false;
                  setJustAssigned(null);
                }
              }}
              className="rounded-sm border border-line bg-card px-2.5 py-1.5 text-sm text-ink-soft transition hover:border-accent hover:text-accent"
            >
              처음부터
            </button>
          )}
        </div>
      </header>

      {!started ? (
        <main className="flex flex-col gap-5">
          <div className="tilt-a paper-edge rounded-sm border border-line bg-paper-deep px-5 py-4">
            <p className="text-[15px] leading-relaxed text-ink-soft">
              <b className="text-ink">1, 2, 3, 4…</b> 를 사람 수만큼 종이에 적어 통에 넣고 한 명씩
              뽑던 그 방식 그대로입니다. 순서는 운, 인원은 저절로 공평하게.
            </p>
          </div>
          <SetupPanel state={state} dispatch={dispatch} />
        </main>
      ) : (
        <main className="grid flex-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* ── 통 ─────────────────────────────── */}
          <aside className="flex flex-col gap-4">
            <div className="paper-edge flex flex-col items-center gap-3 rounded-sm border border-line bg-card px-4 py-5">
              <BucketArt remaining={bucket.length} capacity={people.length} className="h-36 w-44" />
              {done ? (
                <p className="font-hand animate-banner text-2xl font-bold">통이 비었습니다!</p>
              ) : (
                <p className="font-hand text-2xl font-bold">
                  남은 제비 <span className="text-accent">{bucket.length}</span>장
                </p>
              )}

              {/* 조별 제비 구성은 절대 보여 주지 않는다 — 뽑기 전에 답이 새기 때문 */}
              <p className="text-center text-xs text-ink-soft">
                {capacityLabel(people.length, groups.length)}
                {people.length % groups.length !== 0 && (
                  <span className="mt-0.5 block text-ink-faint">
                    한 명 더 들어가는 조는 뽑아 봐야 압니다
                  </span>
                )}
              </p>

              {!done && (
                <button
                  type="button"
                  onClick={pickRandom}
                  disabled={!!reveal || waiting.length === 0}
                  className="w-full rounded-sm border-2 border-ink bg-accent px-4 py-3 font-bold text-card transition enabled:hover:brightness-110 enabled:active:translate-y-px disabled:opacity-40"
                >
                  아무나 한 명 뽑기 🤚
                </button>
              )}

              {log.length > 0 && !done && (
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "undo" });
                    setJustAssigned(null);
                    playTick();
                  }}
                  disabled={!!reveal}
                  className="text-xs text-ink-faint underline underline-offset-4 hover:text-ink"
                >
                  방금 뽑은 것 되돌리기
                </button>
              )}
            </div>

            {done && (
              <div className="animate-pop paper-edge flex flex-col gap-2 rounded-sm border-2 border-ink bg-card p-4">
                <p className="font-hand text-xl font-bold">조 나누기 완료 🎉</p>
                <button
                  type="button"
                  onClick={rollLeaders}
                  disabled={spinning}
                  className="rounded-sm border-2 border-ink bg-card px-4 py-2.5 text-sm font-bold transition enabled:hover:bg-paper enabled:active:translate-y-px disabled:opacity-60"
                >
                  {spinning
                    ? "조장 뽑는 중…"
                    : Object.keys(leaders).length > 0
                      ? "조장 다시 뽑기 👑"
                      : "조장 뽑기 👑"}
                </button>
                <button
                  type="button"
                  onClick={copyResult}
                  className="rounded-sm border-2 border-ink bg-ink px-4 py-2.5 text-sm font-bold text-card transition active:translate-y-px"
                >
                  {copied ? "복사했습니다!" : "결과 복사하기"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "redraw" });
                    setJustAssigned(null);
                    celebrated.current = false;
                  }}
                  className="rounded-sm border border-line bg-card px-4 py-2.5 text-sm font-semibold transition hover:border-ink-soft"
                >
                  같은 인원으로 다시 뽑기
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (
                  log.length === 0 ||
                  window.confirm("지금까지 뽑은 결과가 사라집니다. 설정으로 돌아갈까요?")
                ) {
                  dispatch({ type: "backToSetup" });
                  setJustAssigned(null);
                }
              }}
              className="self-center text-xs text-ink-faint underline underline-offset-4 hover:text-ink"
            >
              명단·조 설정 바꾸기
            </button>
          </aside>

          {/* ── 명단 + 조 보드 ─────────────────── */}
          <section className="flex flex-col gap-6">
            <WaitingList
              waiting={waiting}
              disabled={!!reveal}
              onPick={pick}
              onAddLate={(name) => dispatch({ type: "addPeople", names: [name] })}
              onRemove={(id) => dispatch({ type: "removePerson", id })}
            />
            <div className="flex flex-col gap-2">
              {done && (
                <p className="animate-banner rounded-sm border border-dashed border-line bg-card px-3 py-2 text-xs leading-relaxed text-ink-soft">
                  인원이 아쉬우면 손으로 조정하세요 — <b className="text-ink">이름을 끌어</b> 다른
                  조에 놓으면 이동, <b className="text-ink">사람 위에 놓으면</b> 둘이 자리를
                  바꿉니다. (누른 뒤 옮길 곳을 눌러도 됩니다)
                </p>
              )}
              <GroupBoard
                groups={groups}
                people={people}
                slotsByGroup={slotsByGroup}
                justAssigned={justAssigned}
                leaders={spinLeaders ?? leaders}
                celebrate={cheer}
                editable={done && !spinning}
                onMove={(personId, toGroupId) => {
                  dispatch({ type: "movePerson", personId, toGroupId });
                  setJustAssigned(personId);
                  playTick();
                }}
                onSwap={(aId, bId) => {
                  dispatch({ type: "swapPeople", aId, bId });
                  setJustAssigned(bId);
                  playTick();
                }}
              />
            </div>
          </section>
        </main>
      )}

      <footer className="mt-10 text-center text-xs leading-relaxed text-ink-faint">
        모든 계산은 브라우저 안에서만 일어납니다. 명단은 서버로 보내지 않고 이 기기에만 저장됩니다.
      </footer>

      {reveal && revealGroup && revealPerson && (
        <DrawOverlay
          key={`${reveal.personId}-${log.length}`}
          personName={revealPerson.name}
          groupName={revealGroup.name}
          groupIndex={groups.findIndex((g) => g.id === revealGroup.id)}
          remaining={reveal.remaining}
          capacity={people.length}
          onClose={closeReveal}
        />
      )}
      {confetti && <Confetti />}
      {cheer > 0 && <Confetti key={cheer} colors={GOLD} count={26} speed={0.75} />}
    </div>
  );
}
