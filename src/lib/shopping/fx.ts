// Approximate exchange rates (units per 1 USD) used only to compare a user's
// budget with marketplace prices. Override with FX_RATES='{"LKR":300}'.
const DEFAULT_RATES: Record<string, number> = { USD: 1, LKR: 300, PKR: 280, BDT: 120, NPR: 135, INR: 84, EUR: 0.92, GBP: 0.79, AED: 3.67 };

function rates(): Record<string, number> {
  try {
    return { ...DEFAULT_RATES, ...(process.env.FX_RATES ? JSON.parse(process.env.FX_RATES) : {}) };
  } catch {
    return DEFAULT_RATES;
  }
}

export function convert(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const r = rates();
  if (!r[from] || !r[to]) return amount;
  return (amount / r[from]) * r[to];
}

export const SUPPORTED_CURRENCIES = ["USD", "LKR", "PKR", "BDT", "NPR", "INR", "EUR", "GBP", "AED"];
