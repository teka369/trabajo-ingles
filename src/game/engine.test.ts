import assert from "node:assert/strict";
import test from "node:test";
import { emptySave } from "./save.ts";
import {
  buildClozeQuestion,
  buildMeaningQuestion,
  deckReady,
  defaultDeck,
  extractWords,
  levelFromXp,
  settleRun,
  tryAdd,
} from "./engine.ts";

const SAMPLE =
  "After a long winter, the garden found freedom and quiet happiness. She learned to believe in herself, to grow strong, and to celebrate every small flower. Confidence and love made her heart feel independent and beautiful.";

test("default deck has the original garden words and real translations", () => {
  const deck = defaultDeck();
  assert.equal(deck.length, 15);
  assert.equal(deck[0]?.word, "flowers");
  assert.equal(deck.find((item) => item.word === "believe")?.translation, "creer");
  assert.equal(deck.find((item) => item.word === "beautiful")?.translation, "hermoso");
  assert.equal(deck.find((item) => item.word === "myself")?.translation, "yo mismo");
  assert.ok(deckReady(deck));
  assert.ok(deck.every((item) => item.cloze.includes("______")));
});

test("extracts useful words and drops function words", () => {
  const result = extractWords(SAMPLE);
  const words = result.items.map((item) => item.word);
  assert.ok(words.length >= 8 && words.length <= 15);
  for (const kept of ["freedom", "happiness", "believe", "strong", "beautiful", "love", "heart"]) {
    assert.ok(words.includes(kept), kept);
  }
  for (const dropped of ["the", "and", "to", "she", "after"]) {
    assert.equal(words.includes(dropped), false);
  }
  assert.equal(result.items.find((item) => item.word === "freedom")?.translation, "libertad");
});

test("empty text falls back to the original bank", () => {
  const result = extractWords("   ");
  assert.equal(result.padded, false);
  assert.equal(result.items.length, 15);
  assert.equal(result.items[0]?.word, "flowers");
});

test("unknown words stay blank instead of inventing a translation", () => {
  const result = extractWords("The xylophone rested near the ancient garden after sunset hours.");
  const odd = result.items.find((item) => item.word === "xylophone");
  assert.ok(odd);
  assert.equal(odd?.translation, "");
  assert.equal(odd?.needsReview, true);
  assert.ok(result.items.length >= 8);
});

test("meaning questions keep one correct choice among three unique options", () => {
  const deck = defaultDeck();
  for (let i = 0; i < 20; i++) {
    const question = buildMeaningQuestion(deck[i % deck.length]!, deck);
    assert.equal(question.choices.length, 3);
    assert.ok(question.choices.includes(question.answer));
    assert.equal(new Set(question.choices.map((choice) => choice.toLowerCase())).size, 3);
    const cloze = buildClozeQuestion(deck[i % deck.length]!, deck, 4);
    assert.equal(cloze.choices.length, 4);
    assert.ok(cloze.choices.includes(cloze.answer));
  }
});

test("levels, deck limits and rewards", () => {
  assert.equal(levelFromXp(0).level, 1);
  assert.equal(levelFromXp(99).level, 1);
  assert.equal(levelFromXp(100).level, 2);
  const base = emptySave();
  const settled = settleRun(base, {
    mode: "dash",
    score: 900,
    correct: 8,
    wrong: 0,
    bestCombo: 6,
    win: true,
    words: ["grow", "believe"],
    title: "t",
    detail: "d",
  });
  assert.ok(settled.xpGain > 0);
  assert.ok(settled.newBadges.includes("first-bloom"));
  assert.ok(settled.newBadges.includes("streak-5"));
  assert.ok(settled.newBadges.includes("perfect-dash"));
  assert.ok(settled.meta.mastered.includes("grow"));
  const added = tryAdd(defaultDeck(), "river", "río");
  assert.ok(added.error);
  const removed = defaultDeck().slice(0, 14);
  const custom = tryAdd(removed, "river", "");
  assert.equal(custom.error, undefined);
  assert.equal(custom.items.at(-1)?.translation, "río");
});
