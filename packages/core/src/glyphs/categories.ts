/**
 * Semantic categories and their organization
 */

import type { GlyphCategory } from '../types';
import { getGlyphsByCategory, CATEGORY_COLORS } from './definitions';

export interface CategoryInfo {
  /** Category identifier */
  id: GlyphCategory;
  /** Display name */
  name: string;
  /** Category description */
  description: string;
  /** Guiding question for when to use */
  question: string;
  /** Display color */
  color: string;
  /** Base glyph symbol */
  baseGlyph: string;
  /** Alt/paired glyph symbol */
  altGlyph: string;
}

/**
 * All categories with metadata, ordered as in v2.0 spec
 */
export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'level',
    name: 'Level / Scope',
    description: 'How general is the claim?',
    question: 'How general is this?',
    color: CATEGORY_COLORS.level,
    baseGlyph: '↑',
    altGlyph: '↓',
  },
  {
    id: 'magnitude',
    name: 'Magnitude / Intensity',
    description: 'How strong is it?',
    question: 'How strong is it?',
    color: CATEGORY_COLORS.magnitude,
    baseGlyph: '▲',
    altGlyph: '▼',
  },
  {
    id: 'epistemic',
    name: 'Epistemic Stance',
    description: 'What is my relationship to truth here?',
    question: 'Am I claiming or asking?',
    color: CATEGORY_COLORS.epistemic,
    baseGlyph: '◇',
    altGlyph: '¿',
  },
  {
    id: 'structural',
    name: 'Structural Relation',
    description: 'How do things relate (statically)?',
    question: 'Is this structure or process?',
    color: CATEGORY_COLORS.structural,
    baseGlyph: '⊗',
    altGlyph: '⇄',
  },
  {
    id: 'causal',
    name: 'Causal Dynamics',
    description: 'What happens over time?',
    question: 'Is this structure or process?',
    color: CATEGORY_COLORS.causal,
    baseGlyph: '→',
    altGlyph: '↻',
  },
  {
    id: 'centrality',
    name: 'Centrality & Definition',
    description: 'What kind of thing is this?',
    question: 'Is this core or just a term?',
    color: CATEGORY_COLORS.centrality,
    baseGlyph: '⌂',
    altGlyph: '■',
  },
  {
    id: 'provenance',
    name: 'Provenance',
    description: 'Where did this come from?',
    question: 'Where did it come from?',
    color: CATEGORY_COLORS.provenance,
    baseGlyph: '§',
    altGlyph: '—',
  },
  {
    id: 'boundary',
    name: 'Boundary / Limits',
    description: 'Where does this stop applying?',
    question: 'Where does it stop?',
    color: CATEGORY_COLORS.boundary,
    baseGlyph: '⚠',
    altGlyph: 'ת',
  },
  {
    id: 'salience',
    name: 'Salience & Confidence',
    description: 'What do I keep or trust?',
    question: 'Do I keep or trust this?',
    color: CATEGORY_COLORS.salience,
    baseGlyph: '★',
    altGlyph: '✓',
  },
  {
    id: 'framing',
    name: 'Framing',
    description: 'How should this be interpreted?',
    question: 'Is this history or analogy?',
    color: CATEGORY_COLORS.framing,
    baseGlyph: '←',
    altGlyph: '≈',
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'What is willed and what is done?',
    question: 'Is this intent or action?',
    color: CATEGORY_COLORS.agency,
    baseGlyph: '⦿',
    altGlyph: '⌁',
  },
];

/**
 * Get category info by ID
 */
export function getCategory(id: GlyphCategory): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

/**
 * Get all categories
 */
export function getAllCategories(): CategoryInfo[] {
  return CATEGORIES;
}

/**
 * Get a category with its glyphs
 */
export function getCategoryWithGlyphs(id: GlyphCategory) {
  const category = getCategory(id);
  if (!category) return undefined;

  return {
    ...category,
    glyphs: getGlyphsByCategory(id),
  };
}

/**
 * Mental checklist questions for glyph selection
 * From v2.0 spec: "Before adding a glyph, ask..."
 */
export const MENTAL_CHECKLIST: Array<{
  question: string;
  glyphs: string[];
  category: GlyphCategory;
}> = [
  { question: 'How general is this?', glyphs: ['↑', '↓'], category: 'level' },
  { question: 'How strong is it?', glyphs: ['▲', '▼'], category: 'magnitude' },
  { question: 'Am I claiming or asking?', glyphs: ['◇', '¿'], category: 'epistemic' },
  {
    question: 'Is this structure or process?',
    glyphs: ['⊗', '⇄', '→', '↻'],
    category: 'structural',
  },
  { question: 'Is this core or just a term?', glyphs: ['⌂', '■'], category: 'centrality' },
  { question: 'Where did it come from?', glyphs: ['§', '—'], category: 'provenance' },
  { question: 'Where does it stop?', glyphs: ['⚠', 'ת'], category: 'boundary' },
  { question: 'Do I keep or trust this?', glyphs: ['★', '✓'], category: 'salience' },
  { question: 'Is this history or analogy?', glyphs: ['←', '≈'], category: 'framing' },
  { question: 'Is this intent or action?', glyphs: ['⦿', '⌁'], category: 'agency' },
];
