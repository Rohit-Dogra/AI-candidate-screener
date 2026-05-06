const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

export function normalizeScore(input: string | number): number {
  if (typeof input === "number") {
    return Math.max(1, Math.min(10, Number(input.toFixed(2))));
  }
  const value = input.trim().toLowerCase();
  const numberMatch = value.match(/\d+(\.\d+)?/);
  if (numberMatch) {
    const numeric = Number(numberMatch[0]);
    return Math.max(1, Math.min(10, Number(numeric.toFixed(2))));
  }
  if (value in NUMBER_WORDS) {
    return NUMBER_WORDS[value];
  }
  return 5;
}

export function scoreClass(score: number): string {
  if (score < 5) return "bg-red-100 text-red-700";
  if (score <= 7) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
}
