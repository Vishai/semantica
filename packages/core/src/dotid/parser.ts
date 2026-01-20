/**
 * DotId Parser
 *
 * Parses two attachment patterns:
 * 1. Term{•••} — term declaration (dots beneath the term)
 * 2. ■{•} — glyph attachment (dots beneath the glyph)
 * 3. {•} — standalone reference
 *
 * Multi-word terms are supported when explicitly selected.
 */

import type { DotDeclaration, DotReference, DotId, SourcePosition } from '../types';
import { getDotIdBySignature, DOT_CHARS } from './primitives';
import { GLYPH_SYMBOLS } from '../glyphs/definitions';

/**
 * Result of parsing a single DotId match
 */
export interface DotIdMatch {
  /** Full matched string */
  raw: string;
  /** The term (if term declaration) */
  term: string | null;
  /** The glyph (if glyph attachment) */
  glyph: string | null;
  /** The parsed DotId */
  dotId: DotId;
  /** Position in source */
  position: SourcePosition;
  /** Type of attachment */
  attachmentType: 'term' | 'glyph' | 'reference';
}

/**
 * Parse all DotId occurrences in text
 *
 * Supported patterns:
 * - Term{•} or "Multi Word Term"{•} - term declaration
 * - ■{•} - glyph attachment
 * - {•} - standalone reference
 *
 * Optional: includeIncomplete to match patterns without closing }
 */
