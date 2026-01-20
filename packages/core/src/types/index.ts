/**
 * Core types for the Semantic Glyph System
 */

// ============================================
// GLYPH TYPES
// ============================================

export type GlyphCategory =
  | 'level'
  | 'magnitude'
  | 'epistemic'
  | 'structural'
  | 'causal'
  | 'centrality'
  | 'provenance'
  | 'boundary'
  | 'salience'
  | 'framing'
  | 'agency';

export interface Glyph {
  /** The Unicode symbol */
  symbol: string;
  /** Human-readable name */
  name: string;
  /** Semantic category */
  category: GlyphCategory;
  /** Short description of meaning */
  description: string;
  /** Optional paired/inverse glyph symbol */
  pair?: string;
  /** Display color (hex) */
  color: string;
  /** Whether this is the "base" (vs "alt") in its pair */
  isBase: boolean;
}

export interface GlyphCompound {
  /** The compound symbols concatenated */
  symbols: string;
  /** Component glyphs */
  components: string[];
  /** Meaning of the compound */
  meaning: string;
  /** Category of compound (agency, epistemic, structural) */
  compoundCategory: 'agency' | 'epistemic' | 'structural';
}

export interface HebrewMicroGlyph {
  /** The Hebrew letter */
  letter: string;
  /** Interpretive bias it adds */
  bias: string;
  /** Longer description */
  description: string;
}

// ============================================
// DOT ID TYPES
// ============================================

export type DotPrimitive = '•' | '○' | '⦿';

export interface DotId {
  /** Numeric value (1-10) */
  value: number;
  /** Visual representation */
  signature: string;
  /** Individual primitives that make up the signature */
  primitives: DotPrimitive[];
  /** Whether this uses grape cluster layout (3, 7, 8) */
  isCluster: boolean;
}

export interface DotDeclaration {
  /** The term being declared */
  term: string;
  /** The DotId assigned */
  dotId: DotId;
  /** Position in source text */
  position: SourcePosition;
  /** Whether this is the first occurrence (declaration) or a reference */
  isDeclaration: boolean;
}

export interface DotReference {
  /** The DotId being referenced */
  dotId: DotId;
  /** Position in source text */
  position: SourcePosition;
  /** The declaration this references (if found) */
  declaration?: DotDeclaration;
}

// ============================================
// PARSER TYPES
// ============================================

export interface SourcePosition {
  /** Line number (0-indexed) */
  line: number;
  /** Column number (0-indexed) */
  column: number;
  /** Absolute offset from start */
  offset: number;
  /** Length of the token */
  length: number;
}

export type TokenType =
  | 'glyph'
  | 'compound'
  | 'hebrew'
  | 'dotid_declaration'
  | 'dotid_reference'
  | 'text';

export interface Token {
  type: TokenType;
  /** Raw text content */
  raw: string;
  /** Position in source */
  position: SourcePosition;
  /** Parsed value (Glyph, DotId, etc.) */
  value?: Glyph | GlyphCompound | HebrewMicroGlyph | DotDeclaration | DotReference;
}

export interface ParseResult {
  /** All tokens found */
  tokens: Token[];
  /** All declared objects (terms with DotIds) */
  declarations: DotDeclaration[];
  /** All DotId references */
  references: DotReference[];
  /** All glyphs used */
  glyphs: Array<{ glyph: Glyph | GlyphCompound; position: SourcePosition }>;
  /** Validation errors */
  errors: ParseError[];
}

export interface ParseError {
  /** Error message */
  message: string;
  /** Position of the error */
  position: SourcePosition;
  /** Error severity */
  severity: 'error' | 'warning' | 'info';
}

// ============================================
// SUGGESTION TYPES
// ============================================

export type SuggestionContext =
  | 'sentence_start'
  | 'after_causal'
  | 'after_comparison'
  | 'after_hedge'
  | 'question'
  | 'citation'
  | 'example'
  | 'warning'
  | 'definition'
  | 'unknown';

export interface GlyphSuggestion {
  /** The suggested glyph */
  glyph: Glyph;
  /** Confidence score (0-1) */
  confidence: number;
  /** Why this was suggested */
  reason: string;
  /** Context that triggered this suggestion */
  context: SuggestionContext;
}

export interface DotIdSuggestion {
  /** Suggested action */
  action: 'add_declaration' | 'add_reference';
  /** For declarations: the term to mark */
  term?: string;
  /** For references: existing declaration to reference */
  declaration?: DotDeclaration;
  /** The DotId to use */
  dotId: DotId;
  /** Why this was suggested */
  reason: string;
  /** Confidence score (0-1) */
  confidence: number;
}

// ============================================
// NOTE ANALYSIS TYPES
// ============================================

export interface NoteObject {
  /** The declared term */
  term: string;
  /** Assigned DotId */
  dotId: DotId;
  /** Position of declaration */
  declarationPosition: SourcePosition;
  /** All positions where this is referenced */
  references: SourcePosition[];
  /** Glyphs associated with this object */
  associatedGlyphs: Array<{ glyph: Glyph | GlyphCompound; position: SourcePosition }>;
}

export interface NoteAnalysis {
  /** All declared objects */
  objects: NoteObject[];
  /** Orphaned references (DotIds used without declaration) */
  orphanedReferences: DotReference[];
  /** Duplicate declarations (same DotId declared twice) */
  duplicateDeclarations: DotDeclaration[];
  /** All glyphs used with counts */
  glyphUsage: Map<string, number>;
  /** Suggested relationships between objects */
  relationships: Array<{
    from: NoteObject;
    to: NoteObject;
    type: string;
    glyphContext?: Glyph | GlyphCompound;
  }>;
}
