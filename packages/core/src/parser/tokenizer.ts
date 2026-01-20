/**
 * Tokenizer for Semantic Glyph System
 *
 * Recognizes:
 * - Glyphs (single semantic symbols)
 * - Compounds (multi-glyph combinations)
 * - Hebrew micro-glyphs
 * - DotId declarations (Term{•••})
 * - DotId references ({•})
 */

import type {
  Token,
  TokenType,
  SourcePosition,
  Glyph,
  GlyphCompound,
  HebrewMicroGlyph,
  ParseResult,
  ParseError,
} from '../types';
import { GLYPHS, isGlyph, getGlyph, GLYPH_SYMBOLS } from '../glyphs/definitions';
import { parseCompoundAt, isCompound } from '../glyphs/compounds';
import { isHebrewGlyph, getHebrewGlyph, HEBREW_LETTERS } from '../glyphs/hebrew';
import {
  parseDotIds,
  extractDeclarations,
  extractReferences,
  type DotIdMatch,
} from '../dotid/parser';
import { validateDotIds } from '../dotid/validator';

/**
 * Tokenize text into semantic tokens
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const dotIdMatches = parseDotIds(text);

  // Create a set of positions occupied by DotId matches
  const dotIdRanges = new Set<number>();
  for (const match of dotIdMatches) {
    for (
      let i = match.position.offset;
      i < match.position.offset + match.position.length;
      i++
    ) {
      dotIdRanges.add(i);
    }
  }

  // First pass: add DotId tokens
  for (const match of dotIdMatches) {
    const isDeclaration = match.attachmentType !== 'reference';
    tokens.push({
      type: isDeclaration ? 'dotid_declaration' : 'dotid_reference',
      raw: match.raw,
      position: match.position,
      value: isDeclaration
        ? {
            term: match.term || match.glyph || '',
            dotId: match.dotId,
            position: match.position,
            isDeclaration: true,
          }
        : {
            dotId: match.dotId,
            position: match.position,
          },
    });
  }

  // Second pass: scan for glyphs, compounds, Hebrew outside DotId ranges
  let i = 0;
  while (i < text.length) {
    // Skip if inside a DotId match
    if (dotIdRanges.has(i)) {
      i++;
      continue;
    }

    const char = text[i];

    // Try to parse a compound first (greedy)
    const compound = parseCompoundAt(text, i);
    if (compound && !isInsideDotIdRange(i, compound.length, dotIdRanges)) {
      const position = offsetToPosition(text, i, compound.length);
      tokens.push({
        type: 'compound',
        raw: compound.compound.symbols,
        position,
        value: compound.compound,
      });
      i += compound.length;
      continue;
    }

    // Try single glyph
    if (isGlyph(char)) {
      const position = offsetToPosition(text, i, 1);
      tokens.push({
        type: 'glyph',
        raw: char,
        position,
        value: getGlyph(char),
      });
      i++;
      continue;
    }

    // Try Hebrew micro-glyph
    if (isHebrewGlyph(char)) {
      const position = offsetToPosition(text, i, 1);
      tokens.push({
        type: 'hebrew',
        raw: char,
        position,
        value: getHebrewGlyph(char),
      });
      i++;
      continue;
    }

    // Regular character
    i++;
  }

  // Sort tokens by position
  tokens.sort((a, b) => a.position.offset - b.position.offset);

  return tokens;
}

/**
 * Check if a range overlaps with DotId ranges
 */
function isInsideDotIdRange(
  start: number,
  length: number,
  ranges: Set<number>
): boolean {
  for (let i = start; i < start + length; i++) {
    if (ranges.has(i)) return true;
  }
  return false;
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
 * Full parse result with all semantic information
 */
export function parse(text: string): ParseResult {
  const tokens = tokenize(text);
  const dotIdMatches = parseDotIds(text);

  // Extract declarations and references
  const declarations = extractDeclarations(dotIdMatches);
  const references = extractReferences(dotIdMatches, declarations);

  // Validate
  const validation = validateDotIds(declarations, references);

  // Extract glyphs with positions
  const glyphs: Array<{ glyph: Glyph | GlyphCompound; position: SourcePosition }> = [];
  for (const token of tokens) {
    if (token.type === 'glyph' || token.type === 'compound') {
      glyphs.push({
        glyph: token.value as Glyph | GlyphCompound,
        position: token.position,
      });
    }
  }

  // Combine errors
  const errors: ParseError[] = [...validation.errors, ...validation.warnings];

  // Check glyph limit per line
  const glyphsPerLine = new Map<number, number>();
  for (const g of glyphs) {
    const line = g.position.line;
    glyphsPerLine.set(line, (glyphsPerLine.get(line) || 0) + 1);
  }
  for (const [line, count] of glyphsPerLine) {
    if (count > 3) {
      errors.push({
        message: `Line ${line + 1} has ${count} glyphs (max 3 per statement)`,
        position: { line, column: 0, offset: 0, length: 0 },
        severity: 'warning',
      });
    }
  }

  return {
    tokens,
    declarations,
    references,
    glyphs,
    errors,
  };
}

/**
 * Quick check for any semantic content
 */
export function hasSemanticContent(text: string): boolean {
  // Quick regex check before full parse
  const hasGlyph = Array.from(GLYPH_SYMBOLS).some((s) => text.includes(s));
  const hasHebrew = Array.from(HEBREW_LETTERS).some((l) => text.includes(l));
  const hasDotId = /\{[•○⦿]+\}/.test(text);

  return hasGlyph || hasHebrew || hasDotId;
}

/**
 * Get all glyph symbols in text (for quick highlighting)
 */
export function findGlyphPositions(
  text: string
): Array<{ symbol: string; position: SourcePosition }> {
  const positions: Array<{ symbol: string; position: SourcePosition }> = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (isGlyph(char)) {
      positions.push({
        symbol: char,
        position: offsetToPosition(text, i, 1),
      });
    }
  }

  return positions;
}

/**
 * Count glyphs per line (for validation)
 */
export function countGlyphsPerLine(text: string): Map<number, number> {
  const counts = new Map<number, number>();
  const lines = text.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    let count = 0;

    for (const char of line) {
      if (isGlyph(char)) count++;
    }

    if (count > 0) {
      counts.set(lineNum, count);
    }
  }

  return counts;
}
