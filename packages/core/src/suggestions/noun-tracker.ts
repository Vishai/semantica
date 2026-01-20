/**
 * Noun Tracker for DotId Suggestions
 *
 * Lightweight NLP for detecting when DotIds would be helpful:
 * - Tracks noun phrases as they're introduced
 * - Detects pronouns that reference potentially ambiguous nouns
 * - Suggests adding DotIds to clarify references
 */

import type { DotIdSuggestion, DotDeclaration, DotId } from '../types';
import { getDotIdByValue } from '../dotid/primitives';

/**
 * Types of noun phrases we track
 */
export type NounType = 'proper' | 'capitalized' | 'quoted' | 'common';

/**
 * A tracked noun phrase
 */
export interface TrackedNoun {
  /** The noun text */
  text: string;
  /** Type of noun */
  type: NounType;
  /** Position in text (offset) */
  position: number;
  /** Line number */
  line: number;
  /** Has this noun been assigned a DotId? */
  hasDotId: boolean;
  /** The assigned DotId (if any) */
  dotId?: DotId;
}

/**
 * A detected pronoun with its potential referent
 */
export interface TrackedPronoun {
  /** The pronoun text */
  text: string;
  /** Position in text (offset) */
  position: number;
  /** Line number */
  line: number;
  /** Candidate nouns this could refer to */
  candidates: TrackedNoun[];
  /** Is the reference ambiguous (multiple candidates)? */
  isAmbiguous: boolean;
}

/**
 * Common pronouns that might need clarification
 */
const PRONOUNS = new Set([
  'it',
  'this',
  'that',
  'they',
  'them',
  'these',
  'those',
  'its',
  'their',
  'he',
  'she',
  'him',
  'her',
  'his',
  'hers',
  'which',
  'who',
  'whom',
  'the former',
  'the latter',
  'the first',
  'the second',
]);

/**
 * Words that typically introduce nouns
 */
const NOUN_INTRODUCERS = new Set([
  'the',
  'a',
  'an',
  'this',
  'that',
  'these',
  'those',
  'my',
  'your',
  'his',
  'her',
  'its',
  'our',
  'their',
]);

/**
 * Patterns to detect proper nouns and important terms
 */
const PROPER_NOUN_PATTERN = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
const QUOTED_TERM_PATTERN = /"([^"]+)"|'([^']+)'|"([^"]+)"|'([^']+)'/g;
const CAPITALIZED_PATTERN = /\b[A-Z][a-zA-Z]*\b/g;

/**
 * Track nouns in text
 */
export function trackNouns(text: string): TrackedNoun[] {
  const nouns: TrackedNoun[] = [];
  const seen = new Set<string>();

  // Track proper nouns (multi-word capitalized phrases)
  let match;
  const properPattern = new RegExp(PROPER_NOUN_PATTERN.source, 'g');
  while ((match = properPattern.exec(text)) !== null) {
    const term = match[0];
    if (!seen.has(term.toLowerCase())) {
      seen.add(term.toLowerCase());
      nouns.push({
        text: term,
        type: 'proper',
        position: match.index,
        line: getLineNumber(text, match.index),
        hasDotId: false,
      });
    }
  }

  // Track quoted terms
  const quotedPattern = new RegExp(QUOTED_TERM_PATTERN.source, 'g');
  while ((match = quotedPattern.exec(text)) !== null) {
    const term = match[1] || match[2] || match[3] || match[4];
    if (term && !seen.has(term.toLowerCase())) {
      seen.add(term.toLowerCase());
      nouns.push({
        text: term,
        type: 'quoted',
        position: match.index,
        line: getLineNumber(text, match.index),
        hasDotId: false,
      });
    }
  }

  // Track single capitalized words (if not already tracked)
  const capPattern = new RegExp(CAPITALIZED_PATTERN.source, 'g');
  while ((match = capPattern.exec(text)) !== null) {
    const term = match[0];
    // Skip common words, short words, and already-seen terms
    if (
      term.length > 2 &&
      !isCommonCapitalized(term) &&
      !seen.has(term.toLowerCase())
    ) {
      seen.add(term.toLowerCase());
      nouns.push({
        text: term,
        type: 'capitalized',
        position: match.index,
        line: getLineNumber(text, match.index),
        hasDotId: false,
      });
    }
  }

  // Sort by position
  nouns.sort((a, b) => a.position - b.position);

  return nouns;
}

/**
 * Track pronouns and find their potential referents
 */
