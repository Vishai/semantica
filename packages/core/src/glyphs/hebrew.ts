/**
 * Hebrew Micro-Glyphs — Interpretive Bias Layer
 *
 * Hebrew letters do not assert facts. They tilt interpretation.
 * Rule: One Hebrew letter per sentence or paragraph.
 */

import type { HebrewMicroGlyph } from '../types';

/**
 * All Hebrew micro-glyphs with their interpretive biases
 */
export const HEBREW_GLYPHS: Record<string, HebrewMicroGlyph> = {
  'א': {
    letter: 'א',
    bias: 'First principle',
    description: 'Source, origin, primordial',
  },
  'ב': {
    letter: 'ב',
    bias: 'Context',
    description: 'Container, dwelling, "in"',
  },
  'ג': {
    letter: 'ג',
    bias: 'Movement',
    description: 'Transition, going, becoming',
  },
  'ו': {
    letter: 'ו',
    bias: 'Connection',
    description: 'Linking, "and", continuation',
  },
  'ה': {
    letter: 'ה',
    bias: 'Emphasis',
    description: 'Disclosure, "behold", revelation',
  },
  'ז': {
    letter: 'ז',
    bias: 'Distinction',
    description: 'Cut, separation, differentiation',
  },
  'ח': {
    letter: 'ח',
    bias: 'Enclosure',
    description: 'Protected interior, fence, boundary',
  },
  'י': {
    letter: 'י',
    bias: 'Seed',
    description: 'Essence, point, beginning',
  },
  'ל': {
    letter: 'ל',
    bias: 'Orientation',
    description: 'Toward, learning, direction',
  },
  'מ': {
    letter: 'מ',
    bias: 'Process',
    description: 'Flow, transformation, water',
  },
};

/**
 * Get all Hebrew glyphs as an array
 */
export function getAllHebrewGlyphs(): HebrewMicroGlyph[] {
  return Object.values(HEBREW_GLYPHS);
}

/**
 * Get a Hebrew glyph by its letter
 */
export function getHebrewGlyph(letter: string): HebrewMicroGlyph | undefined {
  return HEBREW_GLYPHS[letter];
}

/**
 * Check if a character is a Hebrew micro-glyph
 */
export function isHebrewGlyph(char: string): boolean {
  return char in HEBREW_GLYPHS;
}

/**
 * All Hebrew letters for quick lookup
 */
export const HEBREW_LETTERS = new Set(Object.keys(HEBREW_GLYPHS));

/**
 * Left-to-Right Mark for preventing RTL cursor issues
 */
export const LRM = '\u200E';

/**
 * Wrap a Hebrew letter with LRM marks for proper cursor behavior
 */
export function wrapWithLRM(letter: string): string {
  return `${LRM}${letter}${LRM}`;
}
