/**
 * DotId system exports
 */

export {
  DOT_PRIMITIVES,
  DOT_UNICODE,
  DOT_NIKKUD,
  DOT_VALUES,
  DOT_IDS,
  SIGNATURE_TO_DOTID,
  VALUE_TO_DOTID,
  getDotIdByValue,
  getDotIdBySignature,
  isValidSignature,
  getNextDotId,
  CLUSTER_PATTERNS,
  toNikkudSize,
  DOT_CHARS,
  isDotChar,
} from './primitives';

export {
  parseDotIds,
  extractDeclarations,
  extractReferences,
  parseDotSignature,
  containsDotIds,
  extractTermFromDeclaration,
  buildDeclaration,
  buildGlyphAttachment,
  buildReference,
  type DotIdMatch,
} from './parser';

export {
  DotIdCounter,
  createCounterFromText,
  checkNoteDensity,
} from './counter';

export {
  validateDotIds,
  suggestFixes,
  checkReferenceOrder,
  validateGlyphLimit,
  type ValidationResult,
  type ValidationFix,
} from './validator';
