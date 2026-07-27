"use client";

import { useEffect, useReducer, useRef } from "react";
import { buildBucket, randInt, slipForLatecomer, tally } from "./draw";
import { MAX_GROUPS } from "./palette";

export type Group = { id: string; name: string };
export type Person = { id: string; name: string; groupId: string | null };
export type DrawLog = { personId: string; groupId: string };

export type AppState = {
  people: Person[];
  groups: Group[];
  /** 통에 남은 제비(조 id). 맨 뒤에서 한 장씩 꺼낸다. */
  bucket: string[];
  log: DrawLog[];
  /** 통을 채웠는가 = 뽑기 시작 여부 */
  started: boolean;
  /** 조 id → 조장으로 뽑힌 사람 id. 조 편성이 바뀌면 그 조의 조장은 무효가 된다. */
  leaders: Record<string, string>;
  muted: boolean;
  seq: number;
};

const DEFAULT_GROUP_COUNT = 4; // 원래 하던 방식이 1~4 였다

export const initialState: AppState = {
  people: [],
  groups: Array.from({ length: DEFAULT_GROUP_COUNT }, (_, i) => ({
    id: `g${i + 1}`,
    name: `${i + 1}조`,
  })),
  bucket: [],
  log: [],
  started: false,
  leaders: {},
  muted: false,
  seq: 1,
};

export type Action =
  | { type: "hydrate"; state: AppState }
  | { type: "addPeople"; names: string[] }
  | { type: "removePerson"; id: string }
  | { type: "renameGroup"; id: string; name: string }
  | { type: "setGroupCount"; count: number }
  | { type: "start" }
  | { type: "draw"; personId: string }
  | { type: "undo" }
  | { type: "redraw" }
  | { type: "movePerson"; personId: string; toGroupId: string }
  | { type: "swapPeople"; aId: string; bId: string }
  | { type: "pickLeaders" }
  | { type: "backToSetup" }
  | { type: "toggleMute" }
  | { type: "resetAll" };

