/** Default spot-prime material: 10% of a full primer coat by coverage. */
export const DEFAULT_SPOT_PRIME_MATERIAL_PCT = 10;

/** @deprecated Use spotPrimeCoatFactor(spotPrimeMaterialPct) */
export const SPOT_PRIME_COAT_FACTOR =
  DEFAULT_SPOT_PRIME_MATERIAL_PCT / 100;

export type PrimerCoatInput = {
  primer_coats: number;
  primer_spot_prime?: boolean;
};

export function spotPrimeCoatFactor(materialPct?: number | null): number {
  const pct = materialPct ?? DEFAULT_SPOT_PRIME_MATERIAL_PCT;
  return Math.max(0, pct) / 100;
}

export function effectivePrimerCoats(
  config: PrimerCoatInput,
  spotPrimeMaterialPct?: number | null,
): number {
  if (config.primer_spot_prime) {
    const fullCoats = Math.max(config.primer_coats || 1, 1);
    return fullCoats * spotPrimeCoatFactor(spotPrimeMaterialPct);
  }
  return Math.max(config.primer_coats ?? 0, 0);
}