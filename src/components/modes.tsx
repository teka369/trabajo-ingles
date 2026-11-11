import { useEffect, useRef, useState } from "react";
import { Flower2, Leaf, Sparkles, Trophy } from "lucide-react";
import { audio } from "@/game/audio";
import {
  DASH_PENALTY,
  DASH_SECONDS,
  bossSeconds,
  buildBossQuestion,
  buildClozeQuestion,
  buildMeaningQuestion,
  choiceLabel,
  comboMultiplier,
  dashAward,
  pullItem,
  shuffle,
} from "@/game/engine";
import { juice } from "@/game/juice";
import type { Question, RunStats, VocabItem } from "@/game/types";
import { useRailTimer } from "@/game/use-timer";
import { ChoiceList, GameButton, PromptText, Stat } from "@/components/ui";
import { cn } from "@/lib/cn";

type ModeProps = {
  deck: VocabItem[];
  paused: boolean;
  onFinish: (stats: RunStats) => void;
};

function useOnce(callback: () => void) {
  const ref = useRef(callback);
  ref.current = callback;
  const fired = useRef(false);
  return () => {
    if (fired.current) return;
    fired.current = true;
    ref.current();
  };
}

function PopScore({ text }: { text: string | null }) {
  if (!text) return null;
  return <span className="float-score pointer-events-none absolute top-0 right-2 font-display text-2xl text-gold">{text}</span>;
}

export function WordDash({ deck, paused, onFinish }: ModeProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [pop, setPop] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const bag = useRef<VocabItem[]>([]);
  const lastWord = useRef("");
  const shownAt = useRef(0);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const bestRef = useRef(0);
  const wordsRef = useRef<string[]>([]);
  const lock = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const remainRef = useRef(DASH_SECONDS);
  const finish = useOnce(() => {
    onFinish({
      mode: "dash",
      score: scoreRef.current,
      correct: correctRef.current,
      wrong: wrongRef.current,
      bestCombo: bestRef.current,
      win: correctRef.current >= 5,
      words: wordsRef.current,
      title: correctRef.current >= 8 ? "El jardín despierta" : "Sprint cerrado",
      detail: `${correctRef.current} aciertos · ${wrongRef.current} fallos · racha ${bestRef.current}`,
    });
  });

  const spawn = () => {
    const item = pullItem(deck, bag.current, lastWord.current);
    lastWord.current = item.word;
    shownAt.current = performance.now();
    lock.current = false;
    setPicked(null);
    setNote("");
    setPop(null);
    setQuestion(buildMeaningQuestion(item, deck));
  };

  useEffect(() => {
    spawn();
    // The deck is fixed for the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRailTimer({
    total: DASH_SECONDS,
    active: !paused && question !== null,
    resetKey: "dash",
    remainRef,
    barRef,
    labelRef,
    onEnd: finish,
  });

  const answer = (choice: string) => {
    if (!question || lock.current || paused) return;
    lock.current = true;
    setPicked(choice);
    const hit = choice === question.answer;
    if (hit) {
      const nextCombo = combo + 1;
      const gain = dashAward(nextCombo, performance.now() - shownAt.current);
      const nextScore = score + gain;
      scoreRef.current = nextScore;
      correctRef.current = correct + 1;
      bestRef.current = Math.max(bestCombo, nextCombo);
      wordsRef.current = [...wordsRef.current, question.word];
      setScore(nextScore);
      setCombo(nextCombo);
      setBestCombo(bestRef.current);
      setCorrect(correct + 1);
      setPop(`+${gain}`);
      setNote(question.explain);
      audio.sfx(nextCombo >= 3 ? "combo" : "ok");
      juice.emit(nextCombo >= 3 ? "bloom" : "ok");
    } else {
      const nextScore = Math.max(0, score - DASH_PENALTY);
      scoreRef.current = nextScore;
      wrongRef.current = wrong + 1;
      setScore(nextScore);
      setCombo(0);
      setWrong(wrong + 1);
      setPop(`-${Math.min(DASH_PENALTY, score)}`);
      setNote(question.explain);
      audio.sfx("bad");
      juice.emit("bad");
    }
    const until = performance.now() + 680;
    const step = (now: number) => {
      if (now < until) {
        requestAnimationFrame(step);
        return;
      }
      spawn();
    };
    requestAnimationFrame(step);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!question || paused) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < question.choices.length) answer(question.choices[index]!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!question) return null;

  return (
    <section className="enter relative mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-widest text-gold uppercase">Word Dash</p>
          <p className="text-sm text-muted">Teclas 1, 2 y 3. La racha multiplica.</p>
        </div>
        <p data-testid="score" className="font-display text-4xl text-fg">
          {score}
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface">
        <div ref={barRef} className="timer-fill h-full w-full" />
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Combo <span className="font-semibold text-gold">x{comboMultiplier(Math.max(combo, 1)).toFixed(2)}</span>
        </span>
        <span ref={labelRef} data-testid="timer">
          {DASH_SECONDS}
        </span>
      </div>
      <div className="panel relative rounded-card px-4 py-8 text-center">
        <PopScore text={pop} />
        <p className="text-sm text-gold">{question.kicker}</p>
        <p data-testid="prompt" className="glow-title mt-2 font-display text-5xl text-fg sm:text-6xl">
          {question.prompt}
        </p>
      </div>
      <ChoiceList
        choices={question.choices}
        answer={question.answer}
        picked={picked}
        capitalize={false}
        onPick={answer}
        renderLabel={(choice) => choice}
      />
      <p className="min-h-6 text-center text-sm text-muted" aria-live="polite">
        {note}
      </p>
    </section>
  );
}

