/**
 * DotId Validator
 *
 * Detects validation issues:
 * - Orphaned references (DotId used but never declared)
 * - Duplicate declarations (same DotId declared twice)
 */

import type {
  DotDeclaration,
  DotReference,
  ParseError,
  SourcePosition,
} from '../types';

export interface ValidationResult {
  /** Is the note valid (no errors)? */
  isValid: boolean;
  /** Orphaned references (references without declarations) */
  orphanedReferences: DotReference[];
  /** Duplicate declarations (same DotId declared multiple times) */
  duplicateDeclarations: DotDeclaration[];
  /** All validation errors */
  errors: ParseError[];
  /** All validation warnings */
  warnings: ParseError[];
}

/**
 * Validate DotId usage in a note
 */
export function validateDotIds(
  declarations: DotDeclaration[],
  references: DotReference[]
): ValidationResult {
  const errors: ParseError[] = [];
  const warnings: ParseError[] = [];
  const orphanedReferences: DotReference[] = [];
  const duplicateDeclarations: DotDeclaration[] = [];

  // Track which DotIds have been declared
  const declaredIds = new Map<number, DotDeclaration>();

  // Check for duplicate declarations
  for (const decl of declarations) {
    const existing = declaredIds.get(decl.dotId.value);
    if (existing) {
      duplicateDeclarations.push(decl);
      errors.push({
        message: `Duplicate declaration: DotId ${decl.dotId.value} (${decl.dotId.signature}) was already declared as "${existing.term}" at line ${existing.position.line + 1}`,
        position: decl.position,
        severity: 'error',
      });
    } else {
      declaredIds.set(decl.dotId.value, decl);
    }
  }

  // Check for orphaned references
  for (const ref of references) {
    if (!declaredIds.has(ref.dotId.value)) {
      orphanedReferences.push(ref);
      errors.push({
        message: `Orphaned reference: DotId ${ref.dotId.value} (${ref.dotId.signature}) is used but never declared`,
        position: ref.position,
        severity: 'error',
      });
    }
  }

  // Generate warnings for unused declarations
  const referencedIds = new Set(references.map((r) => r.dotId.value));
  for (const [value, decl] of declaredIds) {
    if (!referencedIds.has(value)) {
      warnings.push({
        message: `Unused declaration: "${decl.term}" (${decl.dotId.signature}) is declared but never referenced`,
        position: decl.position,
        severity: 'warning',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    orphanedReferences,
    duplicateDeclarations,
    errors,
    warnings,
  };
}

/**
 * Suggest fixes for validation errors
 */
export interface ValidationFix {
  /** Type of fix */
  type: 'add_declaration' | 'remove_duplicate' | 'remove_orphan';
  /** Description of the fix */
  description: string;
  /** Position to apply fix */
  position: SourcePosition;
  /** Suggested replacement text (if applicable) */
  replacement?: string;
}

/**
 * Generate fix suggestions for validation errors
 */
export function suggestFixes(result: ValidationResult): ValidationFix[] {
  const fixes: ValidationFix[] = [];

  // Suggest declarations for orphaned references
  for (const orphan of result.orphanedReferences) {
    fixes.push({
      type: 'add_declaration',
      description: `Add a declaration for DotId ${orphan.dotId.value} (${orphan.dotId.signature}) before this reference`,
      position: orphan.position,
    });
  }

  // Suggest removing duplicate declarations
  for (const dup of result.duplicateDeclarations) {
    fixes.push({
      type: 'remove_duplicate',
      description: `Remove duplicate declaration of "${dup.term}" or use a different DotId`,
      position: dup.position,
    });
  }

  return fixes;
}

/**
 * Check if a reference comes before its declaration
 * (valid but worth noting for clarity)
 */
export function checkReferenceOrder(
  declarations: DotDeclaration[],
  references: DotReference[]
): ParseError[] {
  const warnings: ParseError[] = [];
  const declPositions = new Map<number, number>();

  for (const decl of declarations) {
    declPositions.set(decl.dotId.value, decl.position.offset);
  }

  for (const ref of references) {
    const declOffset = declPositions.get(ref.dotId.value);
    if (declOffset !== undefined && ref.position.offset < declOffset) {
      warnings.push({
        message: `Reference to {${ref.dotId.signature}} appears before its declaration`,
        position: ref.position,
        severity: 'info',
      });
    }
  }

  return warnings;
}

/**
 * Validate that no more than 3 semantic glyphs are used per statement
 * (DotIds don't count toward this limit)
 */
export function validateGlyphLimit(
  glyphsPerStatement: Map<number, number>
): ParseError[] {
  const errors: ParseError[] = [];

  for (const [line, count] of glyphsPerStatement) {
    if (count > 3) {
      errors.push({
        message: `Too many semantic glyphs (${count}) on line ${line + 1}. Maximum is 3 per statement.`,
        position: { line, column: 0, offset: 0, length: 0 },
        severity: 'warning',
      });
    }
  }

  return errors;
}
