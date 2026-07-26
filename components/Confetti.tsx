"use client";

import { useState } from "react";
import { GROUP_COLORS } from "@/lib/palette";

// 종이 조각 — 조 색을 그대로 쓴다. 3초쯤 뒤 부모가 언마운트한다.
const COUNT = 44;

export function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      drift: Math.round((Math.random() - 0.5) * 220),
      spin: Math.round(360 + Math.random() * 720),
      dur: 2.2 + Math.random() * 1.6,
      delay: Math.random() * 0.9,
      w: 6 + Math.random() * 6,
      h: 9 + Math.random() * 8,
      color: GROUP_COLORS[i % GROUP_COLORS.length].ink,
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