export function BloomMatch({ deck, paused, onFinish }: ModeProps) {
  const [pairs] = useState(() =>
    shuffle(deck)
      .slice(0, Math.min(6, deck.length))
      .map((item) => ({ id: item.id, en: item.word, es: item.translation })),
  );
  const [english] = useState(() => shuffle(pairs));
  const [spanish] = useState(() => shuffle(pairs));
  const [selected, setSelected] = useState<{ side: "en" | "es"; id: string } | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [pop, setPop] = useState<string | null>(null);
  const lock = useRef(false);
  const elapsed = useRef(0);
  const labelRef = useRef<HTMLSpanElement>(null);
  const lastHit = useRef(performance.now());
  const done = useRef(false);
  const scoreRef = useRef(0);
  const wrongRef = useRef(0);

  useEffect(() => {
    if (paused || done.current) return;
    const origin = performance.now() - elapsed.current * 1000;
    let raf = 0;
    const tick = (now: number) => {
      elapsed.current = (now - origin) / 1000;
      if (labelRef.current) labelRef.current.textContent = `${Math.floor(elapsed.current / 60)}:${Math.floor(elapsed.current % 60).toString().padStart(2, "0")}`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  const finish = (nextScore: number, misses: number) => {
    if (done.current) return;
    done.current = true;
    const bonus = Math.max(0, 640 - Math.round(elapsed.current * 8));
    const total = nextScore + bonus;
    onFinish({
      mode: "match",
      score: total,
      correct: pairs.length,
      wrong: misses,
      bestCombo: misses === 0 ? pairs.length : 1,
      win: true,
      words: pairs.map((pair) => pair.en),
      title: "El jardín hizo match",
      detail: `${pairs.length} parejas · bonus de tiempo +${bonus}`,
    });
  };

  const choose = (side: "en" | "es", id: string) => {
    if (paused || lock.current || matched.includes(id)) return;
    if (!selected) {
      setSelected({ side, id });
      return;
    }
    if (selected.side === side) {
      setSelected({ side, id });
      return;
    }
    if (selected.id === id) {
      const gain = 160 + (performance.now() - lastHit.current < 3500 ? 40 : 0);
      const next = score + gain;
      scoreRef.current = next;
      lastHit.current = performance.now();
      const nextMatched = [...matched, id];
      setMatched(nextMatched);
      setScore(next);
      setSelected(null);
      setPop(`+${gain}`);
      audio.sfx("bloom");
      juice.emit("bloom");
      if (nextMatched.length === pairs.length) finish(next, wrongRef.current);
      return;
    }
    const miss = wrong + 1;
    const next = Math.max(0, score - 20);
    wrongRef.current = miss;
    scoreRef.current = next;
    setWrong(miss);
    setScore(next);
    setWrongId(id);
    setPop("-20");
    audio.sfx("bad");
    juice.emit("bad");
    lock.current = true;
    const until = performance.now() + 520;
    const step = (now: number) => {
      if (now < until) {
        requestAnimationFrame(step);
        return;
      }
      lock.current = false;
      setSelected(null);
      setWrongId(null);
    };
    requestAnimationFrame(step);
  };

  return (
    <section className="enter relative mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-widest text-gold uppercase">Bloom Match</p>
          <p className="text-sm text-muted">Toca una palabra y luego su traducción.</p>
        </div>
        <div className="text-right">
          <p data-testid="score" className="font-display text-4xl">
            {score}
          </p>
          <span ref={labelRef} data-testid="timer" className="block text-sm text-muted">
            0:00
          </span>
        </div>
      </div>
      <p className="text-sm text-jade">
        {matched.length} / {pairs.length} flores
      </p>
      <div className="relative grid gap-3 sm:grid-cols-2">
        <PopScore text={pop} />
        {[
          { side: "en" as const, rows: english, field: "en" as const },
          { side: "es" as const, rows: spanish, field: "es" as const },
        ].map((column) => (
          <div key={column.side} className="grid gap-2">
            {column.rows.map((pair) => {
              const isMatched = matched.includes(pair.id);
              const isSelected = selected?.side === column.side && selected.id === pair.id;
              const isWrong = wrongId === pair.id && selected?.id !== pair.id;
              return (
                <button
                  key={`${column.side}-${pair.id}`}
                  type="button"
                  disabled={isMatched}
                  onClick={() => choose(column.side, pair.id)}
                  className={cn(
                    "min-h-14 rounded-card border px-3 py-3 text-base font-semibold capitalize transition-[transform,border-color,background-color] duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                    isMatched && "border-gold bg-gold/20 text-gold",
                    isSelected && !isMatched && "border-gold bg-surface text-fg",
                    isWrong && "border-blossom bg-blossom/15",
                    !isMatched && !isSelected && !isWrong && "border-line bg-bg/75 text-fg hover:border-gold",
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    {isMatched ? <Flower2 className="size-4" aria-hidden="true" /> : null}
                    {pair[column.field]}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

export function SentenceBuilder({ deck, paused, onFinish }: ModeProps) {
  const [queue] = useState(() => shuffle(deck).slice(0, Math.min(6, deck.length)));
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [dead, setDead] = useState<string[]>([]);
  const [hintOn, setHintOn] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [note, setNote] = useState("");
  const [pop, setPop] = useState<string | null>(null);
  const shownAt = useRef(0);
  const wordsRef = useRef<string[]>([]);
  const lock = useRef(false);

  useEffect(() => {
    const item = queue[index];
    if (!item) return;
    shownAt.current = performance.now();
    lock.current = false;
    setQuestion(buildClozeQuestion(item, deck, 4));
    setPicked(null);
    setDead([]);
    setHintOn(false);
    setNote("");
    setPop(null);
  }, [deck, index, queue]);

  const finish = (stats: Omit<RunStats, "mode" | "title" | "detail" | "win"> & { correct: number; wrong: number }) => {
    onFinish({
      mode: "sentence",
      ...stats,
      win: stats.correct >= Math.ceil(queue.length / 2),
      title: "Oraciones en flor",
      detail: `${stats.correct} de ${queue.length} oraciones completas`,
    });
  };

  const advance = (nextCorrect: number, nextWrong: number, nextScore: number, nextBest: number, words: string[]) => {
    const until = performance.now() + 900;
    const step = (now: number) => {
      if (now < until) {
        requestAnimationFrame(step);
        return;
      }
      if (index + 1 >= queue.length) {
        finish({
          score: nextScore,
          correct: nextCorrect,
          wrong: nextWrong,
          bestCombo: nextBest,
          words,
        });
        return;
      }
      setIndex(index + 1);
    };
    requestAnimationFrame(step);
  };

  const answer = (choice: string) => {
    if (!question || lock.current || paused || dead.includes(choice)) return;
    const hit = choice.toLowerCase() === question.answer.toLowerCase();
    if (hit) {
      lock.current = true;
      const fast = performance.now() - shownAt.current < 8000;
      const gain = (dead.length > 0 ? 90 : 180) + (fast && dead.length === 0 ? 30 : 0);
      const nextCombo = combo + 1;
      const nextBest = Math.max(bestCombo, nextCombo);
      const nextScore = score + gain;
      const nextCorrect = correct + 1;
      const words = [...wordsRef.current, question.word];
      wordsRef.current = words;
      setPicked(choice);
      setScore(nextScore);
      setCombo(nextCombo);
      setBestCombo(nextBest);
      setCorrect(nextCorrect);
      setPop(`+${gain}`);
      setNote(question.explain);
      audio.sfx(nextCombo >= 3 ? "combo" : "ok");
      juice.emit("ok");
      advance(nextCorrect, wrong, nextScore, nextBest, words);
      return;
    }
    audio.sfx("bad");
    juice.emit("bad");
    setCombo(0);
    if (dead.length === 0) {
      setDead([choice]);
      setHintOn(true);
      setNote("Pista lista. Te queda un intento.");
      setWrong(wrong + 1);
      return;
    }
    lock.current = true;
    const nextWrong = wrong + 1;
    setPicked(choice);
    setWrong(nextWrong);
    setNote(question.explain);
    advance(correct, nextWrong, score, bestCombo, wordsRef.current);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!question || paused) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      const indexKey = Number(event.key) - 1;
      if (indexKey >= 0 && indexKey < question.choices.length) answer(question.choices[indexKey]!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!question) return null;

  return (
    <section className="enter relative mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-widest text-gold uppercase">Sentence Builder</p>
          <p className="text-sm text-muted">
            {index + 1} / {queue.length} · teclas 1 a 4
          </p>
        </div>
        <p data-testid="score" className="font-display text-4xl">
          {score}
        </p>
      </div>
      <div className="panel relative rounded-card p-5">
        <PopScore text={pop} />
        <p className="text-sm text-gold">{question.kicker}</p>
        <PromptText text={question.prompt} className="mt-3 font-display text-3xl leading-snug text-fg sm:text-4xl" />
      </div>
      {hintOn ? <p className="panel rounded-card px-4 py-3 text-sm text-gold">{question.hint}</p> : null}
      <ChoiceList
        choices={question.choices}
        answer={question.answer}
        picked={picked}
        dead={dead}
        capitalize={question.capitalize}
        onPick={answer}
        renderLabel={(choice) => choiceLabel(choice, question.capitalize)}
      />
      <p className="min-h-6 text-sm text-muted" aria-live="polite">
        {note}
      </p>
    </section>
  );
}

export function BloomBoss({ deck, paused, onFinish }: ModeProps) {
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [hp, setHp] = useState(100);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [note, setNote] = useState("El Marchito guarda el jardín. Recupéralo.");
  const [pop, setPop] = useState<string | null>(null);
  const [punch, setPunch] = useState(false);
  const bag = useRef<VocabItem[]>([]);
  const lastWord = useRef("");
  const lock = useRef(false);
  const wordsRef = useRef<string[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const remainRef = useRef(10);
  const total = bossSeconds(round);
  const done = useRef(false);

  const spawn = (nextRound: number) => {
    const item = pullItem(deck, bag.current, lastWord.current);
    lastWord.current = item.word;
    lock.current = false;
    setPicked(null);
    setPop(null);
    setPunch(false);
    setQuestion(buildBossQuestion(item, deck, nextRound));
  };

  useEffect(() => {
    spawn(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const end = (next: { score: number; correct: number; wrong: number; bestCombo: number; win: boolean; words: string[]; detail: string }) => {
    if (done.current) return;
    done.current = true;
    const until = performance.now() + 650;
    const step = (now: number) => {
      if (now < until) {
        requestAnimationFrame(step);
        return;
      }
      onFinish({
        mode: "boss",
        title: next.win ? "El Marchito florece" : "El Marchito resiste",
        ...next,
      });
    };
    requestAnimationFrame(step);
  };

  const miss = (reason: string) => {
    if (done.current || lock.current) return;
    lock.current = true;
    const nextLives = lives - 1;
    const nextHp = Math.min(100, hp + 8);
    const nextWrong = wrong + 1;
    setLives(nextLives);
    setHp(nextHp);
    setCombo(0);
    setWrong(nextWrong);
    setNote(reason);
    setPop("resiste");
    audio.sfx("bad");
    juice.emit("bad");
    if (nextLives <= 0) {
      end({
        score,
        correct,
        wrong: nextWrong,
        bestCombo,
        win: false,
        words: wordsRef.current,
        detail: "Te quedaste sin pétalos.",
      });
      return;
    }
    const until = performance.now() + 700;
    const step = (now: number) => {
      if (now < until) {
        requestAnimationFrame(step);
        return;
      }
      const nextRound = round + 1;
      if (nextRound >= 10) {
        end({
          score,
          correct,
          wrong: nextWrong,
          bestCombo,
          win: false,
          words: wordsRef.current,
          detail: `Quedó ${nextHp}% del Marchito.`,
        });
        return;
      }
      setRound(nextRound);
      spawn(nextRound);
    };
    requestAnimationFrame(step);
  };

  useRailTimer({
    total,
    active: !paused && question !== null && picked === null && !done.current,
    resetKey: question?.key ?? "boss",
    remainRef,
    barRef,
    labelRef,
    onEnd: () => {
      setPicked("__timeout__");
      miss("El tiempo se marchitó.");
    },
  });

  const answer = (choice: string) => {
    if (!question || lock.current || paused || picked) return;
    if (choice !== question.answer) {
      setPicked(choice);
      miss(question.explain);
      return;
    }
    lock.current = true;
    setPicked(choice);
    const nextCombo = combo + 1;
    const nextBest = Math.max(bestCombo, nextCombo);
    const gain = Math.round(130 * comboMultiplier(nextCombo));
    const damage = Math.round(11 * comboMultiplier(nextCombo));
    const nextHp = Math.max(0, hp - damage);
    const nextScore = score + gain;
    const nextCorrect = correct + 1;
    const words = [...wordsRef.current, question.word];
    wordsRef.current = words;
    setCombo(nextCombo);
    setBestCombo(nextBest);
    setHp(nextHp);
    setScore(nextScore);
    setCorrect(nextCorrect);
    setPop(`+${gain}`);
    setPunch(true);
    setNote(question.explain);
    audio.sfx(nextCombo >= 3 ? "combo" : "ok");
    juice.emit(nextHp <= 0 ? "win" : "bloom");
    if (nextHp <= 0) {
      end({
        score: nextScore,
        correct: nextCorrect,
        wrong,
        bestCombo: nextBest,
        win: true,
        words,
        detail: `Lo venciste en ${round + 1} golpes.`,
      });
      return;
    }
    const until = performance.now() + 680;
    const step = (now: number) => {
      if (now < until) {
        requestAnimationFrame(step);
        return;
      }
      const nextRound = round + 1;
      if (nextRound >= 10) {
        end({
          score: nextScore,
          correct: nextCorrect,
          wrong,
          bestCombo: nextBest,
          win: false,
          words,
          detail: `Quedó ${nextHp}% del Marchito.`,
        });
        return;
      }
      setRound(nextRound);
      spawn(nextRound);
    };
    requestAnimationFrame(step);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!question || paused) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < question.choices.length) answer(question.choices[index]!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!question) return null;

  return (
    <section className="enter relative mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-center gap-4">
        <img
          src="/art/boss.jpg"
          alt="El Marchito, espíritu de una flor marchita"
          className={cn("size-24 rounded-full border-2 object-cover sm:size-28", punch && "punch", hp < 40 ? "border-gold" : "border-blossom")}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-widest text-blossom uppercase">The Bloom Boss</p>
          <p className="font-display text-2xl">El Marchito</p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-blossom transition-[width] duration-300" style={{ width: `${hp}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-muted">
            <span className="flex gap-1" aria-label={`${lives} pétalos`}>
              {[0, 1, 2].map((life) => (
                <Leaf key={life} className={cn("size-5", life < lives ? "text-gold" : "text-line")} aria-hidden="true" />
              ))}
            </span>
            <span data-testid="score">{score}</span>
          </div>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface">
        <div ref={barRef} className="timer-fill h-full w-full" />
      </div>
      <div className="flex justify-between text-sm text-muted">
        <span>
          Golpe {Math.min(round + 1, 10)} / 10 · combo {combo}
        </span>
        <span ref={labelRef} data-testid="timer" />
      </div>
      <div className="panel relative rounded-card p-4">
        <PopScore text={pop} />
        <p className="text-sm text-gold">{question.kicker}</p>
        {question.kind === "cloze" ? (
          <PromptText text={question.prompt} className="mt-2 font-display text-2xl leading-snug sm:text-3xl" />
        ) : (
          <p data-testid="prompt" className="mt-2 font-display text-4xl">
            {question.prompt}
          </p>
        )}
      </div>
      <ChoiceList
        choices={question.choices}
        answer={question.answer}
        picked={picked}
        capitalize={question.capitalize}
        onPick={answer}
        renderLabel={(choice) => choiceLabel(choice, question.capitalize)}
      />
      <p className="min-h-6 text-sm text-muted" aria-live="polite">
        {note}
      </p>
    </section>
  );
}

export type ClassConfig = {
  teams: string[];
  questions: number;
  timed: boolean;
};

export function ClassSetup({ onStart }: { onStart: (config: ClassConfig) => void }) {
  const [count, setCount] = useState<2 | 3>(2);
  const [names, setNames] = useState(["Pétalo", "Raíz", "Sol"]);
  const [questions, setQuestions] = useState(12);
  const [timed, setTimed] = useState(true);

  return (
    <section className="enter mx-auto flex w-full max-w-xl flex-col gap-4">
      <div>
        <p className="text-xs tracking-widest text-gold uppercase">Classroom Mode</p>
        <h2 className="font-display text-4xl">La clase entra al jardín</h2>
        <p className="mt-2 text-muted">Proyecta la pregunta, turna equipos y deja que griten la respuesta. Sin cuentas.</p>
      </div>
      <div className="panel grid gap-4 rounded-card p-4">
        <div className="flex gap-2">
          {[2, 3].map((value) => (
            <GameButton key={value} variant={count === value ? "primary" : "quiet"} onClick={() => setCount(value as 2 | 3)}>
              {value} equipos
            </GameButton>
          ))}
        </div>
        <div className="grid gap-3">
          {names.slice(0, count).map((name, index) => (
            <label key={index} className="grid gap-1 text-sm text-muted">
              Equipo {index + 1}
              <input
                data-testid={`team-name-${index}`}
                value={name}
                maxLength={18}
                onChange={(event) =>
                  setNames((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                }
                className="panel-solid min-h-12 rounded-card px-3 text-base text-fg outline-none focus-visible:outline-2 focus-visible:outline-gold"
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[8, 12, 16].map((value) => (
            <GameButton key={value} variant={questions === value ? "primary" : "quiet"} onClick={() => setQuestions(value)}>
              {value} preguntas
            </GameButton>
          ))}
        </div>
        <GameButton variant={timed ? "primary" : "quiet"} onClick={() => setTimed((value) => !value)}>
          {timed ? "Con reloj de 12s" : "Sin reloj"}
        </GameButton>
        <GameButton
          data-testid="class-start"
          onClick={() =>
            onStart({
              teams: names.slice(0, count).map((name, index) => name.trim() || `Equipo ${index + 1}`),
              questions,
              timed,
            })
          }
        >
          Empezar ronda
        </GameButton>
      </div>
    </section>
  );
}

const TEAM_TONE = ["border-gold bg-gold/15", "border-blossom bg-blossom/15", "border-jade bg-jade/15"];

export function ClassPlay({
  deck,
  config,
  paused,
  onSettle,
  onAgain,
  onSetup,
}: {
  deck: VocabItem[];
  config: ClassConfig;
  paused: boolean;
  onSettle: (stats: RunStats) => void;
  onAgain: () => void;
  onSetup: () => void;
}) {
  const [teams, setTeams] = useState(() => config.teams.map((name) => ({ name, score: 0, combo: 0 })));
  const [turn, setTurn] = useState(0);
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [over, setOver] = useState(false);
  const bag = useRef<VocabItem[]>([]);
  const lastWord = useRef("");
  const lock = useRef(false);
  const wordsRef = useRef<string[]>([]);
  const settled = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const remainRef = useRef(12);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const bestComboRef = useRef(0);

  const spawn = () => {
    const item = pullItem(deck, bag.current, lastWord.current);
    lastWord.current = item.word;
    lock.current = false;
    setPicked(null);
    setQuestion(index % 3 === 2 ? buildClozeQuestion(item, deck, 3) : buildMeaningQuestion(item, deck, index % 3 === 1));
  };

  useEffect(() => {
    spawn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const close = (finalTeams: { name: string; score: number; combo: number }[]) => {
    setOver(true);
    if (settled.current) return;
    settled.current = true;
    const total = finalTeams.reduce((sum, team) => sum + team.score, 0);
    onSettle({
      mode: "class",
      score: total,
      correct: correctRef.current,
      wrong: wrongRef.current,
      bestCombo: bestComboRef.current,
      win: true,
      words: wordsRef.current,
      title: "Ronda de clase",
      detail: "El jardín del aula creció.",
    });
  };

  const answer = (choice: string) => {
    if (!question || lock.current || paused || over) return;
    lock.current = true;
    setPicked(choice);
    const hit = choice === question.answer;
    const nextTeams = teams.map((team, teamIndex) => {
      if (teamIndex !== turn % teams.length) return team;
      if (!hit) return { ...team, combo: 0 };
      const nextCombo = team.combo + 1;
      bestComboRef.current = Math.max(bestComboRef.current, nextCombo);
      const speed = config.timed ? Math.round(remainRef.current * 8) : 0;
      const gain = Math.round((110 + speed) * comboMultiplier(nextCombo));
      return { ...team, combo: nextCombo, score: team.score + gain };
    });
    if (hit) {
      correctRef.current += 1;
      wordsRef.current = [...wordsRef.current, question.word];
      setNote(`${teams[turn % teams.length]?.name ?? "Equipo"} acierta. ${question.explain}`);
      audio.sfx("ok");
      juice.emit("bloom");
    } else {
      wrongRef.current += 1;
      setNote(`Casi. ${question.explain}`);
      audio.sfx("bad");
      juice.emit("bad");
    }
    setTeams(nextTeams);
    const until = performance.now() + 900;
    const step = (now: number) => {
      if (now < until) {
        requestAnimationFrame(step);
        return;
      }
      const nextIndex = index + 1;
      if (nextIndex >= config.questions) {
        close(nextTeams);
        return;
      }
      setTurn((value) => value + 1);
      setIndex(nextIndex);
      setNote("");
    };
    requestAnimationFrame(step);
  };

  useRailTimer({
    total: 12,
    active: config.timed && !paused && !over && question !== null && picked === null,
    resetKey: question?.key ?? `class-${index}`,
    remainRef,
    barRef,
    labelRef,
    onEnd: () => {
      if (!question) return;
      answer("__timeout__");
    },
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!question || paused || over) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      const keyIndex = Number(event.key) - 1;
      if (keyIndex >= 0 && keyIndex < question.choices.length) answer(question.choices[keyIndex]!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const leader = [...teams].sort((a, b) => b.score - a.score);
  const winners = leader.filter((team) => team.score === leader[0]?.score);

  if (over) {
    return (
      <section className="enter mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center">
        <Trophy className="size-12 text-gold" aria-hidden="true" />
        <p className="text-xs tracking-widest text-gold uppercase">Fin de la ronda</p>
        <h2 className="font-display text-5xl">
          {winners.length > 1 ? "Empate en el jardín" : `Gana ${winners[0]?.name}`}
        </h2>
        <div className="grid w-full gap-3 sm:grid-cols-3">
          {leader.map((team, teamIndex) => (
            <article key={`${team.name}-${teamIndex}`} className="panel rounded-card p-4">
              <p className="text-sm text-muted">{team.name}</p>
              <p className="font-display text-4xl text-gold">{team.score}</p>
            </article>
          ))}
        </div>
        <div className="flex w-full max-w-md flex-col gap-2">
          <GameButton onClick={onAgain}>Otra ronda</GameButton>
          <GameButton variant="quiet" onClick={onSetup}>
            Cambiar equipos
          </GameButton>
        </div>
      </section>
    );
  }

  if (!question) return null;
  const active = turn % teams.length;

  return (
    <section className="enter mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {teams.map((team, teamIndex) => (
          <article
            key={team.name}
            className={cn("rounded-card border px-3 py-3", teamIndex === active ? TEAM_TONE[teamIndex] : "border-line bg-bg/60")}
          >
            <p className="text-xs tracking-widest uppercase">{teamIndex === active ? "Turno" : "Equipo"}</p>
            <p className="truncate font-display text-2xl sm:text-3xl">{team.name}</p>
            <p className="font-display text-3xl">{team.score}</p>
          </article>
        ))}
      </div>
      {config.timed ? (
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div ref={barRef} className="timer-fill h-full w-full" />
        </div>
      ) : null}
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-4 text-gold" aria-hidden="true" />
          Pregunta {index + 1} / {config.questions}
        </span>
        {config.timed ? <span ref={labelRef} data-testid="timer" /> : <span>Sin reloj</span>}
      </div>
      <div className="panel rounded-card p-4 sm:p-6">
        <p className="text-sm text-gold">{question.kicker}</p>
        {question.kind === "cloze" ? (
          <PromptText text={question.prompt} className="mt-2 font-display text-3xl leading-snug sm:text-5xl" />
        ) : (
          <p data-testid="prompt" className="mt-2 font-display text-4xl sm:text-6xl">
            {question.prompt}
          </p>
        )}
      </div>
      <ChoiceList
        choices={question.choices}
        answer={question.answer}
        picked={picked}
        capitalize={question.capitalize}
        onPick={answer}
        renderLabel={(choice) => choiceLabel(choice, question.capitalize)}
      />
      <p className="min-h-6 text-center text-base text-fg" aria-live="polite">
        {note}
      </p>
    </section>
  );
}
