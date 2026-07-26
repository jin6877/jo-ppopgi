// 제비뽑기 산수 — "1~4 를 사람 수만큼 종이에 적어 통에 넣고 한 장씩 뽑는다" 를 그대로 옮긴 것.
// 순수 랜덤 배정과 달리 조 인원이 자동으로 균등해지고, 남은 제비가 줄수록 결과가 좁혀진다.

/** 암호학적 난수(가능하면). 서버 렌더 등 불가한 환경에선 Math.random 로 폴백. */
function random(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 2 ** 32;
  }
  return Math.random();
}

export function randInt(maxExclusive: number): number {
  return Math.floor(random() * maxExclusive);
}

/** Fisher–Yates. 원본은 건드리지 않는다. */
export function shuffle<T>(input: readonly T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function tally(slips: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of slips) out[s] = (out[s] ?? 0) + 1;
  return out;
}

/**
 * 통 채우기: 사람 수만큼 제비를 만들되 조별로 최대한 고르게.
 * 나머지(N % 조수) 한 장씩은 무작위 조가 가져간다 — 그래서 "누가 한 명 더" 도 뽑기 운.
 */
export function buildBucket(peopleCount: number, groupIds: readonly string[]): string[] {
  if (groupIds.length === 0 || peopleCount <= 0) return [];
  const base = Math.floor(peopleCount / groupIds.length);
  const rest = peopleCount % groupIds.length;
  const lucky = new Set(shuffle(groupIds).slice(0, rest));

  const slips: string[] = [];
  for (const id of groupIds) {
    const n = base + (lucky.has(id) ? 1 : 0);
    for (let i = 0; i < n; i++) slips.push(id);
  }
  return shuffle(slips);
}

/**
 * 뽑는 도중 늦게 온 사람 한 명 추가 — 제비도 한 장 더 넣어야 한다.
 * 이미 확정된 인원(뽑힌 사람 + 통에 남은 제비)을 세서 아직 여유가 있는 조를 고른다.
 */
export function slipForLatecomer(
  allocated: Record<string, number>,
  groupIds: readonly string[],
  newTotal: number,
): string {
  const base = Math.floor(newTotal / groupIds.length);
  const under = groupIds.filter((id) => (allocated[id] ?? 0) < base);
  const room = under.length ? under : groupIds.filter((id) => (allocated[id] ?? 0) < base + 1);
  const pool = room.length ? room : [...groupIds];
  return pool[randInt(pool.length)];
}

/** "12명 → 각 조 3명" / "11명 → 3명 3개 조 · 2명 1개 조" 같은 미리보기 문구. */
export function planSummary(peopleCount: number, groupCount: number): string {
  if (groupCount <= 0 || peopleCount <= 0) return "";
  const base = Math.floor(peopleCount / groupCount);
  const rest = peopleCount % groupCount;
  if (rest === 0) return `각 조 ${base}명씩`;
  if (base === 0) return `${groupCount - rest}개 조는 빈 조가 됩니다`;
  return `${base + 1}명 ${rest}개 조 · ${base}명 ${groupCount - rest}개 조`;
}
