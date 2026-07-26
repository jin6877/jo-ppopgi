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
        const allocated = tally([...state.log.map((l) => l.groupId), ...state.bucket]);
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

      if (!state.started) return { ...state, people };

      // 뽑기 중 제외: 이미 뽑았으면 그 제비를 통에 돌려놓지 않고 없앤다(자리 하나가 사라진 것),
      // 아직 안 뽑았으면 통에서 아무 제비나 한 장 뺀다.
      if (target.groupId) {
        return { ...state, people, log: state.log.filter((l) => l.personId !== action.id) };
      }
      const bucket = [...state.bucket];
      if (bucket.length > 0) bucket.splice(randInt(bucket.length), 1);
      return { ...state, people, bucket };
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
      return {
        ...state,
        bucket,
        log: state.log.slice(0, -1),
        people: state.people.map((p) => (p.id === last.personId ? { ...p, groupId: null } : p)),
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
        people: state.people.map((p) => ({ ...p, groupId: null })),
      };

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
