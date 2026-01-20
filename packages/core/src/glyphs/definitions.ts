/**
 * Complete glyph definitions from Semantic Glyph System v2.0
 */

import type { Glyph, GlyphCategory } from '../types';

// Color palette by category
const COLORS: Record<GlyphCategory, string> = {
  level: '#6366f1',      // Indigo
  magnitude: '#f59e0b',  // Amber
  epistemic: '#10b981',  // Emerald
  structural: '#8b5cf6', // Violet
  causal: '#ef4444',     // Red
  centrality: '#3b82f6', // Blue
  provenance: '#6b7280', // Gray
  boundary: '#f97316',   // Orange
  salience: '#eab308',   // Yellow
  framing: '#14b8a6',    // Teal
  agency: '#ec4899',     // Pink
};

/**
 * All 22 semantic glyphs organized by category
 */
export const GLYPHS: Record<string, Glyph> = {
  // Level / Scope
  '↑': {
    symbol: '↑',
    name: 'Abstraction',
    category: 'level',
    description: 'Zoom out, general principle',
    pair: '↓',
    color: COLORS.level,
    isBase: true,
  },
  '↓': {
    symbol: '↓',
    name: 'Concretization',
    category: 'level',
    description: 'Zoom in, specific instance',
    pair: '↑',
    color: COLORS.level,
    isBase: false,
  },

  // Magnitude / Intensity
  '▲': {
    symbol: '▲',
    name: 'Increase',
    category: 'magnitude',
    description: 'Intensify, strengthen',
    pair: '▼',
    color: COLORS.magnitude,
    isBase: true,
  },
  '▼': {
    symbol: '▼',
    name: 'Decrease',
    category: 'magnitude',
    description: 'Weaken, attenuate',
    pair: '▲',
    color: COLORS.magnitude,
    isBase: false,
  },

  // Epistemic Stance
  '◇': {
    symbol: '◇',
    name: 'Hypothesis',
    category: 'epistemic',
    description: 'Tentative answer offered',
    pair: '¿',
    color: COLORS.epistemic,
    isBase: true,
  },
  '¿': {
    symbol: '¿',
    name: 'Inquiry',
    category: 'epistemic',
    description: 'Open question, no answer yet',
    pair: '◇',
    color: COLORS.epistemic,
    isBase: false,
  },

  // Structural Relation
  '⊗': {
    symbol: '⊗',
    name: 'Interaction',
    category: 'structural',
    description: 'Coupling, co-determining factors',
    pair: '⇄',
    color: COLORS.structural,
    isBase: true,
  },
  '⇄': {
    symbol: '⇄',
    name: 'Contrast',
    category: 'structural',
    description: 'Comparison, examine side by side',
    pair: '⊗',
    color: COLORS.structural,
    isBase: false,
  },

  // Causal Dynamics
  '→': {
    symbol: '→',
    name: 'Causation',
    category: 'causal',
    description: 'A influences or produces B',
    pair: '↻',
    color: COLORS.causal,
    isBase: true,
  },
  '↻': {
    symbol: '↻',
    name: 'Feedback',
    category: 'causal',
    description: 'Effect returns to influence cause',
    pair: '→',
    color: COLORS.causal,
    isBase: false,
  },

  // Centrality & Definition
  '⌂': {
    symbol: '⌂',
    name: 'Core Schema',
    category: 'centrality',
    description: 'Conceptual home, organizing idea',
    pair: '■',
    color: COLORS.centrality,
    isBase: true,
  },
  '■': {
    symbol: '■',
    name: 'Definition',
    category: 'centrality',
    description: 'This term means this here',
    pair: '⌂',
    color: COLORS.centrality,
    isBase: false,
  },

  // Provenance
  '§': {
    symbol: '§',
    name: 'Sourced',
    category: 'provenance',
    description: 'Comes from elsewhere, inherited',
    pair: '—',
    color: COLORS.provenance,
    isBase: true,
  },
  '—': {
    symbol: '—',
    name: 'Self-originated',
    category: 'provenance',
    description: 'Reasoned or observed here',
    pair: '§',
    color: COLORS.provenance,
    isBase: false,
  },

  // Boundary / Limits
  '⚠': {
    symbol: '⚠',
    name: 'Caution',
    category: 'boundary',
    description: 'Exception, boundary case',
    pair: 'ת',
    color: COLORS.boundary,
    isBase: true,
  },
  'ת': {
    symbol: 'ת',
    name: 'Completion',
    category: 'boundary',
    description: 'Hard limit, end condition, seal',
    pair: '⚠',
    color: COLORS.boundary,
    isBase: false,
  },

  // Salience & Confidence
  '★': {
    symbol: '★',
    name: 'Anchor',
    category: 'salience',
    description: 'Worth remembering, retrieval anchor',
    pair: '✓',
    color: COLORS.salience,
    isBase: true,
  },
  '✓': {
    symbol: '✓',
    name: 'Accepted',
    category: 'salience',
    description: 'High confidence, reliable',
    pair: '★',
    color: COLORS.salience,
    isBase: false,
  },

  // Framing
  '←': {
    symbol: '←',
    name: 'Precedent',
    category: 'framing',
    description: 'Past, historical context',
    pair: '≈',
    color: COLORS.framing,
    isBase: true,
  },
  '≈': {
    symbol: '≈',
    name: 'Analogy',
    category: 'framing',
    description: 'Understand via similarity',
    pair: '←',
    color: COLORS.framing,
    isBase: false,
  },

  // Agency
  '⦿': {
    symbol: '⦿',
    name: 'Intent',
    category: 'agency',
    description: 'Directed purpose, aim, telos',
    pair: '⌁',
    color: COLORS.agency,
    isBase: true,
  },
  '⌁': {
    symbol: '⌁',
    name: 'Execution',
    category: 'agency',
    description: 'Enacted will, action taken',
    pair: '⦿',
    color: COLORS.agency,
    isBase: false,
  },
};

/**
 * Get all glyphs as an array
 */
export function getAllGlyphs(): Glyph[] {
  return Object.values(GLYPHS);
}

/**
 * Get glyphs by category
 */
export function getGlyphsByCategory(category: GlyphCategory): Glyph[] {
  return getAllGlyphs().filter((g) => g.category === category);
}

/**
 * Get a glyph by its symbol
 */
export function getGlyph(symbol: string): Glyph | undefined {
  return GLYPHS[symbol];
}

/**
 * Check if a character is a known glyph
 */
export function isGlyph(char: string): boolean {
  return char in GLYPHS;
}

/**
 * Get the paired/inverse glyph
 */
export function getPairedGlyph(symbol: string): Glyph | undefined {
  const glyph = GLYPHS[symbol];
  if (glyph?.pair) {
    return GLYPHS[glyph.pair];
  }
  return undefined;
}

/**
 * All glyph symbols for quick lookup
 */
export const GLYPH_SYMBOLS = new Set(Object.keys(GLYPHS));

/**
 * Category colors for external use
 */
export { COLORS as CATEGORY_COLORS };