export function parseDotIds(text: string, includeIncomplete = false): DotIdMatch[] {
  const matches: DotIdMatch[] = [];

  // Pattern 1: Quoted multi-word term: "Some Term"{•••}
  const quotedTermPattern = /"([^"]+)"\{([•○⦿]+)\}/gu;
  let match: RegExpExecArray | null;

  while ((match = quotedTermPattern.exec(text)) !== null) {
    const term = match[1];
    const signature = match[2];
    const dotId = getDotIdBySignature(signature);

    if (dotId) {
      matches.push({
        raw: match[0],
        term,
        glyph: null,
        dotId,
        position: offsetToPosition(text, match.index, match[0].length),
        attachmentType: 'term',
      });
    }
  }

  // Pattern 2: Single-word term: Word{•••}
  const singleTermPattern = /(?<!["\w])(\w+)\{([•○⦿]+)\}/gu;

  while ((match = singleTermPattern.exec(text)) !== null) {
    const term = match[1];
    const signature = match[2];
    const dotId = getDotIdBySignature(signature);

    if (dotId) {
      // Check if this position already matched by quoted pattern
      const alreadyMatched = matches.some(
        (m) =>
          m.position.offset <= match!.index &&
          match!.index < m.position.offset + m.position.length
      );

      if (!alreadyMatched) {
        matches.push({
          raw: match[0],
          term,
          glyph: null,
          dotId,
          position: offsetToPosition(text, match.index, match[0].length),
          attachmentType: 'term',
        });
      }
    }
  }

  // Pattern 3: Glyph attachment: ■{•}
  // Build pattern from all known glyph symbols
  const glyphChars = Array.from(GLYPH_SYMBOLS).join('');
  const glyphPattern = new RegExp(`([${escapeRegex(glyphChars)}])\\{([•○⦿]+)\\}`, 'gu');

  while ((match = glyphPattern.exec(text)) !== null) {
    const glyph = match[1];
    const signature = match[2];
    const dotId = getDotIdBySignature(signature);

    if (dotId) {
      // Check if this position already matched
      const alreadyMatched = matches.some(
        (m) =>
          m.position.offset <= match!.index &&
          match!.index < m.position.offset + m.position.length
      );

      if (!alreadyMatched) {
        matches.push({
          raw: match[0],
          term: null,
          glyph,
          dotId,
          position: offsetToPosition(text, match.index, match[0].length),
          attachmentType: 'glyph',
        });
      }
    }
  }

  // Pattern 4: Standalone reference: {•}
  const referencePattern = /(?<!["\w■⌂→←↑↓▲▼◇¿⊗⇄↻⌁§—⚠תת★✓≈⦿])\{([•○⦿]+)\}/gu;

  while ((match = referencePattern.exec(text)) !== null) {
    const signature = match[1];
    const dotId = getDotIdBySignature(signature);

    if (dotId) {
      // Check if this position already matched
      const alreadyMatched = matches.some(
        (m) =>
          m.position.offset <= match!.index &&
          match!.index < m.position.offset + m.position.length
      );

      if (!alreadyMatched) {
        matches.push({
          raw: match[0],
          term: null,
          glyph: null,
          dotId,
          position: offsetToPosition(text, match.index, match[0].length),
          attachmentType: 'reference',
        });
      }
    }
  }

  // If requested, also match incomplete patterns (for live preview while typing)
  if (includeIncomplete) {
    // Pattern for incomplete dotIds: Term{••• (no closing brace yet)
    const incompleteSingleTermPattern = /(?<!["\w])(\w+)\{([•○⦿]+)$/gmu;
    const incompleteQuotedTermPattern = /"([^"]+)"\{([•○⦿]+)$/gmu;
    const incompleteGlyphPattern = new RegExp(`([${escapeRegex(Array.from(GLYPH_SYMBOLS).join(''))}])\\{([•○⦿]+)$`, 'gmu');

    // Check single-word term
    while ((match = incompleteSingleTermPattern.exec(text)) !== null) {
      const term = match[1];
      const signature = match[2];
      const dotId = getDotIdBySignature(signature);

      if (dotId) {
        const alreadyMatched = matches.some(
          (m) =>
            m.position.offset <= match!.index &&
            match!.index < m.position.offset + m.position.length
        );

        if (!alreadyMatched) {
          matches.push({
            raw: match[0],
            term,
            glyph: null,
            dotId,
            position: offsetToPosition(text, match.index, match[0].length),
            attachmentType: 'term',
          });
        }
      }
    }

    // Check quoted term
    while ((match = incompleteQuotedTermPattern.exec(text)) !== null) {
      const term = match[1];
      const signature = match[2];
      const dotId = getDotIdBySignature(signature);

      if (dotId) {
        const alreadyMatched = matches.some(
          (m) =>
            m.position.offset <= match!.index &&
            match!.index < m.position.offset + m.position.length
        );

        if (!alreadyMatched) {
          matches.push({
            raw: match[0],
            term,
            glyph: null,
            dotId,
            position: offsetToPosition(text, match.index, match[0].length),
            attachmentType: 'term',
          });
        }
      }
    }

    // Check glyph
    while ((match = incompleteGlyphPattern.exec(text)) !== null) {
      const glyph = match[1];
      const signature = match[2];
      const dotId = getDotIdBySignature(signature);

      if (dotId) {
        const alreadyMatched = matches.some(
          (m) =>
            m.position.offset <= match!.index &&
            match!.index < m.position.offset + m.position.length
        );

        if (!alreadyMatched) {
          matches.push({
            raw: match[0],
            term: null,
            glyph,
            dotId,
            position: offsetToPosition(text, match.index, match[0].length),
            attachmentType: 'glyph',
          });
        }
      }
    }
  }

  // Sort by position
  matches.sort((a, b) => a.position.offset - b.position.offset);

  return matches;
}

/**
 * Extract declarations from parsed matches
 */
export function extractDeclarations(matches: DotIdMatch[]): DotDeclaration[] {
  const declarations: DotDeclaration[] = [];
  const seenDotIds = new Set<number>();

  for (const match of matches) {
    // A declaration is either a term attachment or glyph attachment
    if (match.attachmentType !== 'reference') {
      if (!seenDotIds.has(match.dotId.value)) {
        seenDotIds.add(match.dotId.value);
        declarations.push({
          term: match.term || match.glyph || '(glyph)',
          dotId: match.dotId,
          position: match.position,
          isDeclaration: true,
        });
      }
    }
  }

  return declarations;
}

/**
 * Extract references from parsed matches
 */
export function extractReferences(
  matches: DotIdMatch[],
  declarations: DotDeclaration[]
): DotReference[] {
  const references: DotReference[] = [];
  const declarationMap = new Map<number, DotDeclaration>();

  for (const decl of declarations) {
    declarationMap.set(decl.dotId.value, decl);
  }

  const declaredIds = new Set(declarations.map((d) => d.dotId.value));

  for (const match of matches) {
    if (match.attachmentType === 'reference') {
      references.push({
        dotId: match.dotId,
        position: match.position,
        declaration: declarationMap.get(match.dotId.value),
      });
    } else if (declaredIds.has(match.dotId.value)) {
      // Subsequent uses of same DotId are also references
      const decl = declarationMap.get(match.dotId.value);
      if (decl && match.position.offset > decl.position.offset) {
        references.push({
          dotId: match.dotId,
          position: match.position,
          declaration: decl,
        });
      }
    }
  }

  return references;
}

/**
 * Parse a DotId from a raw string (just the dot characters)
 */
export function parseDotSignature(signature: string): DotId | null {
  for (const char of signature) {
    if (!DOT_CHARS.has(char)) {
      return null;
    }
  }
  return getDotIdBySignature(signature) || null;
}

/**
 * Convert offset to line/column position
 */
function offsetToPosition(
  text: string,
  offset: number,
  length: number
): SourcePosition {
  let line = 0;
  let column = 0;

  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      column = 0;
    } else {
      column++;
    }
  }

  return { line, column, offset, length };
}

/**
 * Check if text contains any DotId syntax
 */
export function containsDotIds(text: string): boolean {
  return /\{[•○⦿]+\}/.test(text);
}

/**
 * Extract just the term from a DotId declaration string
 */
export function extractTermFromDeclaration(declaration: string): string | null {
  // Try quoted first
  const quotedMatch = declaration.match(/^"([^"]+)"\{/);
  if (quotedMatch) return quotedMatch[1];

  // Then single word
  const wordMatch = declaration.match(/^(\w+)\{/);
  return wordMatch ? wordMatch[1] : null;
}

/**
 * Build a DotId declaration string
 * For multi-word terms, wraps in quotes
 */
export function buildDeclaration(term: string, dotId: DotId): string {
  // If term contains spaces or is a glyph, handle appropriately
  if (term.includes(' ')) {
    return `"${term}"{${dotId.signature}}`;
  }
  return `${term}{${dotId.signature}}`;
}

/**
 * Build a glyph attachment string
 */
export function buildGlyphAttachment(glyph: string, dotId: DotId): string {
  return `${glyph}{${dotId.signature}}`;
}

/**
 * Build a DotId reference string
 */
export function buildReference(dotId: DotId): string {
  return `{${dotId.signature}}`;
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
