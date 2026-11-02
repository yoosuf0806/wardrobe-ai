// Occasion catalogue: maps a free-text or dropdown occasion to a formality window.

export interface OccasionProfile {
  key: string;
  label: string;
  formality: [number, number]; // inclusive target range on the 1..10 scale
  keywords: string[];
}

export const OCCASIONS: OccasionProfile[] = [
  { key: "gym", label: "Gym / Workout", formality: [1, 2], keywords: ["gym", "workout", "run", "yoga", "training", "sport"] },
  { key: "lounge", label: "Lounging at home", formality: [1, 3], keywords: ["home", "lounge", "relax", "chill"] },
  { key: "errands", label: "Errands / Weekend", formality: [2, 4], keywords: ["errand", "grocer", "weekend", "market", "brunch"] },
  { key: "casual", label: "Casual day out", formality: [3, 5], keywords: ["casual", "friends", "hangout", "coffee", "travel", "mall"] },
  { key: "date", label: "Date night", formality: [5, 7], keywords: ["date", "romantic", "drinks"] },
  { key: "business_casual", label: "Business casual / Office", formality: [5, 7], keywords: ["office", "work", "business casual", "meeting"] },
  { key: "party", label: "Party / Night out", formality: [5, 8], keywords: ["party", "club", "night out", "birthday", "concert"] },
  { key: "dinner", label: "Dinner at a nice restaurant", formality: [6, 8], keywords: ["dinner", "restaurant"] },
  { key: "interview", label: "Job interview", formality: [7, 9], keywords: ["interview", "presentation", "pitch"] },
  { key: "business_formal", label: "Business formal", formality: [8, 9], keywords: ["formal meeting", "business formal", "board", "conference"] },
  { key: "wedding_guest", label: "Wedding guest", formality: [7, 9], keywords: ["wedding", "engagement", "ceremony", "cocktail"] },
  { key: "black_tie", label: "Black tie / Gala", formality: [9, 10], keywords: ["black tie", "gala", "ball", "opera", "white tie"] },
];

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
