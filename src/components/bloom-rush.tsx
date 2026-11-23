import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Flower2,
  PenLine,
  Play,
  Quote,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Keyboard,
} from "lucide-react";
import { Garden } from "@/components/garden";
import { BloomBoss, ClassPlay, ClassSetup, SentenceBuilder, ThornRecall, WordDash, type ClassConfig } from "@/components/modes";
import { GameButton, IconButton, Stat } from "@/components/ui";
import { audio } from "@/game/audio";
import { BADGES, FLOWERS } from "@/game/content";
import { POS_ES } from "@/game/dictionary";
import { badgeById, deckReady, defaultDeck, extractWords, levelFromXp, settleRun, tryAdd } from "@/game/engine";
import { juice } from "@/game/juice";
import { emptySave, loadSave, loadSessionBest, writeSave, writeSessionBest } from "@/game/save";
import type { RunStats, SaveData, VocabItem } from "@/game/types";
import { cn } from "@/lib/cn";

type Screen = "title" | "vocab" | "hub" | "dash" | "thorn" | "sentence" | "boss" | "class-setup" | "class-play" | "results";

type ResultView = {
  stats: RunStats;
  xpGain: number;
  newBadges: string[];
  levelBefore: number;
  levelAfter: number;
};

const RUNS = new Set<Screen>(["dash", "thorn", "sentence", "boss", "class-play"]);

