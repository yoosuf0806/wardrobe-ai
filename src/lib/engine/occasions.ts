// Occasion catalogue: maps a free-text or dropdown occasion to a formality window.

export interface OccasionProfile {
  key: string;
  label: string;
  formality: [number, number]; // inclusive target range on the 1..10 scale
  keywords: string[];
}

export const OCCASIONS: OccasionProfile[] = [
  // Quick picks shown as chips on the Stylist screen
  { key: "office", label: "Office", formality: [5, 7], keywords: ["office", "work", "business casual", "meeting"] },
  { key: "casual_date", label: "Casual Date", formality: [4, 6], keywords: ["casual date", "coffee date", "lunch date"] },
  { key: "formal_event", label: "Formal Event", formality: [8, 9], keywords: ["formal", "wedding", "ceremony", "cocktail", "engagement"] },
  { key: "gym", label: "Gym", formality: [1, 2], keywords: ["gym", "workout", "run", "yoga", "training", "sport"] },
  { key: "party", label: "Party", formality: [5, 8], keywords: ["party", "club", "night out", "birthday", "concert"] },
  // Reached through free text
  { key: "lounge", label: "Lounging at home", formality: [1, 3], keywords: ["home", "lounge", "relax", "chill"] },
  { key: "errands", label: "Errands", formality: [2, 4], keywords: ["errand", "grocer", "weekend", "market", "brunch"] },
  { key: "casual", label: "Casual day out", formality: [3, 5], keywords: ["casual", "friends", "hangout", "travel", "mall"] },
  { key: "date", label: "Date night", formality: [5, 7], keywords: ["date", "romantic", "drinks"] },
  { key: "dinner", label: "Dinner out", formality: [6, 8], keywords: ["dinner", "restaurant"] },
  { key: "interview", label: "Job interview", formality: [7, 9], keywords: ["interview", "presentation", "pitch"] },
  { key: "business_formal", label: "Business formal", formality: [8, 9], keywords: ["business formal", "board", "conference"] },
  { key: "black_tie", label: "Black tie", formality: [9, 10], keywords: ["black tie", "gala", "ball", "opera", "white tie"] },
];

export const QUICK_OCCASIONS = OCCASIONS.slice(0, 5);

/** Canonical label for a logged occasion ("Business casual / Office" → "Office"); free text is kept. */
export function canonicalOccasionLabel(text: string): string {
  const r = resolveOccasion(text);
  return OCCASIONS.find((o) => o.key === r.key)?.label ?? r.label;
}

export function resolveOccasion(rawInput: string, formalityOverride?: number | null): OccasionProfile {
  const input = rawInput.trim().replace(/^\w/, (c) => c.toUpperCase());
  const text = input.toLowerCase();
  let match =
    OCCASIONS.find((o) => o.key === text || o.label.toLowerCase() === text) ??
    // prefer the longest keyword hit ("black tie" over "tie")
    OCCASIONS.map((o) => ({ o, hit: Math.max(0, ...o.keywords.filter((k) => text.includes(k)).map((k) => k.length)) }))
      .filter((x) => x.hit > 0)
      .sort((a, b) => b.hit - a.hit)[0]?.o;

  if (!match) match = { key: "custom", label: input || "Everyday", formality: [3, 5], keywords: [] };
  if (formalityOverride && formalityOverride >= 1 && formalityOverride <= 10) {
    const f = Math.round(formalityOverride);
    return { ...match, label: input || match.label, formality: [Math.max(1, f - 1), Math.min(10, f + 1)] };
  }
  return { ...match, label: input || match.label };
}
