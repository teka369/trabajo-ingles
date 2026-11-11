export type Pos = "noun" | "verb" | "adj" | "adv" | "pronoun" | "other";

export type VocabItem = {
  id: string;
  word: string;
  translation: string;
  pos: Pos;
  example: string;
  cloze: string;
  hint: string;
  needsReview: boolean;
  fromGarden: boolean;
};

export type ModeId = "dash" | "match" | "sentence" | "boss" | "class";

export type RunStats = {
  mode: ModeId;
  score: number;
  correct: number;
  wrong: number;
  bestCombo: number;
  win: boolean;
  words: string[];
  title: string;
  detail: string;
};

export type Question = {
  key: string;
  kind: "meaning" | "reverse" | "cloze";
  kicker: string;
  prompt: string;
  choices: string[];
  answer: string;
  explain: string;
  hint: string;
  word: string;
  capitalize: boolean;
};

export type SaveData = {
  version: 1;
  xp: number;
  best: number;
  badges: string[];
  mastered: string[];
  muted: boolean;
  deck: VocabItem[];
};

export type Badge = {
  id: string;
  name: string;
  desc: string;
};
