/**
 * Note Objects sidebar view
 *
 * Shows all declared objects (DotIds) in the current note
 * with their references and associated glyphs.
 */

import { ItemView, MarkdownView, WorkspaceLeaf, Events } from 'obsidian';
import type SemanticGlyphPlugin from '../main';
import {
  parseDotIds,
  extractDeclarations,
  extractReferences,
  validateDotIds,
  parse,
  type DotDeclaration,
  type DotReference,
  type NoteObject,
} from '@semantic-glyph/core';

export const VIEW_TYPE_NOTE_OBJECTS = 'semantic-glyph-note-objects';

export class NoteObjectsView extends ItemView {
  private plugin: SemanticGlyphPlugin;
  private refreshTimeout: NodeJS.Timeout | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: SemanticGlyphPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_NOTE_OBJECTS;
  }

  getDisplayText(): string {
    return 'Note Objects';
  }

  getIcon(): string {
    return 'list';
  }

  async onOpen() {
    // Register for active leaf changes
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        this.scheduleRefresh();
      })
    );

    // Register for editor changes
    this.registerEvent(
      this.app.workspace.on('editor-change', () => {
        this.scheduleRefresh();
      })
    );

    // Initial render
    this.refresh();
  }

  private scheduleRefresh() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    this.refreshTimeout = setTimeout(() => {
      this.refresh();
    }, 300); // Debounce
  }

  private refresh() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('semantic-glyph-objects');

    // Get active markdown view
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      container.createEl('p', {
        text: 'Open a note to see its objects',
        cls: 'objects-empty',
      });
      return;
    }

    const content = activeView.editor.getValue();
    const fileName = activeView.file?.basename || 'Untitled';

    // Parse the note
    const parseResult = parse(content);
    const matches = parseDotIds(content);
    const declarations = extractDeclarations(matches);
    const references = extractReferences(matches, declarations);
    const validation = validateDotIds(declarations, references);

    // Title
    container.createEl('h3', { text: `Objects in "${fileName}"` });

    // Summary
    this.renderSummary(container, declarations, references, validation);

    // Validation errors
    if (!validation.isValid) {
      this.renderValidation(container, validation);
    }

    // Objects list
    this.renderObjects(container, declarations, references, parseResult, activeView);

    // Glyphs summary
    this.renderGlyphsSummary(container, parseResult);
  }

  private renderSummary(
    container: Element,
    declarations: DotDeclaration[],
    references: DotReference[],
    validation: any
  ) {
    const summary = container.createDiv({ cls: 'objects-summary' });

    const stats = summary.createDiv({ cls: 'objects-stats' });
    stats.createEl('span', { text: `${declarations.length} objects` });
    stats.createEl('span', { text: '•', cls: 'objects-stat-sep' });
    stats.createEl('span', { text: `${references.length} references` });

    if (validation.errors.length > 0) {
      stats.createEl('span', { text: '•', cls: 'objects-stat-sep' });
      stats.createEl('span', {
        text: `${validation.errors.length} issues`,
        cls: 'objects-stat-error',
      });
    }
  }

  private renderValidation(container: Element, validation: any) {
    const section = container.createDiv({ cls: 'objects-validation' });
    section.createEl('h4', { text: 'Issues' });

    for (const error of validation.errors) {
      const item = section.createDiv({ cls: 'objects-validation-item' });

      const icon = item.createSpan({ cls: 'objects-validation-icon' });
      icon.textContent = error.severity === 'error' ? '⚠' : 'ℹ';

      const message = item.createSpan({ cls: 'objects-validation-message' });
      message.textContent = error.message;
    }
  }

  private renderObjects(
    container: Element,
    declarations: DotDeclaration[],
    references: DotReference[],
    parseResult: any,
    activeView: MarkdownView
  ) {
    if (declarations.length === 0) {
      container.createEl('p', {
        text: 'No objects declared in this note',
        cls: 'objects-empty',
      });
      return;
    }

    const section = container.createDiv({ cls: 'objects-list' });
    section.createEl('h4', { text: 'Declared Objects' });

    // Build reference counts
    const refCounts = new Map<number, number>();
    for (const ref of references) {
      const count = refCounts.get(ref.dotId.value) || 0;
      refCounts.set(ref.dotId.value, count + 1);
    }

    for (const decl of declarations) {
      const item = section.createDiv({ cls: 'objects-item' });

      // DotId badge
      const badge = item.createSpan({ cls: 'objects-item-badge' });
      badge.textContent = decl.dotId.signature;

      // Term
      const term = item.createSpan({ cls: 'objects-item-term' });
      term.textContent = decl.term;

      // Reference count
      const count = refCounts.get(decl.dotId.value) || 0;
      const refs = item.createSpan({ cls: 'objects-item-refs' });
      refs.textContent = count === 0 ? 'unused' : `${count} ref${count > 1 ? 's' : ''}`;
      if (count === 0) refs.addClass('objects-item-refs-unused');

      // Position (line number)
      const pos = item.createSpan({ cls: 'objects-item-pos' });
      pos.textContent = `line ${decl.position.line + 1}`;

      // Click to jump to declaration
      item.addEventListener('click', () => {
        const editor = activeView.editor;
        editor.setCursor({
          line: decl.position.line,
          ch: decl.position.column,
        });
        editor.scrollIntoView(
          {
            from: { line: decl.position.line, ch: 0 },
            to: { line: decl.position.line, ch: 0 },
          },
          true
        );
      });
    }
  }

  private renderGlyphsSummary(container: Element, parseResult: any) {
    if (parseResult.glyphs.length === 0) return;

    const section = container.createDiv({ cls: 'objects-glyphs' });
    section.createEl('h4', { text: 'Glyphs Used' });

    // Count glyphs
    const counts = new Map<string, number>();
    for (const item of parseResult.glyphs) {
      const symbol = 'symbol' in item.glyph ? item.glyph.symbol : item.glyph.symbols;
      counts.set(symbol, (counts.get(symbol) || 0) + 1);
    }

    // Sort by count
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

    const grid = section.createDiv({ cls: 'objects-glyphs-grid' });
    for (const [symbol, count] of sorted) {
      const item = grid.createDiv({ cls: 'objects-glyph-item' });

      const symbolSpan = item.createSpan({ cls: 'objects-glyph-symbol' });
      symbolSpan.textContent = symbol;

      const countSpan = item.createSpan({ cls: 'objects-glyph-count' });
      countSpan.textContent = `×${count}`;
    }
  }

  async onClose() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
  }
}
