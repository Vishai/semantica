/**
 * Dot Signature Primitives
 *
 * The system uses Roman numeral-style counting with three base units.
 * DotIds are valid only within a note boundary (local variables, not global IDs).
 */

import type { DotId, DotPrimitive } from '../types';

/**
 * Dot primitive definitions
 */
export const DOT_PRIMITIVES = {
  UNIT: '•' as const,        // U+2022 - value 1
  FIVE: '○' as const,        // U+25CB - value 5
  TEN: '⦿' as const,         // U+29BF - value 10
} as const;

/**
 * Unicode points for primitives
 */
export const DOT_UNICODE = {
  '•': 'U+2022',
  '○': 'U+25CB',
  '⦿': 'U+29BF',
} as const;

/**
 * Nikkud-size variants for rendered output
 */
export const DOT_NIKKUD = {
  UNIT: '·' as const,        // U+00B7 - middle dot
  FIVE: '◦' as const,        // U+25E6 - white bullet
  TEN: '⦿' as const,         // Same as full size for ten
} as const;

/**
 * Numeric values of primitives
 */
export const DOT_VALUES: Record<DotPrimitive, number> = {
  '•': 1,
  '○': 5,
  '⦿': 10,
};

/**
 * All 10 DotId definitions
 *
 * Counting system (from v2.0 spec):
 * - 1-3: additive units
 * - 4: subtractive (1 before 5)
 * - 5: five-unit
 * - 6-7: additive from 5
 * - 8: subtractive cluster (2 before 10)
 * - 9: subtractive (1 before 10)
 * - 10: ten-unit
 */
export const DOT_IDS: DotId[] = [
  {
    value: 1,
    signature: '•',
    primitives: ['•'],
    isCluster: false,
  },
  {
    value: 2,
    signature: '••',
    primitives: ['•', '•'],
    isCluster: false,
  },
  {
    value: 3,
    signature: '•••',
    primitives: ['•', '•', '•'],
    isCluster: true, // Grape cluster pattern
  },
  {
    value: 4,
    signature: '•○',
    primitives: ['•', '○'],
    isCluster: false,
  },
  {
    value: 5,
    signature: '○',
    primitives: ['○'],
    isCluster: false,
  },
  {
    value: 6,
    signature: '○•',
    primitives: ['○', '•'],
    isCluster: false,
  },
  {
    value: 7,
    signature: '○••',
    primitives: ['○', '•', '•'],
    isCluster: true, // Grape cluster pattern
  },
  {
    value: 8,
    signature: '••⦿',
    primitives: ['•', '•', '⦿'],
    isCluster: true, // Grape cluster pattern
  },
  {
    value: 9,
    signature: '•⦿',
    primitives: ['•', '⦿'],
    isCluster: false,
  },
  {
    value: 10,
    signature: '⦿',
    primitives: ['⦿'],
    isCluster: false,
  },
];

/**
 * Map from signature string to DotId
 */
export const SIGNATURE_TO_DOTID = new Map<string, DotId>(
  DOT_IDS.map((d) => [d.signature, d])
);

/**
 * Map from value to DotId
 */
export const VALUE_TO_DOTID = new Map<number, DotId>(
  DOT_IDS.map((d) => [d.value, d])
);

/**
 * Get a DotId by its numeric value
 */
export function getDotIdByValue(value: number): DotId | undefined {
  return VALUE_TO_DOTID.get(value);
}

/**
 * Get a DotId by its signature string
 */
export function getDotIdBySignature(signature: string): DotId | undefined {
  return SIGNATURE_TO_DOTID.get(signature);
}

/**
 * Check if a string is a valid dot signature
 */
export function isValidSignature(signature: string): boolean {
  return SIGNATURE_TO_DOTID.has(signature);
}

/**
 * Get the next available DotId after the given value
 */
export function getNextDotId(currentMax: number): DotId | undefined {
  if (currentMax >= 10) return undefined;
  return getDotIdByValue(currentMax + 1);
}

/**
 * Grape cluster rendering patterns
 * These render as two elements on top, one centered below
 */
export const CLUSTER_PATTERNS: Record<number, { top: string[]; bottom: string }> = {
  3: { top: ['•', '•'], bottom: '•' },
  7: { top: ['○', '•'], bottom: '•' },
  8: { top: ['•', '•'], bottom: '⦿' },
};

/**
 * Convert a signature to nikkud-size for rendering
 */
export function toNikkudSize(signature: string): string {
  return signature
    .replace(/•/g, DOT_NIKKUD.UNIT)
    .replace(/○/g, DOT_NIKKUD.FIVE);
  // ⦿ stays the same
}

/**
 * All characters that can appear in a dot signature
 */
export const DOT_CHARS = new Set(['•', '○', '⦿']);

/**
 * Check if a character is a dot primitive
 */
export function isDotChar(char: string): boolean {
  return DOT_CHARS.has(char);
}