export function trackPronouns(
  text: string,
  nouns: TrackedNoun[]
): TrackedPronoun[] {
  const pronouns: TrackedPronoun[] = [];
  const words = text.toLowerCase().split(/\s+/);

  let offset = 0;
  for (const word of words) {
    const cleanWord = word.replace(/[.,;:!?'"()[\]{}]/g, '');

    if (PRONOUNS.has(cleanWord)) {
      // Find candidate nouns (nouns that appear before this pronoun)
      const candidates = nouns.filter(
        (n) => n.position < offset && !n.hasDotId
      );

      // Get the most recent candidates (within ~200 chars or same paragraph)
      const recentCandidates = filterRecentCandidates(
        candidates,
        text,
        offset
      );

      if (recentCandidates.length > 0) {
        pronouns.push({
          text: cleanWord,
          position: offset,
          line: getLineNumber(text, offset),
          candidates: recentCandidates,
          isAmbiguous: recentCandidates.length > 1,
        });
      }
    }

    offset += word.length + 1; // +1 for space
  }

  return pronouns;
}

/**
 * Filter to recent/relevant candidate nouns
 */
function filterRecentCandidates(
  candidates: TrackedNoun[],
  text: string,
  pronounPosition: number,
  maxDistance = 300
): TrackedNoun[] {
  // Get candidates within distance
  const nearby = candidates.filter(
    (c) => pronounPosition - c.position < maxDistance
  );

  // Check for paragraph boundary
  const paragraphStart = text.lastIndexOf('\n\n', pronounPosition);
  const inParagraph = nearby.filter(
    (c) => c.position > paragraphStart
  );

  // Prefer in-paragraph candidates, fall back to nearby
  return inParagraph.length > 0 ? inParagraph : nearby.slice(-3);
}

/**
 * Generate DotId suggestions based on pronoun ambiguity
 */
export function suggestDotIdsFromPronouns(
  text: string,
  existingDeclarations: DotDeclaration[]
): DotIdSuggestion[] {
  const suggestions: DotIdSuggestion[] = [];
  const nouns = trackNouns(text);

  // Mark nouns that already have DotIds
  for (const decl of existingDeclarations) {
    const noun = nouns.find(
      (n) => n.text.toLowerCase() === decl.term.toLowerCase()
    );
    if (noun) {
      noun.hasDotId = true;
      noun.dotId = decl.dotId;
    }
  }

  // Find pronouns with ambiguous references
  const pronouns = trackPronouns(text, nouns);
  const usedDotIds = new Set(existingDeclarations.map((d) => d.dotId.value));

  // Suggest DotIds for nouns referenced by ambiguous pronouns
  let nextDotIdValue = 1;
  for (const pronoun of pronouns) {
    if (pronoun.isAmbiguous) {
      for (const candidate of pronoun.candidates) {
        if (!candidate.hasDotId) {
          // Find next available DotId
          while (usedDotIds.has(nextDotIdValue) && nextDotIdValue <= 10) {
            nextDotIdValue++;
          }

          if (nextDotIdValue <= 10) {
            const dotId = getDotIdByValue(nextDotIdValue);
            if (dotId) {
              suggestions.push({
                action: 'add_declaration',
                term: candidate.text,
                dotId,
                reason: `"${pronoun.text}" could refer to multiple things. Adding a DotId to "${candidate.text}" would clarify.`,
                confidence: 0.7,
              });
              usedDotIds.add(nextDotIdValue);
              candidate.hasDotId = true;
              candidate.dotId = dotId;
            }
          }
        }
      }
    }
  }

  return suggestions;
}

/**
 * Get nouns that would benefit from DotIds
 * (important terms that are referenced multiple times)
 */
export function suggestDotIdsFromRepetition(
  text: string,
  existingDeclarations: DotDeclaration[]
): DotIdSuggestion[] {
  const suggestions: DotIdSuggestion[] = [];
  const nouns = trackNouns(text);

  // Count how many times each noun appears
  const counts = new Map<string, number>();
  const positions = new Map<string, number[]>();

  for (const noun of nouns) {
    const key = noun.text.toLowerCase();
    const pattern = new RegExp(`\\b${escapeRegex(noun.text)}\\b`, 'gi');
    let match;
    let count = 0;
    const positionList: number[] = [];

    while ((match = pattern.exec(text)) !== null) {
      count++;
      positionList.push(match.index);
    }

    counts.set(key, count);
    positions.set(key, positionList);
  }

  // Find nouns that appear 3+ times without DotIds
  const usedDotIds = new Set(existingDeclarations.map((d) => d.dotId.value));
  const declaredTerms = new Set(
    existingDeclarations.map((d) => d.term.toLowerCase())
  );

  let nextDotIdValue = 1;
  for (const noun of nouns) {
    const key = noun.text.toLowerCase();
    const count = counts.get(key) || 0;

    if (count >= 3 && !declaredTerms.has(key)) {
      while (usedDotIds.has(nextDotIdValue) && nextDotIdValue <= 10) {
        nextDotIdValue++;
      }

      if (nextDotIdValue <= 10) {
        const dotId = getDotIdByValue(nextDotIdValue);
        if (dotId) {
          suggestions.push({
            action: 'add_declaration',
            term: noun.text,
            dotId,
            reason: `"${noun.text}" appears ${count} times. A DotId would track references clearly.`,
            confidence: 0.6,
          });
          usedDotIds.add(nextDotIdValue);
          declaredTerms.add(key);
        }
      }
    }
  }

  return suggestions;
}

/**
 * Helper: get line number for offset
 */
function getLineNumber(text: string, offset: number): number {
  let line = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

/**
 * Helper: check if word is commonly capitalized (not a proper noun)
 */
function isCommonCapitalized(word: string): boolean {
  const common = new Set([
    'I',
    'The',
    'A',
    'An',
    'This',
    'That',
    'These',
    'Those',
    'It',
    'He',
    'She',
    'We',
    'They',
    'My',
    'Your',
    'His',
    'Her',
    'Its',
    'Our',
    'Their',
    'And',
    'But',
    'Or',
    'If',
    'When',
    'Where',
    'What',
    'Why',
    'How',
    'Is',
    'Are',
    'Was',
    'Were',
    'Be',
    'Been',
    'Being',
    'Have',
    'Has',
    'Had',
    'Do',
    'Does',
    'Did',
    'Will',
    'Would',
    'Could',
    'Should',
    'May',
    'Might',
    'Must',
    'Can',
  ]);
  return common.has(word);
}

/**
 * Helper: escape string for regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
