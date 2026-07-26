"use client";

type Props = {
  /** 통에 남은 제비 수 */
  remaining: number;
  /** 처음에 넣은 제비 수 (= 총 인원) */
  capacity: number;
  shaking?: boolean;
  className?: string;
};

// 삐죽 나온 제비 5장의 자리 — 손으로 대충 꽂아둔 것처럼 각도·높이를 다 다르게
const SLIPS = [
  { x: 62, y: 30, rot: -15 },
  { x: 80, y: 22, rot: -5 },
  { x: 99, y: 26, rot: 4 },
  { x: 117, y: 20, rot: 11 },
  { x: 134, y: 32, rot: 19 },
];

export function BucketArt({ remaining, capacity, shaking = false, className = "" }: Props) {
  const ratio = capacity > 0 ? remaining / capacity : 0;
  const visible = remaining === 0 ? 0 : Math.max(1, Math.ceil(ratio * SLIPS.length));

  return (
    <svg
      viewBox="0 0 200 168"
      className={`${className} ${shaking ? "animate-shake" : ""}`}
      role="img"
      aria-label={`제비통, 남은 제비 ${remaining}장`}
    >
      {/* 바닥 그림자 */}
      <ellipse cx="100" cy="152" rx="52" ry="8" fill="rgba(90,76,48,0.16)" />

      {/* 통 안쪽(어두움) + 뒤쪽 테두리 */}
      <ellipse cx="100" cy="58" rx="58" ry="13" fill="#7a6440" />
      <ellipse cx="100" cy="58" rx="58" ry="13" fill="none" stroke="#3d3423" strokeWidth="2.5" />

      {/* 접힌 제비들 — 통 입구 뒤에서 삐죽 */}
      {SLIPS.slice(0, visible).map((s, i) => (
        <g key={i} transform={`rotate(${s.rot} ${s.x} ${s.y + 20})`}>
          <rect
            x={s.x - 8}
            y={s.y}
            width="16"
            height="34"
            rx="2"
            fill="#fffdf6"
            stroke="#b9ab8d"
            strokeWidth="1.6"
          />
          <line
            x1={s.x - 5}
            y1={s.y + 11}
            x2={s.x + 5}
            y2={s.y + 11}
            stroke="#d8cdb4"
            strokeWidth="1.4"
          />
        </g>
      ))}

      {/* 통 몸통 */}
      <path
        d="M42,58 L158,58 L147,142 Q100,152 53,142 Z"
        fill="#d8c49b"
        stroke="#3d3423"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* 앞쪽 테두리(입술) — 제비 아랫부분을 가려 '통에서 나온' 느낌을 만든다 */}
      <path d="M42,58 C42,74 158,74 158,58 Z" fill="#e2d0aa" stroke="none" />
      <path
        d="M42,58 C42,74 158,74 158,58"
        fill="none"
        stroke="#3d3423"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* 나뭇결 두 줄 */}
      <path d="M50,96 Q100,103 150,96" fill="none" stroke="#c0aa7c" strokeWidth="2" />
      <path d="M52,116 Q100,123 148,116" fill="none" stroke="#c0aa7c" strokeWidth="2" />

      {/* 손으로 붙인 라벨 */}
      <g transform="rotate(-3 100 112)">
        <rect
          x="66"
          y="96"
          width="68"
          height="30"
          rx="2"
          fill="#fffdf6"
          stroke="#3d3423"
          strokeWidth="2"
        />
        <text
          x="100"
          y="117"
          textAnchor="middle"
          fontFamily="var(--font-hand)"
          fontSize="21"
          fontWeight="700"
          fill="#262218"
        >
          제비통
        </text>
      </g>
    </svg>
  );
}
