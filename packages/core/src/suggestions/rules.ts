/**
 * Rule-based glyph suggestion triggers
 *
 * Pattern matching for context-aware glyph suggestions.
 * These rules detect linguistic patterns that commonly correlate
 * with specific semantic meanings.
 */

import type { Glyph, GlyphSuggestion, SuggestionContext } from '../types';
import { getGlyph, getGlyphsByCategory } from '../glyphs/definitions';

/**
 * Rule definition for pattern-based suggestions
 */
export interface SuggestionRule {
  /** Unique identifier */
  id: string;
  /** Context this rule detects */
  context: SuggestionContext;
  /** Patterns to match (regex or string) */
  patterns: RegExp[];
  /** Glyphs to suggest when matched */
  glyphs: string[];
  /** Base confidence for this rule */
  confidence: number;
  /** Human-readable reason */
  reason: string;
}

/**
 * All suggestion rules
 */
export const SUGGESTION_RULES: SuggestionRule[] = [
  // Sentence start suggestions (position-based)
  {
    id: 'sentence_start_epistemic',
    context: 'sentence_start',
    patterns: [/^[\s]*$/], // Empty/whitespace = start of line
    glyphs: ['◇', '¿', '↑', '↓', '⌂', '■'],
    confidence: 0.3,
    reason: 'Sentence-initial position often benefits from epistemic or level markers',
  },

  // Causal language
  {
    id: 'causal_because',
    context: 'after_causal',
    patterns: [
      /\bbecause\b/i,
      /\btherefore\b/i,
      /\bthus\b/i,
      /\bhence\b/i,
      /\bconsequently\b/i,
      /\bas a result\b/i,
      /\bcauses?\b/i,
      /\bleads? to\b/i,
      /\bresults? in\b/i,
      /\bproduces?\b/i,
      /\bgenerates?\b/i,
    ],
    glyphs: ['→', '↻'],
    confidence: 0.75,
    reason: 'Causal language suggests causation (→) or feedback (↻) glyphs',
  },

  // Comparison language
  {
    id: 'comparison_contrast',
    context: 'after_comparison',
    patterns: [
      /\bunlike\b/i,
      /\bwhereas\b/i,
      /\bin contrast\b/i,
      /\bon the other hand\b/i,
      /\bcompared to\b/i,
      /\bvs\.?\b/i,
      /\bversus\b/i,
      /\bdiffers? from\b/i,
      /\bdistinct from\b/i,
    ],
    glyphs: ['⇄'],
    confidence: 0.8,
    reason: 'Comparison language suggests contrast (⇄) glyph',
  },

  // Analogy language
  {
    id: 'analogy',
    context: 'after_comparison',
    patterns: [
      /\bsimilar to\b/i,
      /\blike\b/i,
      /\banalogous to\b/i,
      /\bresembles?\b/i,
      /\bparallel to\b/i,
      /\bakin to\b/i,
      /\bjust as\b/i,
      /\bin the same way\b/i,
    ],
    glyphs: ['≈'],
    confidence: 0.75,
    reason: 'Analogy language suggests analogy (≈) glyph',
  },

  // Hedging / uncertainty
  {
    id: 'hedge_uncertainty',
    context: 'after_hedge',
    patterns: [
      /\bperhaps\b/i,
      /\bmaybe\b/i,
      /\bmight\b/i,
      /\bcould\b/i,
      /\bpossibly\b/i,
      /\bprobably\b/i,
      /\bseems?\b/i,
      /\bappears?\b/i,
      /\bi think\b/i,
      /\bi believe\b/i,
      /\btentatively\b/i,
      /\bprovisionally\b/i,
    ],
    glyphs: ['◇'],
    confidence: 0.7,
    reason: 'Hedging language suggests hypothesis (◇) glyph',
  },

  // Questions
  {
    id: 'question',
    context: 'question',
    patterns: [/\?$/, /^(what|why|how|when|where|who|which|whose)\b/i],
    glyphs: ['¿'],
    confidence: 0.85,
    reason: 'Questions benefit from inquiry (¿) glyph',
  },

  // Citations / sources
  {
    id: 'citation',
    context: 'citation',
    patterns: [
      /\baccording to\b/i,
      /\b\w+ (says?|said|argues?|argued|claims?|claimed|writes?|wrote)\b/i,
      /\bcited\b/i,
      /\bquoted?\b/i,
      /\bsource[ds]?\b/i,
      /\[\d+\]/, // Citation markers like [1]
      /\(\d{4}\)/, // Year citations like (2023)
    ],
    glyphs: ['§'],
    confidence: 0.8,
    reason: 'Citation language suggests sourced (§) glyph',
  },

  // Examples
  {
    id: 'example',
    context: 'example',
    patterns: [
      /\bfor (example|instance)\b/i,
      /\bsuch as\b/i,
      /\be\.g\.\b/i,
      /\bi\.e\.\b/i,
      /\bnamely\b/i,
      /\bspecifically\b/i,
      /\bin particular\b/i,
      /\bconsider\b/i,
      /\btake the case of\b/i,
    ],
    glyphs: ['↓'],
    confidence: 0.75,
    reason: 'Example language suggests concretization (↓) glyph',
  },

  // Generalizations / abstractions
  {
    id: 'abstraction',
    context: 'sentence_start',
    patterns: [
      /\bin general\b/i,
      /\bgenerally\b/i,
      /\boverall\b/i,
      /\bbroadly\b/i,
      /\bthe principle\b/i,
      /\bthe pattern\b/i,
      /\babstract(ly)?\b/i,
      /\bfundamentally\b/i,
    ],
    glyphs: ['↑'],
    confidence: 0.7,
    reason: 'Generalization language suggests abstraction (↑) glyph',
  },

  // Warnings / exceptions
  {
    id: 'warning',
    context: 'warning',
    patterns: [
      /\bhowever\b/i,
      /\bbut\b/i,
      /\bexcept\b/i,
      /\bunless\b/i,
      /\bcaveat\b/i,
      /\bwarning\b/i,
      /\bcaution\b/i,
      /\bnote that\b/i,
      /\bbeware\b/i,
      /\bwatch out\b/i,
      /\blimitation\b/i,
    ],
    glyphs: ['⚠'],
    confidence: 0.75,
    reason: 'Warning/exception language suggests caution (⚠) glyph',
  },

  // Definitions
  {
    id: 'definition',
    context: 'definition',
    patterns: [
      /\bis defined as\b/i,
      /\bmeans\b/i,
      /\brefers to\b/i,
      /\bdenotes?\b/i,
      /\bis (a|an|the)\b/i,
      /\bby .+ (I|we) mean\b/i,
      /":"/,
      /—/,
    ],
    glyphs: ['■'],
    confidence: 0.7,
    reason: 'Definition language suggests definition (■) glyph',
  },

  // Core concepts
  {
    id: 'core_concept',
    context: 'definition',
    patterns: [
      /\bfundamental\b/i,
      /\bcentral\b/i,
      /\bcore\b/i,
      /\bessential\b/i,
      /\bkey (concept|idea|principle)\b/i,
      /\bframework\b/i,
      /\bparadigm\b/i,
      /\bschema\b/i,
    ],
    glyphs: ['⌂'],
    confidence: 0.7,
    reason: 'Core concept language suggests core schema (⌂) glyph',
  },

  // Historical / precedent
  {
    id: 'precedent',
    context: 'example',
    patterns: [
      /\bhistorically\b/i,
      /\btraditionally\b/i,
      /\bpreviously\b/i,
      /\bin the past\b/i,
      /\boriginally\b/i,
      /\bformerly\b/i,
      /\bbackground\b/i,
    ],
    glyphs: ['←'],
    confidence: 0.7,
    reason: 'Historical language suggests precedent (←) glyph',
  },

  // Increase / strengthen
  {
    id: 'increase',
    context: 'unknown',
    patterns: [
      /\bincreases?\b/i,
      /\bstrengthens?\b/i,
      /\bintensifies?\b/i,
      /\benhances?\b/i,
      /\bamplifies?\b/i,
      /\bmore\b/i,
      /\bgreater\b/i,
      /\bhigher\b/i,
    ],
    glyphs: ['▲'],
    confidence: 0.6,
    reason: 'Increase language suggests magnitude increase (▲) glyph',
  },

  // Decrease / weaken
  {
    id: 'decrease',
    context: 'unknown',
    patterns: [
      /\bdecreases?\b/i,
      /\bweakens?\b/i,
      /\bdiminishes?\b/i,
      /\breduces?\b/i,
      /\battenuates?\b/i,
      /\bless\b/i,
      /\blower\b/i,
      /\bfewer\b/i,
    ],
    glyphs: ['▼'],
    confidence: 0.6,
    reason: 'Decrease language suggests magnitude decrease (▼) glyph',
  },

  // Intent / purpose
  {
    id: 'intent',
    context: 'unknown',
    patterns: [
      /\bintends?\b/i,
      /\baims?\b/i,
      /\bgoal\b/i,
      /\bpurpose\b/i,
      /\bobjective\b/i,
      /\bin order to\b/i,
      /\bso that\b/i,
      /\bfor the sake of\b/i,
      /\btelos\b/i,
    ],
    glyphs: ['⦿'],
    confidence: 0.7,
    reason: 'Purpose language suggests intent (⦿) glyph',
  },

  // Execution / action
  {
    id: 'execution',
    context: 'unknown',
    patterns: [
      /\bexecutes?\b/i,
      /\bimplements?\b/i,
      /\bperforms?\b/i,
      /\bdoes?\b/i,
      /\bacts?\b/i,
      /\bpractice[ds]?\b/i,
      /\bcarries? out\b/i,
      /\bapplies?\b/i,
    ],
    glyphs: ['⌁'],
    confidence: 0.65,
    reason: 'Action language suggests execution (⌁) glyph',
  },

  // Feedback / loops
  {
    id: 'feedback',
    context: 'after_causal',
    patterns: [
      /\bfeedback\b/i,
      /\bloop\b/i,
      /\bcycle\b/i,
      /\brecursive\b/i,
      /\breinforces?\b/i,
      /\bself-\w+ing\b/i,
      /\bvicious circle\b/i,
      /\bvirtuous cycle\b/i,
    ],
    glyphs: ['↻'],
    confidence: 0.8,
    reason: 'Feedback/loop language suggests feedback (↻) glyph',
  },

  // Interaction
  {
    id: 'interaction',
    context: 'unknown',
    patterns: [
      /\binteracts?\b/i,
      /\bcouples?\b/i,
      /\bco-\w+\b/i,
      /\bmutual(ly)?\b/i,
      /\binterdependent\b/i,
      /\brelates? to\b/i,
      /\bconnects? to\b/i,
    ],
    glyphs: ['⊗'],
    confidence: 0.65,
    reason: 'Interaction language suggests interaction (⊗) glyph',
  },

  // Confidence / acceptance
  {
    id: 'confidence',
    context: 'unknown',
    patterns: [
      /\bcertainly\b/i,
      /\bdefinitely\b/i,
      /\bundoubtedly\b/i,
      /\bverified\b/i,
      /\bconfirmed\b/i,
      /\bestablished\b/i,
      /\bproven\b/i,
      /\breliable\b/i,
    ],
    glyphs: ['✓'],
    confidence: 0.7,
    reason: 'Confidence language suggests accepted (✓) glyph',
  },

  // Importance / anchoring
  {
    id: 'anchor',
    context: 'unknown',
    patterns: [
      /\bimportant(ly)?\b/i,
      /\bcrucial(ly)?\b/i,
      /\bkey\b/i,
      /\bremember\b/i,
      /\bnote\b/i,
      /\bsignificant(ly)?\b/i,
      /\bworth noting\b/i,
    ],
    glyphs: ['★'],
    confidence: 0.65,
    reason: 'Importance language suggests anchor (★) glyph',
  },
];

