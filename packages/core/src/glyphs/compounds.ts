/**
 * Glyph compounds from Semantic Glyph System v2.0
 *
 * Compounds combine glyphs to express relationships.
 * Limit: 3 semantic glyphs per statement.
 */

import type { GlyphCompound } from '../types';

/**
 * All valid glyph compounds
 */
export const COMPOUNDS: Record<string, GlyphCompound> = {
  // Agency Compounds
  '⦿⌁': {
    symbols: '⦿⌁',
    components: ['⦿', '⌁'],
    meaning: 'Intent oriented toward action',
    compoundCategory: 'agency',
  },
  '⌁⦿': {
    symbols: '⌁⦿',
    components: ['⌁', '⦿'],
    meaning: 'Purposeful execution',
    compoundCategory: 'agency',
  },
  '⌁↻': {
    symbols: '⌁↻',
    components: ['⌁', '↻'],
    meaning: 'Practice (repeated execution)',
    compoundCategory: 'agency',
  },
  '⦿↑': {
    symbols: '⦿↑',
    components: ['⦿', '↑'],
    meaning: 'Abstract purpose / telos',
    compoundCategory: 'agency',
  },
  '⦿↓': {
    symbols: '⦿↓',
    components: ['⦿', '↓'],
    meaning: 'Concrete aim / specific goal',
    compoundCategory: 'agency',
  },
  '⦿⚠': {
    symbols: '⦿⚠',
    components: ['⦿', '⚠'],
    meaning: 'Bounded intent (purpose with limits)',
    compoundCategory: 'agency',
  },

  // Epistemic Compounds
  '◇→': {
    symbols: '◇→',
    components: ['◇', '→'],
    meaning: 'Hypothetical causation ("if A then B, tentatively")',
    compoundCategory: 'epistemic',
  },
  '¿→': {
    symbols: '¿→',
    components: ['¿', '→'],
    meaning: 'Question about causation',
    compoundCategory: 'epistemic',
  },
  '◇★': {
    symbols: '◇★',
    components: ['◇', '★'],
    meaning: 'Anchored hypothesis (tentative but worth keeping)',
    compoundCategory: 'epistemic',
  },
  '✓§': {
    symbols: '✓§',
    components: ['✓', '§'],
    meaning: 'Verified source',
    compoundCategory: 'epistemic',
  },

  // Structural Compounds
  '⌂→': {
    symbols: '⌂→',
    components: ['⌂', '→'],
    meaning: 'Schema produces (organizing idea leads to...)',
    compoundCategory: 'structural',
  },
  '↑⌂': {
    symbols: '↑⌂',
    components: ['↑', '⌂'],
    meaning: 'Meta-schema / abstract principle',
    compoundCategory: 'structural',
  },
  '↓■': {
    symbols: '↓■',
    components: ['↓', '■'],
    meaning: 'Concrete definition',
    compoundCategory: 'structural',
  },
};

/**
 * Get all compounds as an array
 */
export function getAllCompounds(): GlyphCompound[] {
  return Object.values(COMPOUNDS);
}

/**
 * Get a compound by its symbols
 */
export function getCompound(symbols: string): GlyphCompound | undefined {
  return COMPOUNDS[symbols];
}

/**
 * Check if a string is a valid compound
 */
export function isCompound(str: string): boolean {
  return str in COMPOUNDS;
}

/**
 * Get compounds by category
 */
export function getCompoundsByCategory(
  category: 'agency' | 'epistemic' | 'structural'
): GlyphCompound[] {
  return getAllCompounds().filter((c) => c.compoundCategory === category);
}

/**
 * Try to parse a compound from a string starting at position
 * Returns the compound and length consumed, or null if not a compound
 */
export function parseCompoundAt(
  text: string,
  position: number
): { compound: GlyphCompound; length: number } | null {
  // Try 3-char compounds first (theoretically possible), then 2-char
  for (const len of [3, 2]) {
    const candidate = text.slice(position, position + len);
    const compound = COMPOUNDS[candidate];
    if (compound) {
      return { compound, length: len };
    }
  }
  return null;
}

/**
 * All compound symbols for quick lookup
 */
export const COMPOUND_SYMBOLS = new Set(Object.keys(COMPOUNDS));

/**
 * Maximum compound length (for parsing optimization)
 */
export const MAX_COMPOUND_LENGTH = Math.max(
  ...Object.keys(COMPOUNDS).map((s) => s.length)
);
