"use client";

import { useEffect, useRef, useState } from "react";
import { BucketArt } from "./BucketArt";
import { colorOf } from "@/lib/palette";
import { playReveal, playRustle } from "@/lib/sound";

type Props = {
  personName: string;
  groupName: string;
  groupIndex: number;
  /** 이번에 뽑고 난 뒤 통에 남은 제비 */
  remaining: number;
  capacity: number;
  onClose: () => void;
};

/** 0: 통 뒤적임 → 1: 접힌 제비 꺼냄 → 2: 펼쳐서 공개 */
type Step = 0 | 1 | 2;

const TIMELINE = { pull: 780, open: 1180, close: 2900 };
const FAST = { pull: 0, open: 60, close: 1500 };

export function DrawOverlay({
  personName,
  groupName,
  groupIndex,
  remaining,
  capacity,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>(0);
  const timers = useRef<number[]>([]);
  const color = colorOf(groupIndex);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = reduced ? FAST : TIMELINE;

    if (!reduced) playRustle(t.open / 1000);
    timers.current.push(window.setTimeout(() => setStep(1), t.pull));
    timers.current.push(
      window.setTimeout(() => {
        setStep(2);
        playReveal();
      }, t.open),
    );
    timers.current.push(window.setTimeout(onClose, t.close));

    return clearTimers;
    // 오버레이는 뽑기 1회당 새로 마운트된다(key) — 최초 1회만 타이머를 건다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 아무 데나 누르면: 연출 중이면 결과로 건너뛰고, 이미 공개됐으면 닫는다
  const skip = () => {
    if (step < 2) {
      clearTimers();
      setStep(2);
      playReveal();
      timers.current.push(window.setTimeout(onClose, 1600));
    } else {
      clearTimers();
      onClose();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[rgba(32,28,18,0.62)] px-6 backdrop-blur-[2px]"
      onClick={skip}
      role="dialog"
      aria-live="assertive"
      aria-label={`${personName} 님 뽑기 결과`}
    >
      <p className="font-hand text-2xl text-[#f6f0e0] sm:text-3xl">
        <span className="font-bold">{personName}</span> 님이 뽑습니다
      </p>

      {step < 2 ? (
        <div className="flex flex-col items-center gap-5">
          <BucketArt
            remaining={remaining + 1}
            capacity={capacity}
            shaking={step === 0}
            className="h-44 w-52 drop-shadow-xl sm:h-56 sm:w-64"
          />
          {step === 1 && (
            // 접힌 제비 — 아직 뭐가 적혔는지 모른다
            <div className="animate-rise flex h-16 w-24 items-center justify-center rounded-sm border-2 border-[#3d3423] bg-card shadow-lg">
              <div className="h-[2px] w-14 bg-line" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          {/* 펼쳐진 제비 */}
          <div
            className="animate-unfold flex min-w-[240px] flex-col items-center gap-1 rounded-sm border-[3px] px-10 py-8 shadow-2xl sm:min-w-[300px]"
            style={{ background: color.tint, borderColor: color.ink }}
          >
            <span className="font-hand text-lg" style={{ color: color.ink }}>
              당첨
            </span>
            <span
              className="font-hand text-6xl leading-none font-bold sm:text-7xl"
              style={{ color: color.ink }}
            >
              {groupName}
            </span>
          </div>
          <p className="text-sm text-[#e8e0cd]">
            {remaining > 0 ? `통에 ${remaining}장 남았습니다` : "통이 비었습니다"}
          </p>
        </div>
      )}

      <p className="absolute bottom-8 text-xs text-[#cfc6b0]">
        화면을 누르면 {step < 2 ? "바로 확인" : "닫기"}
      </p>
    </div>
  );
}
