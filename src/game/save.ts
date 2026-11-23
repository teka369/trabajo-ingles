import { GARDEN_COMPLETE_XP } from "./content.ts";
import { defaultDeck, emptyCareer } from "./engine.ts";
import type { Career, Pos, SaveData, VocabItem } from "./types";

const KEY = "bloom-rush-v1";
const SESSION_KEY = "bloom-rush-session";

const POS: Pos[] = ["noun", "verb", "adj", "adv", "pronoun", "other"];

function isItem(value: unknown): value is VocabItem {
  if (!value || typeof value !== "object") return false;
  const item = value as VocabItem;
  return (
    typeof item.id === "string" &&
    typeof item.word === "string" &&
    typeof item.translation === "string" &&
    POS.includes(item.pos) &&
    typeof item.example === "string" &&
    typeof item.cloze === "string" &&
    typeof item.hint === "string" &&
    typeof item.needsReview === "boolean" &&
    typeof item.fromGarden === "boolean"
  );
}

function readCount(value: unknown) {
  return typeof value === "number" && value >= 0 && Number.isFinite(value) ? Math.floor(value) : 0;
}

function readCareer(value: unknown, xp: number): Career {
  const base = emptyCareer();
  if (!value || typeof value !== "object") {
    if (xp >= GARDEN_COMPLETE_XP) base.finishedAt = Date.now();
    return base;
  }
  const career = value as Partial<Career>;
  const next: Career = {
    startedAt: typeof career.startedAt === "number" ? career.startedAt : null,
    finishedAt: typeof career.finishedAt === "number" ? career.finishedAt : null,
    correct: readCount(career.correct),
    wrong: readCount(career.wrong),
    runs: readCount(career.runs),
    bestCombo: readCount(career.bestCombo),
  };
  if (xp >= GARDEN_COMPLETE_XP && next.finishedAt == null) next.finishedAt = Date.now();
  return next;
}

export function emptySave(): SaveData {
  return {
    version: 1,
    xp: 0,
    best: 0,
    badges: [],
    mastered: [],
    muted: false,
    deck: defaultDeck(),
    career: emptyCareer(),
  };
}

export function loadSave(): SaveData {
  const base = emptySave();
  if (typeof localStorage === "undefined") return base;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.version !== 1) return base;
    const deck = Array.isArray(parsed.deck) ? parsed.deck.filter(isItem).slice(0, 15) : [];
    const xp = typeof parsed.xp === "number" && parsed.xp >= 0 ? parsed.xp : 0;
    return {
      version: 1,
      xp,
      best: typeof parsed.best === "number" && parsed.best >= 0 ? parsed.best : 0,
      badges: Array.isArray(parsed.badges) ? parsed.badges.filter((id) => typeof id === "string") : [],
      mastered: Array.isArray(parsed.mastered) ? parsed.mastered.filter((id) => typeof id === "string") : [],
      muted: Boolean(parsed.muted),
      deck: deck.length >= 8 ? deck : base.deck,
      career: readCareer(parsed.career, xp),
    };
  } catch {
    return base;
  }
}

export function writeSave(save: SaveData) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(save));
}

export function loadSessionBest() {
  if (typeof sessionStorage === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { best?: number };
    return typeof parsed.best === "number" ? parsed.best : 0;
  } catch {
    return 0;
  }
}

export function writeSessionBest(best: number) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ best }));
}
