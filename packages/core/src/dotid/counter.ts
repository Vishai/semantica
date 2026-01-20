/**
 * DotId Counter
 *
 * Tracks DotIds in use within a note and suggests the next available.
 */

import type { DotId, DotDeclaration } from '../types';
import { DOT_IDS, getDotIdByValue } from './primitives';

/**
 * DotId usage tracker for a single note
 */
export class DotIdCounter {
  /** Set of DotId values currently in use */
  private usedIds: Set<number> = new Set();

  /** Map of DotId value to its declaration */
  private declarations: Map<number, DotDeclaration> = new Map();

  /**
   * Create a counter, optionally initialized with existing declarations
   */
  constructor(declarations?: DotDeclaration[]) {
    if (declarations) {
      for (const decl of declarations) {
        this.addDeclaration(decl);
      }
    }
  }

  /**
   * Add a declaration to tracking
   */
  addDeclaration(declaration: DotDeclaration): void {
    this.usedIds.add(declaration.dotId.value);
    // Only store the first declaration for each DotId
    if (!this.declarations.has(declaration.dotId.value)) {
      this.declarations.set(declaration.dotId.value, declaration);
    }
  }

  /**
   * Remove a DotId from tracking
   */
  removeId(value: number): void {
    this.usedIds.delete(value);
    this.declarations.delete(value);
  }

  /**
   * Check if a DotId value is in use
   */
  isUsed(value: number): boolean {
    return this.usedIds.has(value);
  }

  /**
   * Get the next available DotId
   * Returns undefined if all 10 are in use
   */
  getNextAvailable(): DotId | undefined {
    for (let value = 1; value <= 10; value++) {
      if (!this.usedIds.has(value)) {
        return getDotIdByValue(value);
      }
    }
    return undefined;
  }

  /**
   * Get all available DotIds
   */
  getAvailable(): DotId[] {
    return DOT_IDS.filter((d) => !this.usedIds.has(d.value));
  }

  /**
   * Get all used DotIds
   */
  getUsed(): DotId[] {
    return DOT_IDS.filter((d) => this.usedIds.has(d.value));
  }

  /**
   * Get count of used DotIds
   */
  getUsedCount(): number {
    return this.usedIds.size;
  }

  /**
   * Get count of available DotIds
   */
  getAvailableCount(): number {
    return 10 - this.usedIds.size;
  }

  /**
   * Get the declaration for a DotId value
   */
  getDeclaration(value: number): DotDeclaration | undefined {
    return this.declarations.get(value);
  }

  /**
   * Get all declarations
   */
  getAllDeclarations(): DotDeclaration[] {
    return Array.from(this.declarations.values());
  }

  /**
   * Check if note is approaching capacity (7+ DotIds used)
   * Per spec: "If you consistently need more than 7 in a single note,
   * consider whether the note should be split."
   */
  isApproachingCapacity(): boolean {
    return this.usedIds.size >= 7;
  }

  /**
   * Check if note is at capacity (all 10 used)
   */
  isAtCapacity(): boolean {
    return this.usedIds.size >= 10;
  }

  /**
   * Reset the counter (for new note or refresh)
   */
  reset(): void {
    this.usedIds.clear();
    this.declarations.clear();
  }

  /**
   * Create a snapshot of current state
   */
  snapshot(): { usedIds: number[]; declarations: DotDeclaration[] } {
    return {
      usedIds: Array.from(this.usedIds),
      declarations: this.getAllDeclarations(),
    };
  }

  /**
   * Restore from a snapshot
   */
  restore(snapshot: { usedIds: number[]; declarations: DotDeclaration[] }): void {
    this.reset();
    for (const decl of snapshot.declarations) {
      this.addDeclaration(decl);
    }
  }
}

/**
 * Create a new counter from text
 */
export function createCounterFromText(
  text: string,
  parseFunction: (text: string) => DotDeclaration[]
): DotIdCounter {
  const declarations = parseFunction(text);
  return new DotIdCounter(declarations);
}

/**
 * Heuristic check: should this note be split?
 * Returns suggestions based on DotId density
 */
export function checkNoteDensity(counter: DotIdCounter): {
  shouldSplit: boolean;
  reason: string | null;
} {
  if (counter.isAtCapacity()) {
    return {
      shouldSplit: true,
      reason: 'All 10 DotIds are in use. Consider splitting this note into smaller pieces.',
    };
  }

  if (counter.isApproachingCapacity()) {
    return {
      shouldSplit: false,
      reason: `${counter.getUsedCount()} DotIds in use. Note is getting dense—consider if it should be split.`,
    };
  }

  return {
    shouldSplit: false,
    reason: null,
  };
}