export function BloomRush() {
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState<SaveData>(() => emptySave());
  const [screen, setScreen] = useState<Screen>("title");
  const [paused, setPaused] = useState(false);
  const [shake, setShake] = useState(false);
  const [sessionBest, setSessionBest] = useState(0);
  const [result, setResult] = useState<ResultView | null>(null);
  const [runId, setRunId] = useState(0);
  const [classKey, setClassKey] = useState(0);
  const [classConfig, setClassConfig] = useState<ClassConfig | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const loaded = loadSave();
    setProgress(loaded);
    setSessionBest(loadSessionBest());
    audio.setMuted(loaded.muted);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeSave(progress);
    audio.setMuted(progress.muted);
  }, [progress, hydrated]);

  useEffect(() => {
    const unlock = () => audio.unlock();
    const resume = () => audio.resume();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);

  useEffect(() => {
    return juice.on((kind) => {
      if (kind !== "bad") return;
      setShake(true);
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (event.key !== "Escape") return;
      }
      if (event.key === "m" || event.key === "M") {
        setProgress((current) => ({ ...current, muted: !current.muted }));
      }
      if (event.key === "Escape" && RUNS.has(screen)) setPaused((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen]);

  const level = levelFromXp(progress.xp);

  const finish = (stats: RunStats) => {
    const before = levelFromXp(progressRef.current.xp);
    const settled = settleRun(progressRef.current, stats);
    setProgress(settled.meta);
    setSessionBest((current) => {
      const next = Math.max(current, stats.score);
      writeSessionBest(next);
      return next;
    });
    setResult({
      stats,
      xpGain: settled.xpGain,
      newBadges: settled.newBadges,
      levelBefore: before.level,
      levelAfter: levelFromXp(settled.meta.xp).level,
    });
    setPaused(false);
    setScreen("results");
    audio.sfx(stats.win ? "win" : "bloom");
    if (stats.win) juice.emit("win");
  };

  const settleQuiet = (stats: RunStats) => {
    const settled = settleRun(progressRef.current, stats);
    setProgress(settled.meta);
    setSessionBest((current) => {
      const next = Math.max(current, stats.score);
      writeSessionBest(next);
      return next;
    });
    audio.sfx("win");
    juice.emit("win");
  };

  const go = (next: Screen) => {
    setPaused(false);
    if (RUNS.has(next)) setRunId((value) => value + 1);
    setScreen(next);
  };

  const back = () => {
    if (RUNS.has(screen)) {
      setPaused(true);
      return;
    }
    if (screen === "results" || screen === "class-setup") setScreen("hub");
    else setScreen("title");
  };

  return (
    <div className={cn("relative min-h-dvh text-fg", shake && "shake")} onAnimationEnd={() => setShake(false)}>
      <div className="fixed inset-0 -z-10 bg-bg">
        <img src="/art/garden.jpg" alt="" className="h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/35 via-bg/55 to-bg/88" />
        <Garden />
      </div>
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-4 sm:px-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          {screen === "title" ? (
            <span className="text-xs tracking-widest text-gold uppercase">Quest</span>
          ) : (
            <IconButton aria-label="Volver" data-testid="back-button" onClick={back}>
              <ArrowLeft className="size-5" />
            </IconButton>
          )}
          <p className="font-display text-lg text-gold">Nv {level.level}</p>
          <IconButton
            data-testid="audio-toggle"
            aria-label={progress.muted ? "Activar audio" : "Silenciar audio"}
            aria-pressed={progress.muted}
            onClick={() => setProgress((current) => ({ ...current, muted: !current.muted }))}
          >
            {progress.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </IconButton>
        </header>
        <div className="flex-1">
          {screen === "title" ? (
            <TitleScreen
              level={level.level}
              best={progress.best}
              sessionBest={sessionBest}
              onPlay={() => go(deckReady(progress.deck) ? "hub" : "vocab")}
              onVocab={() => go("vocab")}
              onClass={() => go(deckReady(progress.deck) ? "class-setup" : "vocab")}
            />
          ) : screen === "vocab" ? (
            <VocabScreen
              deck={progress.deck}
              onDeck={(deck) => setProgress((current) => ({ ...current, deck }))}
              onStart={() => go("hub")}
            />
          ) : screen === "hub" ? (
            <HubScreen
              level={level}
              badges={progress.badges}
              mastered={progress.mastered.length}
              best={progress.best}
              sessionBest={sessionBest}
              onMode={(mode) => {
                if (!deckReady(progress.deck)) {
                  setScreen("vocab");
                  return;
                }
                go(mode);
              }}
              onVocab={() => go("vocab")}
              onClass={() => {
                if (!deckReady(progress.deck)) {
                  setScreen("vocab");
                  return;
                }
                go("class-setup");
              }}
            />
          ) : screen === "dash" ? (
            <WordDash key={runId} deck={progress.deck} paused={paused} onFinish={finish} />
          ) : screen === "thorn" ? (
            <ThornRecall key={runId} deck={progress.deck} paused={paused} onFinish={finish} />
          ) : screen === "sentence" ? (
            <SentenceBuilder key={runId} deck={progress.deck} paused={paused} onFinish={finish} />
          ) : screen === "boss" ? (
            <BloomBoss key={runId} deck={progress.deck} paused={paused} onFinish={finish} />
          ) : screen === "class-setup" ? (
            <ClassSetup
              onStart={(config) => {
                setClassConfig(config);
                setClassKey((value) => value + 1);
                setScreen("class-play");
              }}
            />
          ) : screen === "class-play" && classConfig ? (
            <ClassPlay
              key={classKey}
              deck={progress.deck}
              config={classConfig}
              paused={paused}
              onSettle={settleQuiet}
              onAgain={() => setClassKey((value) => value + 1)}
              onSetup={() => setScreen("class-setup")}
            />
          ) : screen === "results" && result ? (
            <Results
              result={result}
              onAgain={() => go(result.stats.mode === "class" ? "class-setup" : result.stats.mode)}
              onHub={() => go("hub")}
            />
          ) : (
            <TitleScreen
              level={level.level}
              best={progress.best}
              sessionBest={sessionBest}
              onPlay={() => go("hub")}
              onVocab={() => go("vocab")}
              onClass={() => go("class-setup")}
            />
          )}
        </div>
      </div>
      {paused && RUNS.has(screen) ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-bg/70 px-4">
          <div className="panel w-full max-w-sm rounded-card p-6 text-center">
            <p className="font-display text-3xl">Pausa</p>
            <p className="mt-2 text-sm text-muted">El reloj espera. Escape también reanuda.</p>
            <div className="mt-4 grid gap-2">
              <GameButton data-testid="resume" onClick={() => setPaused(false)}>
                Continuar
              </GameButton>
              <GameButton
                variant="quiet"
                onClick={() => {
                  setPaused(false);
                  setScreen(screen === "class-play" ? "class-setup" : "hub");
                }}
              >
                Salir de la partida
              </GameButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TitleScreen({
  level,
  best,
  sessionBest,
  onPlay,
  onVocab,
  onClass,
}: {
  level: number;
  best: number;
  sessionBest: number;
  onPlay: () => void;
  onVocab: () => void;
  onClass: () => void;
}) {
  return (
    <section className="mx-auto flex min-h-[70dvh] w-full max-w-xl flex-col items-center justify-center text-center">
      <p className="enter text-xs tracking-widest text-gold uppercase">The English Vocabulary Quest</p>
      <h1 className="glow-title mt-3 font-display text-5xl leading-none text-fg sm:text-7xl">
        {"BLOOM RUSH".split("").map((letter, index) => (
          <span key={`${letter}-${index}`} className="stagger-letter" style={{ animationDelay: `${index * 55}ms` }}>
            {letter === " " ? "\u00A0" : letter}
          </span>
        ))}
      </h1>
      <p className="enter mt-4 max-w-md text-base text-fg/90" style={{ animationDelay: "280ms" }}>
        Cada palabra enciende una flor. Recupera el jardín antes de enfrentar a El Marchito.
      </p>
      <div className="enter mt-8 flex w-full max-w-md flex-col gap-3" style={{ animationDelay: "360ms" }}>
        <GameButton data-testid="play-button" className="min-h-14 text-lg" onClick={onPlay}>
          <Play className="size-5" aria-hidden="true" />
          PLAY
        </GameButton>
        <GameButton data-testid="vocab-button" variant="ghost" onClick={onVocab}>
          <PenLine className="size-5" aria-hidden="true" />
          CREATE MY VOCABULARY
        </GameButton>
        <GameButton data-testid="class-button" variant="quiet" onClick={onClass}>
          <Users className="size-5" aria-hidden="true" />
          CLASSROOM MODE
        </GameButton>
      </div>
      <p className="mt-6 text-sm text-muted">
        Nivel {level}
        {sessionBest > 0 ? ` · récord de la sesión ${sessionBest}` : ""}
        {best > 0 ? ` · mejor marca ${best}` : ""}
      </p>
      <p className="mt-2 max-w-sm text-xs text-muted">El fragmento que pegues se analiza en este dispositivo y no se guarda.</p>
    </section>
  );
}

function VocabScreen({ deck, onDeck, onStart }: { deck: VocabItem[]; onDeck: (deck: VocabItem[]) => void; onStart: () => void }) {
  const [source, setSource] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [extraWord, setExtraWord] = useState("");
  const [extraEs, setExtraEs] = useState("");
  const ready = deckReady(deck);

  return (
    <section className="enter mx-auto flex w-full max-w-2xl flex-col gap-4 pb-8">
      <div>
        <p className="text-xs tracking-widest text-gold uppercase">Create my vocabulary</p>
        <h2 className="font-display text-4xl">Siembra el mazo</h2>
        <p className="mt-2 text-sm text-muted">
          Pega un fragmento breve en inglés. Se lee solo aquí: no se envía ni se almacena. Si no pegas nada, el jardín usa su banco original.
        </p>
      </div>
      <textarea
        data-testid="vocab-text"
        value={source}
        maxLength={1500}
        onChange={(event) => setSource(event.target.value)}
        placeholder="Pega aquí un párrafo corto que tengas permiso de usar."
        className="panel-solid min-h-32 w-full rounded-card px-4 py-3 text-base text-fg outline-none focus-visible:outline-2 focus-visible:outline-gold"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <GameButton
          data-testid="extract-button"
          onClick={() => {
            if (!source.trim()) {
              setError("Pega un fragmento o carga el jardín original.");
              return;
            }
            const result = extractWords(source);
            onDeck(result.items);
            setSource("");
            setError("");
            setNotice(
              result.padded
                ? `Salieron ${result.items.length} palabras. El fragmento era breve, así que completamos hasta 8 con el jardín original.`
                : `Listas ${result.items.length} palabras. Revisa las traducciones antes de la clase.`,
            );
          }}
        >
          Extraer vocabulario
        </GameButton>
        <GameButton
          variant="quiet"
          onClick={() => {
            onDeck(defaultDeck());
            setSource("");
            setError("");
            setNotice("Mazo original del jardín. Puedes editar cada traducción.");
          }}
        >
          Jardín original
        </GameButton>
      </div>
      {notice ? <p className="text-sm text-jade">{notice}</p> : null}
      {error ? (
        <p className="text-sm text-blossom" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3">
        {deck.map((item) => (
          <article key={item.id} className="panel grid gap-2 rounded-card p-3 sm:grid-cols-[1fr_1.2fr_auto] sm:items-center">
            <div>
              <p className="font-display text-2xl capitalize">{item.word}</p>
              <p className="text-xs tracking-wide text-muted uppercase">
                {POS_ES[item.pos]}
                {item.fromGarden ? " · del jardín" : ""}
                {item.needsReview ? " · revisar" : ""}
              </p>
            </div>
            <input
              data-testid={`translation-${item.word}`}
              value={item.translation}
              aria-label={`Traducción de ${item.word}`}
              onChange={(event) => {
                const translation = event.target.value.slice(0, 48);
                onDeck(
                  deck.map((current) =>
                    current.id === item.id
                      ? {
                          ...current,
                          translation,
                          needsReview: translation.trim().length === 0,
                          hint: translation.trim() ? `Significa «${translation.trim()}».` : "Traduce la palabra antes de jugar.",
                        }
                      : current,
                  ),
                );
              }}
              className={cn(
                "panel-solid min-h-12 rounded-card px-3 text-base text-fg outline-none focus-visible:outline-2 focus-visible:outline-gold",
                item.needsReview && "border-gold",
                !item.translation.trim() && "border-blossom",
              )}
            />
            <IconButton aria-label={`Quitar ${item.word}`} onClick={() => onDeck(deck.filter((current) => current.id !== item.id))}>
              <Trash2 className="size-4" />
            </IconButton>
          </article>
        ))}
      </div>
      <form
        className="panel grid gap-2 rounded-card p-3 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const result = tryAdd(deck, extraWord, extraEs);
          if (result.error) {
            setError(result.error);
            return;
          }
          onDeck(result.items);
          setExtraWord("");
          setExtraEs("");
          setError("");
        }}
      >
        <input
          value={extraWord}
          onChange={(event) => setExtraWord(event.target.value)}
          placeholder="Palabra en inglés"
          aria-label="Nueva palabra en inglés"
          className="panel-solid min-h-12 rounded-card px-3 text-base outline-none focus-visible:outline-2 focus-visible:outline-gold"
        />
        <input
          value={extraEs}
          onChange={(event) => setExtraEs(event.target.value)}
          placeholder="Traducción"
          aria-label="Traducción de la nueva palabra"
          className="panel-solid min-h-12 rounded-card px-3 text-base outline-none focus-visible:outline-2 focus-visible:outline-gold"
        />
        <GameButton type="submit" variant="quiet" disabled={deck.length >= 15}>
          <Plus className="size-4" aria-hidden="true" />
          Añadir
        </GameButton>
      </form>
      <GameButton data-testid="start-deck" disabled={!ready} onClick={onStart}>
        Sembrar el jardín
      </GameButton>
      {!ready ? <p className="text-sm text-muted">Necesitas entre 8 y 15 palabras, todas con traducción.</p> : null}
    </section>
  );
}

function HubScreen({
  level,
  badges,
  mastered,
  best,
  sessionBest,
  onMode,
  onVocab,
  onClass,
}: {
  level: ReturnType<typeof levelFromXp>;
  badges: string[];
  mastered: number;
  best: number;
  sessionBest: number;
  onMode: (mode: "dash" | "thorn" | "sentence" | "boss") => void;
  onVocab: () => void;
  onClass: () => void;
}) {
  const modes = [
    { id: "dash" as const, title: "Word Dash", text: "Cuatro opciones, inglés y español, 30 segundos.", icon: Timer, test: "mode-dash" },
    { id: "thorn" as const, title: "Thorn Recall", text: "Escribe la traducción. Sin opciones y con tres vidas.", icon: Keyboard, test: "mode-thorn" },
    { id: "sentence" as const, title: "Sentence Builder", text: "Un intento por oración y el reloj no perdona.", icon: Quote, test: "mode-sentence" },
    { id: "boss" as const, title: "The Bloom Boss", text: "Menos daño por golpe. Hay que encadenar aciertos.", icon: Swords, test: "mode-boss" },
  ];
  return (
    <section className="enter mx-auto flex w-full max-w-3xl flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-widest text-gold uppercase">El jardín</p>
          <h2 className="font-display text-4xl">Elige tu prueba</h2>
        </div>
        <p className="text-sm text-muted">
          {mastered} palabras dominadas
          {sessionBest > 0 ? ` · sesión ${sessionBest}` : ""}
          {best > 0 ? ` · marca ${best}` : ""}
        </p>
      </div>
      <div className="panel rounded-card p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>Nivel {level.level}</span>
          <span className="text-muted">
            {level.into} / {level.span} XP
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div className="h-full bg-gold" style={{ width: `${Math.min(100, (level.into / level.span) * 100)}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {FLOWERS.map((name, index) => {
            const open = level.level > index;
            return (
              <span
                key={name}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm",
                  open ? "border-gold text-gold" : "border-line text-muted",
                )}
              >
                <Flower2 className="size-4" aria-hidden="true" />
                {open ? name : "Por descubrir"}
              </span>
            );
          })}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            data-testid={mode.test}
            onClick={() => onMode(mode.id)}
            className="panel rounded-card p-4 text-left transition-transform duration-150 ease-out hover:-translate-y-1 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <mode.icon className="size-5 text-gold" aria-hidden="true" />
            <p className="mt-3 font-display text-2xl">{mode.title}</p>
            <p className="mt-1 text-sm text-muted">{mode.text}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <GameButton variant="quiet" onClick={onClass}>
          <Users className="size-4" aria-hidden="true" />
          Classroom Mode
        </GameButton>
        <GameButton variant="ghost" onClick={onVocab}>
          <PenLine className="size-4" aria-hidden="true" />
          Editar mazo
        </GameButton>
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.length === 0 ? <p className="text-sm text-muted">Las insignias aparecen al terminar una partida.</p> : null}
        {badges.map((id) => {
          const badge = badgeById(id) ?? BADGES.find((item) => item.id === id);
          if (!badge) return null;
          return (
            <span key={id} className="inline-flex items-center gap-1 rounded-full border border-gold/50 px-3 py-1 text-sm text-gold">
              <Sparkles className="size-3" aria-hidden="true" />
              {badge.name}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function Results({ result, onAgain, onHub }: { result: ResultView; onAgain: () => void; onHub: () => void }) {
  const accuracy = result.stats.correct + result.stats.wrong === 0 ? 0 : Math.round((result.stats.correct / (result.stats.correct + result.stats.wrong)) * 100);
  const freshFlowers = FLOWERS.filter((_, index) => index >= result.levelBefore && index < result.levelAfter);
  return (
    <section className="enter mx-auto flex w-full max-w-xl flex-col items-center gap-4 pb-10 text-center">
      <Trophy className="size-10 text-gold" aria-hidden="true" />
      <p className="text-xs tracking-widest text-gold uppercase">{result.stats.win ? "Victoria" : "El jardín sigue"}</p>
      <h2 className="font-display text-4xl sm:text-5xl">{result.stats.title}</h2>
      <p className="text-muted">{result.stats.detail}</p>
      <p data-testid="results-score" className="font-display text-6xl text-gold">
        {result.stats.score}
      </p>
      <div className="grid w-full grid-cols-3 gap-2">
        <Stat label="Aciertos" value={`${accuracy}%`} />
        <Stat label="Racha" value={result.stats.bestCombo} />
        <Stat label="XP" value={`+${result.xpGain}`} />
      </div>
      {result.levelAfter > result.levelBefore ? (
        <p className="text-jade">Subiste al nivel {result.levelAfter}.</p>
      ) : null}
      {freshFlowers.length > 0 ? <p className="text-sm text-gold">Nueva flor: {freshFlowers.join(", ")}</p> : null}
      {result.newBadges.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-2">
          {result.newBadges.map((id) => (
            <span key={id} className="rounded-full border border-gold px-3 py-1 text-sm text-gold">
              {badgeById(id)?.name ?? id}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex w-full max-w-md flex-col gap-2">
        <GameButton onClick={onAgain}>Jugar de nuevo</GameButton>
        <GameButton variant="quiet" onClick={onHub}>
          Volver al jardín
        </GameButton>
      </div>
    </section>
  );
}
