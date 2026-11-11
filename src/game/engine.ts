import { BADGES, DECOY_EN, DECOY_ES, DEFAULT_ORDER, LEVEL_STEPS, RICH } from "./content.ts";
import { DICT, type DictEntry } from "./dictionary.ts";
import type { Pos, Question, RunStats, SaveData, VocabItem } from "./types";

const STOP = new Set(
  `a an the and or but if so because as of to in on at for from with by about into over after before between through during without within
i you he she it we they me him her us them my your his its our their this that these those
is am are was were be been being have has had do does did will would can could should may might must shall
not no nor yes very just also too than then there here when where what who which how why
some any all each every both few more most other such same up down out off again further once
still even much many well let put back way ways thing things something anything everything nothing
going went come came take took know knew say said get got make made go goes gone like really
dont cant wont im its thats shes hes were theyre ive isnt arent wasnt werent didnt couldnt shouldnt wouldnt lets ill youll well theyll id
left right`.split(/\s+/),
);

const CONTRACTIONS: Record<string, string> = {
  "don't": "do not",
  "can't": "cannot",
  "won't": "will not",
  "i'm": "i am",
  "it's": "it is",
  "that's": "that is",
  "she's": "she is",
  "he's": "he is",
  "we're": "we are",
  "they're": "they are",
  "i've": "i have",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "didn't": "did not",
  "couldn't": "could not",
  "shouldn't": "should not",
  "wouldn't": "would not",
  "let's": "let us",
  "i'll": "i will",
  "you'll": "you will",
  "we'll": "we will",
  "they'll": "they will",
  "i'd": "i would",
};

