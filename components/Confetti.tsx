"use client";

import { useState } from "react";
import { GROUP_COLORS } from "@/lib/palette";

// 종이 조각 — 기본은 조 색. 조장 축하용으로는 금색 팔레트를 넘겨 쓴다.
// 부모가 몇 초 뒤 언마운트한다.
type Props = {
  colors?: string[];
  count?: number;
  /** 낙하 시간 배수 — 짧게 터뜨리고 싶을 때 1보다 작게 */
  speed?: number;
};

export const GOLD = ["#d9a441", "#e8c46a", "#c98b2e", "#f0dfae", "#b4472f"];

export function Confetti({
  colors = GROUP_COLORS.map((c) => c.ink),
  count = 44,
  speed = 1,
}: Props) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      drift: Math.round((Math.random() - 0.5) * 220),
      spin: Math.round(360 + Math.random() * 720),
      dur: (2.2 + Math.random() * 1.6) * speed,
      delay: Math.random() * 0.9 * speed,
      w: 6 + Math.random() * 6,
      h: 9 + Math.random() * 8,
      color: colors[i % colors.length],
    })),
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece absolute top-0 block"
          style={
            {
              left: `${p.left}%`,
              width: p.w,
              height: p.h,
              background: p.color,
              "--drift": `${p.drift}px`,
              "--spin": `${p.spin}deg`,
              "--dur": `${p.dur}s`,
              "--delay": `${p.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
