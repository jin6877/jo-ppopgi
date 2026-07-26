// 조 색 팔레트 — 크레용/색연필 느낌의 채도 낮은 10색.
// 종이(#f2ede1) 위에서 서로 구분되면서 튀지 않는 톤만 골랐다. 형광·네온 금지.
export type GroupColor = {
  ink: string; // 글자·테두리·헤더
  soft: string; // 카드 배경
  tint: string; // 제비 종이 살짝 물든 색
};

export const GROUP_COLORS: GroupColor[] = [
  { ink: "#b4472f", soft: "#f7e3db", tint: "#fdf1ea" }, // 벽돌
  { ink: "#2f6f66", soft: "#ddecea", tint: "#eef7f5" }, // 청록
  { ink: "#a8802a", soft: "#f5ecd3", tint: "#fdf6e6" }, // 겨자
  { ink: "#3f5b93", soft: "#e0e6f3", tint: "#f0f3fb" }, // 남색
  { ink: "#8a4a6b", soft: "#f2e1eb", tint: "#fbeff5" }, // 자두
  { ink: "#5d7a35", soft: "#e7efda", tint: "#f4f8ec" }, // 이끼
  { ink: "#a75d2b", soft: "#f7e7d6", tint: "#fdf3e9" }, // 황토
  { ink: "#566274", soft: "#e4e8ed", tint: "#f2f4f7" }, // 슬레이트
  { ink: "#7a4a30", soft: "#efe2d9", tint: "#faf0ea" }, // 갈색
  { ink: "#42718a", soft: "#deebf1", tint: "#eff6fa" }, // 물빛
];

export const MAX_GROUPS = GROUP_COLORS.length;

export function colorOf(index: number): GroupColor {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}