export function shuffle<T>(list: readonly T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

export function displayWord(word: string) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function levelFromXp(xp: number) {
  let level = 1;
  for (let i = 1; i < LEVEL_STEPS.length; i++) {
    if (xp >= LEVEL_STEPS[i]!) level = i + 1;
  }
  const prev = LEVEL_STEPS[level - 1] ?? 0;
  const next = LEVEL_STEPS[level] ?? prev + 800;
  return { level, prev, next, into: Math.max(0, xp - prev), span: Math.max(1, next - prev) };
}

export function lookup(word: string): { entry: DictEntry; review: boolean } | null {
  const exact = DICT[word];
  if (exact) return { entry: exact, review: false };
  const candidates: string[] = [];
  if (word.endsWith("ies") && word.length > 4) candidates.push(`${word.slice(0, -3)}y`);
  if (word.endsWith("es") && word.length > 4) candidates.push(word.slice(0, -2));
  if (word.endsWith("s") && word.length > 3) candidates.push(word.slice(0, -1));
  if (word.endsWith("ied") && word.length > 4) candidates.push(`${word.slice(0, -3)}y`);
  if (word.endsWith("ed") && word.length > 4) {
    const base = word.slice(0, -2);
    candidates.push(base, word.slice(0, -1));
    if (base.length > 2 && base.at(-1) === base.at(-2)) candidates.push(base.slice(0, -1));
  }
  if (word.endsWith("ing") && word.length > 5) {
    const base = word.slice(0, -3);
    candidates.push(base, `${base}e`);
    if (base.length > 2 && base.at(-1) === base.at(-2)) candidates.push(base.slice(0, -1));
  }
  for (const c of candidates) {
    const hit = DICT[c];
    if (hit) return { entry: hit, review: true };
  }
  return null;
}

function genericCloze(word: string, translation: string) {
  return {
    example: `In her notebook she wrote the word ${word}.`,
    cloze: "In her notebook she wrote the word ______.",
    hint: translation ? `Significa «${translation}».` : "Traduce la palabra antes de jugar.",
  };
}

export function makeItem(
  word: string,
  entry: DictEntry | null,
  review: boolean,
  fromGarden: boolean,
  translationOverride?: string,
): VocabItem {
  const translation = (translationOverride ?? entry?.es ?? "").replace(/\s+/g, " ").trim();
  const rich = RICH[word];
  const generated = genericCloze(word, translation);
  const pos: Pos = entry?.pos ?? "other";
  return {
    id: word,
    word,
    translation,
    pos,
    example: rich?.example ?? generated.example,
    cloze: rich?.cloze ?? generated.cloze,
    hint: rich?.hint ?? generated.hint,
    needsReview: review || !translation,
    fromGarden,
  };
}

export function defaultDeck(): VocabItem[] {
  return DEFAULT_ORDER.map((word) => {
    const found = lookup(word);
    return makeItem(word, found?.entry ?? null, false, false);
  });
}

export function tokenize(text: string): string[] {
  const raw = text.replace(/[’]/g, "'").toLowerCase();
  const bits = raw.match(/[a-z']+/g) ?? [];
  const out: string[] = [];
  for (const bit of bits) {
    const expanded = CONTRACTIONS[bit];
    if (expanded) out.push(...expanded.split(" "));
    else {
      const clean = bit.replace(/'s$/g, "").replace(/'/g, "");
      if (clean) out.push(clean);
    }
  }
  return out;
}

export type ExtractResult = {
  items: VocabItem[];
  padded: boolean;
  unknown: number;
};

export function extractWords(text: string): ExtractResult {
  const slice = text.trim().slice(0, 1500);
  if (!slice) {
    return { items: defaultDeck(), padded: false, unknown: 0 };
  }
  const counts = new Map<string, number>();
  for (const token of tokenize(slice)) {
    if (token.length < 3 || token.length > 24) continue;
    if (STOP.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  const ranked = [...counts.entries()]
    .map(([word, freq]) => {
      const found = lookup(word);
      const known = Boolean(found);
      if (!known && word.length < 5) return null;
      const score = (known ? 10 : 2) + Math.min(word.length, 12) * 0.35 + Math.min(freq, 3) + (RICH[word] ? 5 : 0);
      return { word, score, found };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));

  const picked = ranked.slice(0, 15);
  const items = picked.map((row) => makeItem(row.word, row.found?.entry ?? null, row.found?.review ?? true, false));
  let padded = false;
  if (items.length < 8) {
    padded = true;
    for (const word of DEFAULT_ORDER) {
      if (items.length >= 8) break;
      if (items.some((item) => item.word === word)) continue;
      const found = lookup(word);
      items.push(makeItem(word, found?.entry ?? null, false, true));
    }
  }
  const unknown = items.filter((item) => !item.translation).length;
  return { items, padded, unknown };
}

export function tryAdd(items: VocabItem[], wordRaw: string, translation: string): { items: VocabItem[]; error?: string } {
  const word = tokenize(wordRaw)[0] ?? "";
  if (!word || word.length < 3) return { items, error: "Escribe una palabra en inglés de al menos 3 letras." };
  if (STOP.has(word)) return { items, error: "Esa palabra es demasiado común. Elige otra." };
  if (items.some((item) => item.word === word)) return { items, error: "Esa palabra ya está en el mazo." };
  if (items.length >= 15) return { items, error: "El mazo acepta 15 palabras como máximo." };
  const found = lookup(word);
  const typed = translation.replace(/\s+/g, " ").trim().slice(0, 48);
  const item = makeItem(word, found?.entry ?? null, found?.review ?? !typed, false, typed || found?.entry.es);
  if (typed) item.needsReview = false;
  return { items: [...items, item] };
}

export function deckReady(items: VocabItem[]) {
  return items.length >= 8 && items.length <= 15 && items.every((item) => item.translation.trim().length > 0);
}

function pickN(correct: string, pool: string[], decoys: string[], n: number) {
  const used = new Set<string>([correct.toLowerCase()]);
  const out = [correct];
  for (const candidate of shuffle([...pool, ...decoys])) {
    const key = candidate.trim().toLowerCase();
    if (!key || used.has(key)) continue;
    used.add(key);
    out.push(candidate.trim());
    if (out.length === n) break;
  }
  return out;
}

let q = 0;
function nextKey() {
  q += 1;
  return `q${q}`;
}

export function buildMeaningQuestion(item: VocabItem, deck: VocabItem[], reverse = false): Question {
  const correct = reverse ? item.word : item.translation;
  const pool = deck
    .filter((other) => other.id !== item.id)
    .map((other) => (reverse ? other.word : other.translation));
  const choices = shuffle(pickN(correct, pool, reverse ? DECOY_EN : DECOY_ES, 3));
  return {
    key: nextKey(),
    kind: reverse ? "reverse" : "meaning",
    kicker: reverse ? "¿Cuál es la palabra en inglés?" : "¿Qué significa?",
    prompt: reverse ? item.translation : displayWord(item.word),
    choices,
    answer: correct,
    explain: `«${item.word}» significa «${item.translation}».`,
    hint: item.hint,
    word: item.word,
    capitalize: false,
  };
}

export function buildClozeQuestion(item: VocabItem, deck: VocabItem[], choiceCount = 4): Question {
  const pool = deck.filter((other) => other.word !== item.word).map((other) => other.word);
  const choices = shuffle(pickN(item.word, pool, DECOY_EN, choiceCount));
  const cloze = item.cloze;
  return {
    key: nextKey(),
    kind: "cloze",
    kicker: "Completa la oración",
    prompt: cloze,
    choices,
    answer: item.word,
    explain: `«${displayWord(item.word)}» significa «${item.translation}». ${item.example}`,
    hint: item.hint,
    word: item.word,
    capitalize: cloze.trimStart().startsWith("______"),
  };
}

export function buildBossQuestion(item: VocabItem, deck: VocabItem[], round: number): Question {
  if (round >= 7) return buildClozeQuestion(item, deck, 3);
  if (round >= 3) return buildMeaningQuestion(item, deck, true);
  return buildMeaningQuestion(item, deck, false);
}

export function bossSeconds(round: number) {
  return Math.max(5, 10 - round * 0.45);
}

export function comboMultiplier(combo: number) {
  return 1 + Math.max(0, combo - 1) * 0.25;
}

export function dashAward(comboAfterHit: number, ms: number) {
  const speed = ms < 1400 ? 40 : ms < 2800 ? 20 : 0;
  return Math.round(100 * comboMultiplier(comboAfterHit) + speed);
}

export const DASH_PENALTY = 40;
export const DASH_SECONDS = 45;

export function pullItem(deck: VocabItem[], bag: VocabItem[], lastWord: string) {
  if (bag.length === 0) {
    const reshuffled = shuffle(deck);
    bag.push(...reshuffled);
    if (bag.length > 1 && bag[bag.length - 1]?.word === lastWord) {
      const moved = bag.pop()!;
      bag.unshift(moved);
    }
  }
  return bag.pop() ?? deck[0]!;
}

export function choiceLabel(choice: string, capitalize: boolean) {
  if (!capitalize) return choice;
  return displayWord(choice);
}

export function xpForScore(score: number) {
  return Math.min(400, Math.max(6, Math.round(score / 15)));
}

export function settleRun(prev: SaveData, run: RunStats): { meta: SaveData; xpGain: number; newBadges: string[] } {
  const xpGain = xpForScore(run.score);
  const xp = prev.xp + xpGain;
  const mastered = [...prev.mastered];
  for (const word of run.words) {
    if (!mastered.includes(word)) mastered.push(word);
  }
  const earned = new Set(prev.badges);
  const fresh: string[] = [];
  const grant = (id: string) => {
    if (earned.has(id)) return;
    earned.add(id);
    fresh.push(id);
  };
  grant("first-bloom");
  if (run.bestCombo >= 5) grant("streak-5");
  if (run.mode === "dash" && run.wrong === 0 && run.correct >= 5) grant("perfect-dash");
  if (run.mode === "match" && run.wrong === 0 && run.win) grant("match-clean");
  if (run.mode === "boss" && run.win) grant("boss");
  if (run.mode === "class" && run.win) grant("class-champ");
  if (mastered.length >= 10) grant("wordsmith");
  if (levelFromXp(xp).level >= 3) grant("level-3");
  return {
    xpGain,
    newBadges: fresh,
    meta: {
      ...prev,
      xp,
      best: Math.max(prev.best, run.score),
      badges: [...earned],
      mastered,
    },
  };
}

const BADGE_LOOKUP = new Map(BADGES.map((badge) => [badge.id, badge]));

export function badgeById(id: string) {
  return BADGE_LOOKUP.get(id);
}
