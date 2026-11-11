import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const VARIANTS = {
  primary: "bg-gold text-bg hover:bg-gold-deep",
  ghost: "panel text-fg hover:border-gold",
  quiet: "bg-transparent text-fg border border-line hover:border-gold",
} as const;

export function GameButton({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-card px-5 py-3 text-base font-semibold transition-[transform,background-color,border-color,opacity] duration-150 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "grid size-12 place-items-center rounded-full border border-line bg-bg/75 text-fg transition-transform duration-150 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PromptText({ text, className }: { text: string; className?: string }) {
  const parts = text.split("______");
  if (parts.length === 1) {
    return (
      <p data-testid="prompt" className={className}>
        {text}
      </p>
    );
  }
  return (
    <p data-testid="prompt" className={className}>
      {parts[0]}
      <span className="mx-1 inline-block min-w-16 border-b-4 border-gold px-3 text-gold">&nbsp;</span>
      {parts.slice(1).join("______")}
    </p>
  );
}

export function ChoiceList({
  choices,
  answer,
  picked,
  dead = [],
  capitalize,
  disabled,
  onPick,
  renderLabel,
}: {
  choices: string[];
  answer?: string;
  picked: string | null;
  dead?: string[];
  capitalize: boolean;
  disabled?: boolean;
  onPick: (choice: string) => void;
  renderLabel: (choice: string) => string;
}) {
  return (
    <div className="grid gap-3">
      {choices.map((choice, index) => {
        const revealed = picked !== null;
        const isAnswer = revealed && choice === answer;
        const isMiss = revealed && picked === choice && choice !== answer;
        const isDead = dead.includes(choice);
        return (
          <button
            key={`${choice}-${index}`}
            type="button"
            data-testid={`choice-${index}`}
            disabled={disabled || isDead || revealed}
            onClick={() => onPick(choice)}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-card border px-4 py-3 text-left text-lg font-semibold transition-[transform,border-color,background-color] duration-150 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:active:scale-100",
              isAnswer && "border-gold bg-gold/20 text-gold",
              isMiss && "border-blossom bg-blossom/15 text-blossom",
              !isAnswer && !isMiss && "border-line bg-bg/70 text-fg hover:border-gold",
              isDead && !revealed && "opacity-40",
            )}
          >
            <span className="font-display text-gold">{index + 1}</span>
            <span className="min-w-0 flex-1 break-words">{renderLabel(choice)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="panel rounded-card px-3 py-2 text-center">
      <p className="text-xs tracking-widest text-muted uppercase">{label}</p>
      <p className="font-display text-2xl text-fg">{value}</p>
    </div>
  );
}