/** 이름 정리: 앞뒤 공백 제거 + 빈 값/중복 제거(대소문자·공백 무시). */
function cleanNames(raw: string[], existing: readonly Person[]): string[] {
  const seen = new Set(existing.map((p) => p.name.replace(/\s+/g, "").toLowerCase()));
  const out: string[] = [];
  for (const r of raw) {
    const name = r.trim().replace(/\s+/g, " ").slice(0, 20);
    if (!name) continue;
    const key = name.replace(/\s+/g, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** 조를 옮겼거나 명단에서 빠진 조장은 무효 — 그 조는 조장 없음으로 되돌린다. */
function pruneLeaders(people: Person[], leaders: Record<string, string>): Record<string, string> {
  const kept: Record<string, string> = {};
  for (const [groupId, personId] of Object.entries(leaders ?? {})) {
    const p = people.find((x) => x.id === personId);
    if (p && p.groupId === groupId) kept[groupId] = personId;
  }
  return kept;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return action.state;

    case "addPeople": {
      const names = cleanNames(action.names, state.people);
      if (names.length === 0) return state;

      let seq = state.seq;
      const added: Person[] = names.map((name) => ({ id: `p${seq++}`, name, groupId: null }));

      // 뽑는 도중이면 제비도 그만큼 통에 더 넣는다 (지각생 합류)
      let bucket = state.bucket;
      if (state.started) {
        const groupIds = state.groups.map((g) => g.id);
        // 이미 확정된 자리 = 배정된 사람 + 통에 남은 제비.
        // (뽑기 기록이 아니라 '현재 배치' 를 세야 손으로 옮긴 뒤에도 계산이 맞는다)
        const allocated = tally([
          ...state.people.flatMap((p) => (p.groupId ? [p.groupId] : [])),
          ...state.bucket,
        ]);
        const next = [...bucket];
        let total = state.people.length;
        for (let i = 0; i < added.length; i++) {
          total += 1;
          const slip = slipForLatecomer(allocated, groupIds, total);
          allocated[slip] = (allocated[slip] ?? 0) + 1;
          next.splice(randInt(next.length + 1), 0, slip); // 아무 데나 끼워 넣기
        }
        bucket = next;
      }

      return { ...state, people: [...state.people, ...added], bucket, seq };
    }

    case "removePerson": {
      const target = state.people.find((p) => p.id === action.id);
      if (!target) return state;
      const people = state.people.filter((p) => p.id !== action.id);

      const leaders = pruneLeaders(people, state.leaders);
      if (!state.started) return { ...state, people, leaders };

      // 뽑기 중 제외: 이미 뽑았으면 그 제비를 통에 돌려놓지 않고 없앤다(자리 하나가 사라진 것),
      // 아직 안 뽑았으면 통에서 아무 제비나 한 장 뺀다.
      if (target.groupId) {
        return {
          ...state,
          people,
          leaders,
          log: state.log.filter((l) => l.personId !== action.id),
        };
      }
      const bucket = [...state.bucket];
      if (bucket.length > 0) bucket.splice(randInt(bucket.length), 1);
      return { ...state, people, bucket, leaders };
    }

    case "renameGroup":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.id ? { ...g, name: action.name.slice(0, 12) } : g,
        ),
      };

    case "setGroupCount": {
      if (state.started) return state;
      const count = Math.max(2, Math.min(MAX_GROUPS, action.count));
      const groups: Group[] = Array.from({ length: count }, (_, i) => {
        const prev = state.groups[i];
        return prev ?? { id: `g${i + 1}`, name: `${i + 1}조` };
      });
      return { ...state, groups };
    }

    case "start": {
      if (state.people.length === 0) return state;
      return {
        ...state,
        started: true,
        log: [],
        leaders: {},
        people: state.people.map((p) => ({ ...p, groupId: null })),
        bucket: buildBucket(
          state.people.length,
          state.groups.map((g) => g.id),
        ),
      };
    }

    case "draw": {
      const person = state.people.find((p) => p.id === action.personId);
      if (!person || person.groupId) return state;
      const slip = state.bucket[state.bucket.length - 1];
      if (!slip) return state;
      return {
        ...state,
        bucket: state.bucket.slice(0, -1),
        people: state.people.map((p) => (p.id === action.personId ? { ...p, groupId: slip } : p)),
        log: [...state.log, { personId: action.personId, groupId: slip }],
      };
    }

    case "undo": {
      const last = state.log[state.log.length - 1];
      if (!last) return state;
      const bucket = [...state.bucket];
      bucket.splice(randInt(bucket.length + 1), 0, last.groupId); // 통에 도로 넣고 섞이게
      const people = state.people.map((p) =>
        p.id === last.personId ? { ...p, groupId: null } : p,
      );
      return {
        ...state,
        bucket,
        people,
        log: state.log.slice(0, -1),
        leaders: pruneLeaders(people, state.leaders),
      };
    }

    case "redraw":
      return reducer({ ...state, started: false }, { type: "start" });

    case "backToSetup":
      return {
        ...state,
        started: false,
        bucket: [],
        log: [],
        leaders: {},
        people: state.people.map((p) => ({ ...p, groupId: null })),
      };

    // 뽑기가 끝난 뒤 손으로 밸런스 맞추기 — 사람을 다른 조로 옮긴다
    case "movePerson": {
      const person = state.people.find((p) => p.id === action.personId);
      if (!person || person.groupId === action.toGroupId) return state;
      if (!state.groups.some((g) => g.id === action.toGroupId)) return state;
      const people = state.people.map((p) =>
        p.id === action.personId ? { ...p, groupId: action.toGroupId } : p,
      );
      return { ...state, people, leaders: pruneLeaders(people, state.leaders) };
    }

    // 두 사람 자리 바꾸기 — 조 인원은 그대로 두고 사람만 맞바꾼다
    case "swapPeople": {
      const a = state.people.find((p) => p.id === action.aId);
      const b = state.people.find((p) => p.id === action.bId);
      if (!a || !b || a.id === b.id || a.groupId === b.groupId) return state;
      const people = state.people.map((p) => {
        if (p.id === a.id) return { ...p, groupId: b.groupId };
        if (p.id === b.id) return { ...p, groupId: a.groupId };
        return p;
      });
      return { ...state, people, leaders: pruneLeaders(people, state.leaders) };
    }

    // 조별로 한 명씩 조장 뽑기 — 누를 때마다 새로 뽑는다
    case "pickLeaders": {
      const leaders: Record<string, string> = {};
      for (const g of state.groups) {
        const members = state.people.filter((p) => p.groupId === g.id);
        if (members.length === 0) continue; // 빈 조는 조장도 없다
        leaders[g.id] = members[randInt(members.length)].id;
      }
      return { ...state, leaders };
    }

    case "toggleMute":
      return { ...state, muted: !state.muted };

    case "resetAll":
      return { ...initialState, muted: state.muted }; // 소리 설정은 유지

    default:
      return state;
  }
}

const STORAGE_KEY = "jo-ppopgi:v1";

function isValid(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<AppState>;
  return (
    Array.isArray(s.people) &&
    Array.isArray(s.groups) &&
    Array.isArray(s.bucket) &&
    Array.isArray(s.log) &&
    typeof s.seq === "number"
  );
}

/** 새로고침해도 진행 중인 뽑기가 날아가지 않게 localStorage 에 통째로 저장. */
export function useAppState() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isValid(parsed)) dispatch({ type: "hydrate", state: { ...initialState, ...parsed } });
      }
    } catch {
      // 손상된 저장값은 조용히 무시하고 새 판으로 간다
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 용량 초과 등은 무시 (저장 실패해도 앱은 돌아간다)
    }
  }, [state]);

  return [state, dispatch] as const;
}
