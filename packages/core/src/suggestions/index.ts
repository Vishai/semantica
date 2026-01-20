/**
 * Suggestion engine exports
 */

export {
  SUGGESTION_RULES,
  matchRules,
  isAtSentenceStart,
  getCurrentSentence,
  type SuggestionRule,
} from './rules';

export {
  trackNouns,
  trackPronouns,
  suggestDotIdsFromPronouns,
  suggestDotIdsFromRepetition,
  type NounType,
  type TrackedNoun,
  type TrackedPronoun,
} from './noun-tracker';

import type { GlyphSuggestion, DotIdSuggestion, DotDeclaration, GlyphCategory } from '../types';
import { matchRules, isAtSentenceStart } from './rules';
import { suggestDotIdsFromPronouns, suggestDotIdsFromRepetition } from './noun-tracker';
import { getGlyphsByCategory } from '../glyphs/definitions';

/**
 * Combined suggestion result
 */
export interface SuggestionResult {
  /** Suggested glyphs */
  glyphs: GlyphSuggestion[];
  /** Suggested DotId operations */
  dotIds: DotIdSuggestion[];
  /** Is cursor at sentence start? */
  atSentenceStart: boolean;
}

/**
 * Get all suggestions for a given text and cursor position
 */
export function getSuggestions(
  text: string,
  cursorPosition: number,
  existingDeclarations: DotDeclaration[] = []
): SuggestionResult {
  // Get glyph suggestions from rule matching
  const glyphSuggestions = matchRules(text, cursorPosition);

  // Check sentence position
  const atSentenceStart = isAtSentenceStart(text, cursorPosition);

  // If at sentence start, boost certain glyphs
  if (atSentenceStart) {
    // Add sentence-initial glyphs if not already suggested
    const sentenceStartGlyphs = ['◇', '¿', '↑', '↓', '⌂', '■', '§'];
    for (const symbol of sentenceStartGlyphs) {
      if (!glyphSuggestions.find((s) => s.glyph.symbol === symbol)) {
        const category = getCategoryForGlyph(symbol);
        if (category) {
          const glyph = getGlyphsByCategory(category).find(
            (g) => g.symbol === symbol
          );
          if (glyph) {
            glyphSuggestions.push({
              glyph,
              confidence: 0.2,
              reason: 'Available at sentence start',
              context: 'sentence_start',
            });
          }
        }
      }
    }
  }

  // Get DotId suggestions
  const pronounSuggestions = suggestDotIdsFromPronouns(text, existingDeclarations);
  const repetitionSuggestions = suggestDotIdsFromRepetition(text, existingDeclarations);

  // Combine and deduplicate DotId suggestions
  const dotIdSuggestions = deduplicateDotIdSuggestions([
    ...pronounSuggestions,
    ...repetitionSuggestions,
  ]);

  // Sort glyphs by confidence
  glyphSuggestions.sort((a, b) => b.confidence - a.confidence);

  return {
    glyphs: glyphSuggestions,
    dotIds: dotIdSuggestions,
    atSentenceStart,
  };
}

/**
 * Helper: get category for a glyph symbol
 */
function getCategoryForGlyph(symbol: string): GlyphCategory | null {
  const categoryMap: Record<string, GlyphCategory> = {
    '↑': 'level',
    '↓': 'level',
    '▲': 'magnitude',
    '▼': 'magnitude',
    '◇': 'epistemic',
    '¿': 'epistemic',
    '⊗': 'structural',
    '⇄': 'structural',
    '→': 'causal',
    '↻': 'causal',
    '⌂': 'centrality',
    '■': 'centrality',
    '§': 'provenance',
    '—': 'provenance',
    '⚠': 'boundary',
    'ת': 'boundary',
    '★': 'salience',
    '✓': 'salience',
    '←': 'framing',
    '≈': 'framing',
    '⦿': 'agency',
    '⌁': 'agency',
  };
  return categoryMap[symbol] || null;
}

/**
 * Deduplicate DotId suggestions by term
 */
function deduplicateDotIdSuggestions(
  suggestions: DotIdSuggestion[]
): DotIdSuggestion[] {
  const seen = new Set<string>();
  const result: DotIdSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = suggestion.term?.toLowerCase() || '';
    if (!seen.has(key)) {
      seen.add(key);
      result.push(suggestion);
    }
  }

  // Sort by confidence
  result.sort((a, b) => b.confidence - a.confidence);

  return result;
}
