export type JuiceKind = "ok" | "bad" | "bloom" | "win";

const listeners = new Set<(kind: JuiceKind) => void>();

export const juice = {
  emit(kind: JuiceKind) {
    for (const listener of listeners) listener(kind);
  },
  on(listener: (kind: JuiceKind) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
