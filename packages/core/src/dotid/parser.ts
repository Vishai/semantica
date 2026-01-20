/**
 * DotId Parser
 *
 * Parses Term{•••} syntax to extract declarations and references.
 *
 * Syntax:
 * - Declaration: Term{•••} — word followed by braces with dots
 * - Reference: {•} — standalone braces with dots (no preceding word)
 */

import type { DotDeclaration, DotReference, DotId, SourcePosition } from '../types';
import { getDotIdBySignature, DOT_CHARS } from './primitives';

/**
 * Regex to match DotId syntax
 * Captures:
 * - Group 1: Optional preceding word (term)
 * - Group 2: Dot signature inside braces
 */
const DOTID_REGEX = /(\w+)?\{([•○⦿]+)\}/gu;

/**
 * Result of parsing a single DotId match
 */
export interface DotIdMatch {
  /** Full matched string */
  raw: string;
  /** The term (if declaration) */
  term: string | null;
  /** The parsed DotId */
  dotId: DotId;
  /** Position in source */
  position: SourcePosition;
  /** Is this a declaration (has term) or reference (no term) */
  isDeclaration: boolean;
}

/**
 * Parse all DotId occurrences in text
 */
export function parseDotIds(text: string): DotIdMatch[] {
  const matches: DotIdMatch[] = [];
  const regex = new RegExp(DOTID_REGEX.source, 'gu');

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const term = match[1] || null;
    const signature = match[2];
    const dotId = getDotIdBySignature(signature);

    if (!dotId) {
      // Invalid signature, skip
      continue;
    }

    const position = offsetToPosition(text, match.index, match[0].length);

    matches.push({
      raw: match[0],
      term,
      dotId,
      position,
      isDeclaration: term !== null,
    });
  }

  return matches;
}

/**
 * Extract declarations from parsed matches
 */
export function extractDeclarations(matches: DotIdMatch[]): DotDeclaration[] {
  const declarations: DotDeclaration[] = [];
  const seenDotIds = new Set<number>();

  for (const match of matches) {
    if (match.isDeclaration && match.term) {
      // First occurrence of a DotId is the declaration
      if (!seenDotIds.has(match.dotId.value)) {
        seenDotIds.add(match.dotId.value);
        declarations.push({
          term: match.term,
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
 * Also links references to their declarations when possible
 */
export function extractReferences(
  matches: DotIdMatch[],
  declarations: DotDeclaration[]
): DotReference[] {
  const references: DotReference[] = [];
  const declarationMap = new Map<number, DotDeclaration>();

  // Build declaration lookup
  for (const decl of declarations) {
    declarationMap.set(decl.dotId.value, decl);
  }

  // Track which DotIds we've seen as declarations
  const declaredIds = new Set(declarations.map((d) => d.dotId.value));

  for (const match of matches) {
    // A reference is either:
    // 1. A standalone {•} (no term), OR
    // 2. A repeated Term{•} after the first declaration
    const isStandaloneReference = !match.isDeclaration;
    const isRepeatedDeclaration =
      match.isDeclaration && declaredIds.has(match.dotId.value);

    // For repeated declarations, check if this is NOT the first occurrence
    let isSubsequentUse = false;
    if (isRepeatedDeclaration) {
      const decl = declarationMap.get(match.dotId.value);
      if (decl && match.position.offset > decl.position.offset) {
        isSubsequentUse = true;
      }
    }

    if (isStandaloneReference || isSubsequentUse) {
      references.push({
        dotId: match.dotId,
        position: match.position,
        declaration: declarationMap.get(match.dotId.value),
      });
    }
  }

  return references;
}

/**
 * Parse a DotId from a raw string (just the dot characters)
 */
export function parseDotSignature(signature: string): DotId | null {
  // Validate that all characters are dot primitives
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
  let currentOffset = 0;

  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      column = 0;
    } else {
      column++;
    }
    currentOffset++;
  }

  return {
    line,
    column,
    offset,
    length,
  };
}

/**
 * Check if text contains any DotId syntax
 */
export function containsDotIds(text: string): boolean {
  return DOTID_REGEX.test(text);
}

/**
 * Extract just the term from a DotId declaration string
 */
export function extractTermFromDeclaration(declaration: string): string | null {
  const match = declaration.match(/^(\w+)\{/);
  return match ? match[1] : null;
}

/**
 * Build a DotId declaration string
 */
export function buildDeclaration(term: string, dotId: DotId): string {
  return `${term}{${dotId.signature}}`;
}

/**
 * Build a DotId reference string
 */
export function buildReference(dotId: DotId): string {
  return `{${dotId.signature}}`;
}
