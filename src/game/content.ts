import type { Badge } from "./types";

export const RICH: Record<string, { example: string; cloze: string; hint: string }> = {
  flowers: {
    example: "Wild flowers line the stone path.",
    cloze: "Wild ______ line the stone path.",
    hint: "Sustantivo plural. En español: flores.",
  },
  love: {
    example: "Love can begin with a quiet promise.",
    cloze: "______ can begin with a quiet promise.",
    hint: "Un sentimiento profundo. En español: amor.",
  },
  strong: {
    example: "She felt strong after the long climb.",
    cloze: "She felt ______ after the long climb.",
    hint: "Adjetivo de fortaleza. En español: fuerte.",
  },
  happiness: {
    example: "Happiness arrived in small bright pieces.",
    cloze: "______ arrived in small bright pieces.",
    hint: "Estado de alegría. En español: felicidad.",
  },
  freedom: {
    example: "Freedom meant choosing her own morning.",
    cloze: "______ meant choosing her own morning.",
    hint: "Poder decidir por uno mismo. En español: libertad.",
  },
  alone: {
    example: "Walking alone felt calm, not empty.",
    cloze: "Walking ______ felt calm, not empty.",
    hint: "Sin compañía. En español: solo.",
  },
  myself: {
    example: "I kept a letter for myself in the drawer.",
    cloze: "I kept a letter for ______ in the drawer.",
    hint: "Pronombre reflexivo de I. En español: yo mismo.",
  },
  heart: {
    example: "Her heart stayed steady in the wind.",
    cloze: "Her ______ stayed steady in the wind.",
    hint: "También nombra lo que sentimos. En español: corazón.",
  },
  power: {
    example: "Quiet power can move a whole garden.",
    cloze: "Quiet ______ can move a whole garden.",
    hint: "Capacidad o fuerza. En español: poder.",
  },
  confidence: {
    example: "Confidence grew with every careful step.",
    cloze: "______ grew with every careful step.",
    hint: "Seguridad personal. En español: confianza.",
  },
  independent: {
    example: "An independent mind makes its own path.",
    cloze: "An ______ mind makes its own path.",
    hint: "Que decide por su cuenta. En español: independiente.",
  },
  celebrate: {
    example: "They celebrate small victories at dusk.",
    cloze: "They ______ small victories at dusk.",
    hint: "Verbo: festejar. En español: celebrar.",
  },
  beautiful: {
    example: "The evening looked beautiful and gold.",
    cloze: "The evening looked ______ and gold.",
    hint: "Adjetivo de belleza. En español: hermoso.",
  },
  grow: {
    example: "Seeds grow when they finally find light.",
    cloze: "Seeds ______ when they finally find light.",
    hint: "Verbo: desarrollarse. En español: crecer.",
  },
  believe: {
    example: "Believe in the next season of your life.",
    cloze: "______ in the next season of your life.",
    hint: "Verbo: tener por cierto. En español: creer.",
  },
};

export const DEFAULT_ORDER = [
  "flowers",
  "love",
  "strong",
  "happiness",
  "freedom",
  "alone",
  "myself",
  "heart",
  "power",
  "confidence",
  "independent",
  "celebrate",
  "beautiful",
  "grow",
  "believe",
] as const;

export const FLOWERS = [
  "Copa de alba",
  "Campana de jade",
  "Corazón de oro",
  "Orquídea de niebla",
  "Lirio cinta",
  "Espiga solar",
  "Amapola de bruma",
  "Corona final",
] as const;

export const BADGES: Badge[] = [
  { id: "first-bloom", name: "Primer brote", desc: "Terminaste tu primera partida." },
  { id: "streak-5", name: "Racha de cinco", desc: "Cinco aciertos seguidos." },
  { id: "perfect-dash", name: "Relámpago", desc: "Word Dash sin errores." },
  { id: "match-clean", name: "Jardín exacto", desc: "Bloom Match sin fallos." },
  { id: "boss", name: "Domador del Marchito", desc: "Venciste a The Bloom Boss." },
  { id: "class-champ", name: "Aula en flor", desc: "Cerraste una ronda de Classroom Mode." },
  { id: "wordsmith", name: "Sembrador", desc: "Dominaste 10 palabras." },
  { id: "level-3", name: "Jardinero", desc: "Alcanzaste el nivel 3." },
];

export const LEVEL_STEPS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];

export const DECOY_ES = [
  "lápiz",
  "ventana",
  "mercado",
  "pan",
  "reloj",
  "puente",
  "bolsillo",
  "espejo",
  "nube",
  "isla",
  "zapato",
  "llave",
  "mapa",
  "cocina",
  "invierno",
  "sombrero",
  "playa",
  "queso",
  "tren",
  "silla",
];

export const DECOY_EN = [
  "pencil",
  "window",
  "market",
  "bread",
  "clock",
  "bridge",
  "pocket",
  "mirror",
  "cloud",
  "island",
  "shoe",
  "key",
  "map",
  "kitchen",
  "hat",
  "beach",
  "cheese",
  "train",
  "chair",
  "bottle",
];