/**
 * Match rules against text and return suggestions
 */
export function matchRules(
  text: string,
  cursorPosition?: number
): GlyphSuggestion[] {
  const suggestions: GlyphSuggestion[] = [];
  const seenGlyphs = new Set<string>();

  // Get the relevant text (around cursor or full text)
  const relevantText =
    cursorPosition !== undefined
      ? getContextAroundCursor(text, cursorPosition)
      : text;

  for (const rule of SUGGESTION_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(relevantText)) {
        for (const glyphSymbol of rule.glyphs) {
          if (seenGlyphs.has(glyphSymbol)) continue;
          seenGlyphs.add(glyphSymbol);

          const glyph = getGlyph(glyphSymbol);
          if (glyph) {
            suggestions.push({
              glyph,
              confidence: rule.confidence,
              reason: rule.reason,
              context: rule.context,
            });
          }
        }
        break; // Only match first pattern per rule
      }
    }
  }

  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return suggestions;
}

/**
 * Get text context around cursor position
 */
function getContextAroundCursor(
  text: string,
  cursorPosition: number,
  windowSize = 100
): string {
  const start = Math.max(0, cursorPosition - windowSize);
  const end = Math.min(text.length, cursorPosition + windowSize);
  return text.slice(start, end);
}

/**
 * Check if cursor is at sentence start
 */
export function isAtSentenceStart(text: string, cursorPosition: number): boolean {
  // Look backwards from cursor
  const before = text.slice(0, cursorPosition).trimEnd();
  if (before.length === 0) return true;

  const lastChar = before[before.length - 1];
  return /[.!?:;\n]/.test(lastChar);
}

/**
 * Get the current sentence around cursor
 */
export function getCurrentSentence(
  text: string,
  cursorPosition: number
): { sentence: string; start: number; end: number } {
  // Find sentence boundaries
  const sentenceEnders = /[.!?]/g;
  let start = 0;
  let end = text.length;

  // Find start (last sentence ender before cursor)
  let match;
  while ((match = sentenceEnders.exec(text)) !== null) {
    if (match.index < cursorPosition) {
      start = match.index + 1;
    } else {
      end = match.index + 1;
      break;
    }
  }

  return {
    sentence: text.slice(start, end).trim(),
    start,
    end,
  };
}
