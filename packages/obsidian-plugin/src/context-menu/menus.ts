/**
 * Context menus for glyph and DotId insertion
 */

import { App, Editor, Menu, Modal, Setting } from 'obsidian';
import {
  getAllGlyphs,
  getGlyph,
  CATEGORIES,
  getAllCompounds,
  getSuggestions,
  parseDotIds,
  extractDeclarations,
  DotIdCounter,
  buildDeclaration,
  buildReference,
  type Glyph,
  type GlyphCompound,
  type GlyphSuggestion,
  type DotDeclaration,
} from '@semantic-glyph/core';
import type { SemanticGlyphSettings } from '../settings/settings';

/**
 * Show glyph picker menu
 */
export function showGlyphMenu(
  app: App,
  editor: Editor,
  lineText: string,
  cursorColumn: number,
  settings: SemanticGlyphSettings
) {
  const modal = new GlyphPickerModal(app, editor, lineText, cursorColumn, settings);
  modal.open();
}

/**
 * Show DotId picker menu
 */
export function showDotIdMenu(
  app: App,
  editor: Editor,
  content: string,
  settings: SemanticGlyphSettings,
  selectedTerm?: string | null
) {
  const modal = new DotIdPickerModal(app, editor, content, settings, selectedTerm);
  modal.open();
}

/**
 * Modal for picking glyphs
 */
class GlyphPickerModal extends Modal {
  private editor: Editor;
  private lineText: string;
  private cursorColumn: number;
  private settings: SemanticGlyphSettings;
  private filterText: string = '';

  constructor(
    app: App,
    editor: Editor,
    lineText: string,
    cursorColumn: number,
    settings: SemanticGlyphSettings
  ) {
    super(app);
    this.editor = editor;
    this.lineText = lineText;
    this.cursorColumn = cursorColumn;
    this.settings = settings;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('semantic-glyph-picker');

    // Title
    contentEl.createEl('h2', { text: 'Insert Glyph' });

    // Filter input
    const filterContainer = contentEl.createDiv({ cls: 'glyph-picker-filter' });
    const filterInput = filterContainer.createEl('input', {
      type: 'text',
      placeholder: 'Filter glyphs...',
    });
    filterInput.focus();
    filterInput.addEventListener('input', () => {
      this.filterText = filterInput.value.toLowerCase();
      this.renderGlyphs();
    });

    // Get suggestions based on context
    const fullText = this.editor.getValue();
    const cursorPos = this.editor.posToOffset(this.editor.getCursor());
    const suggestions = getSuggestions(fullText, cursorPos);

    // Container for glyphs
    const glyphContainer = contentEl.createDiv({ cls: 'glyph-picker-container' });
    glyphContainer.id = 'glyph-container';

    this.renderGlyphs(suggestions.glyphs);

    // Keyboard navigation
    filterInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const firstGlyph = glyphContainer.querySelector('.glyph-item');
        if (firstGlyph) {
          (firstGlyph as HTMLElement).click();
        }
      } else if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  private renderGlyphs(suggestions?: GlyphSuggestion[]) {
    const container = this.contentEl.querySelector('#glyph-container');
    if (!container) return;
    container.empty();

    // Recent glyphs section
    if (this.settings.recentGlyphs.length > 0 && !this.filterText) {
      const recentSection = container.createDiv({ cls: 'glyph-section' });
      recentSection.createEl('h4', { text: 'Recent' });
      const recentGrid = recentSection.createDiv({ cls: 'glyph-grid' });

      for (const symbol of this.settings.recentGlyphs) {
        const glyph = getGlyph(symbol);
        if (glyph) {
          this.createGlyphItem(recentGrid, glyph);
        }
      }
    }

    // Suggestions section
    if (suggestions && suggestions.length > 0 && !this.filterText) {
      const suggestedSection = container.createDiv({ cls: 'glyph-section' });
      suggestedSection.createEl('h4', { text: 'Suggested' });
      const suggestedGrid = suggestedSection.createDiv({ cls: 'glyph-grid' });

      const shown = new Set<string>();
      for (const suggestion of suggestions.slice(0, 6)) {
        if (!shown.has(suggestion.glyph.symbol)) {
          shown.add(suggestion.glyph.symbol);
          this.createGlyphItem(suggestedGrid, suggestion.glyph, suggestion.reason);
        }
      }
    }

    // Categories
    for (const category of CATEGORIES) {
      if (!this.settings.enabledCategories[category.id]) continue;

      const glyphs = getAllGlyphs().filter((g) => g.category === category.id);
      const filteredGlyphs = this.filterText
        ? glyphs.filter(
            (g) =>
              g.name.toLowerCase().includes(this.filterText) ||
              g.description.toLowerCase().includes(this.filterText)
          )
        : glyphs;

      if (filteredGlyphs.length === 0) continue;

      const section = container.createDiv({ cls: 'glyph-section' });
      section.createEl('h4', { text: category.name });

      const grid = section.createDiv({ cls: 'glyph-grid' });
      for (const glyph of filteredGlyphs) {
        this.createGlyphItem(grid, glyph);
      }
    }

    // Compounds section
    if (!this.filterText || 'compound'.includes(this.filterText)) {
      const compoundSection = container.createDiv({ cls: 'glyph-section' });
      compoundSection.createEl('h4', { text: 'Compounds' });
      const compoundGrid = compoundSection.createDiv({ cls: 'glyph-grid' });

      for (const compound of getAllCompounds()) {
        this.createCompoundItem(compoundGrid, compound);
      }
    }
  }

  private createGlyphItem(container: Element, glyph: Glyph, reason?: string) {
    const item = container.createDiv({ cls: 'glyph-item' });
    item.setAttribute('title', reason || `${glyph.name}: ${glyph.description}`);

    const symbol = item.createSpan({ cls: 'glyph-symbol' });
    symbol.textContent = glyph.symbol;
    symbol.style.color = this.settings.colorGlyphs ? glyph.color : 'inherit';

    const name = item.createSpan({ cls: 'glyph-name' });
    name.textContent = glyph.name;

    item.addEventListener('click', () => {
      this.insertGlyph(glyph.symbol);
    });
  }

  private createCompoundItem(container: Element, compound: GlyphCompound) {
    const item = container.createDiv({ cls: 'glyph-item' });
    item.setAttribute('title', compound.meaning);

    const symbol = item.createSpan({ cls: 'glyph-symbol' });
    symbol.textContent = compound.symbols;

    const name = item.createSpan({ cls: 'glyph-name' });
    name.textContent = compound.meaning.slice(0, 20) + (compound.meaning.length > 20 ? '...' : '');

    item.addEventListener('click', () => {
      this.insertGlyph(compound.symbols);
    });
  }

  private insertGlyph(symbol: string) {
    const cursor = this.editor.getCursor();
    this.editor.replaceRange(symbol, cursor);

    // Update recent glyphs
    const recent = this.settings.recentGlyphs.filter((s) => s !== symbol);
    recent.unshift(symbol);
    this.settings.recentGlyphs = recent.slice(0, this.settings.maxRecentGlyphs);

    this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

/**
 * Modal for picking DotIds
 */
class DotIdPickerModal extends Modal {
  private editor: Editor;
  private content: string;
  private settings: SemanticGlyphSettings;
  private selectedTerm: string | null;
  private counter: DotIdCounter;
  private declarations: DotDeclaration[];

  constructor(
    app: App,
    editor: Editor,
    content: string,
    settings: SemanticGlyphSettings,
    selectedTerm?: string | null
  ) {
    super(app);
    this.editor = editor;
    this.content = content;
    this.settings = settings;
    this.selectedTerm = selectedTerm || null;

    // Parse existing DotIds
    const matches = parseDotIds(content);
    this.declarations = extractDeclarations(matches);
    this.counter = new DotIdCounter(this.declarations);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('semantic-glyph-dotid-picker');

    const title = this.selectedTerm
      ? `Add DotId to "${this.selectedTerm}"`
      : 'Insert DotId';
    contentEl.createEl('h2', { text: title });

    // If we have a selected term, show "Add Declaration" option
    if (this.selectedTerm) {
      this.renderDeclarationOption();
    }

    // Show existing declarations for reference insertion
    if (this.declarations.length > 0) {
      this.renderExistingDeclarations();
    }

    // Show available DotIds
    this.renderAvailableDotIds();

    // Status
    this.renderStatus();
  }

  private renderDeclarationOption() {
    const section = this.contentEl.createDiv({ cls: 'dotid-section' });
    section.createEl('h4', { text: 'Add Declaration' });

    const nextDotId = this.counter.getNextAvailable();
    if (nextDotId) {
      const item = section.createDiv({ cls: 'dotid-item dotid-item-primary' });

      const preview = item.createSpan({ cls: 'dotid-preview' });
      preview.textContent = buildDeclaration(this.selectedTerm!, nextDotId);

      const desc = item.createSpan({ cls: 'dotid-desc' });
      desc.textContent = `Assigns DotId ${nextDotId.value} to "${this.selectedTerm}"`;

      item.addEventListener('click', () => {
        this.insertDeclaration(this.selectedTerm!, nextDotId);
      });
    } else {
      section.createEl('p', {
        text: 'All 10 DotIds are in use. Consider splitting this note.',
        cls: 'dotid-warning',
      });
    }
  }

  private renderExistingDeclarations() {
    const section = this.contentEl.createDiv({ cls: 'dotid-section' });
    section.createEl('h4', { text: 'Reference Existing' });

    for (const decl of this.declarations) {
      const item = section.createDiv({ cls: 'dotid-item' });

      const preview = item.createSpan({ cls: 'dotid-preview' });
      preview.textContent = buildReference(decl.dotId);

      const term = item.createSpan({ cls: 'dotid-term' });
      term.textContent = decl.term;

      item.addEventListener('click', () => {
        this.insertReference(decl.dotId);
      });
    }
  }

  private renderAvailableDotIds() {
    const section = this.contentEl.createDiv({ cls: 'dotid-section' });
    section.createEl('h4', { text: 'Available DotIds' });

    const grid = section.createDiv({ cls: 'dotid-grid' });

    for (const dotId of this.counter.getAvailable()) {
      const item = grid.createDiv({ cls: 'dotid-slot' });
      item.textContent = dotId.signature;
      item.setAttribute('title', `DotId ${dotId.value}`);
    }

    for (const dotId of this.counter.getUsed()) {
      const item = grid.createDiv({ cls: 'dotid-slot dotid-slot-used' });
      item.textContent = dotId.signature;
      const decl = this.counter.getDeclaration(dotId.value);
      item.setAttribute('title', decl ? `Used: ${decl.term}` : `DotId ${dotId.value} (used)`);
    }
  }

  private renderStatus() {
    const status = this.contentEl.createDiv({ cls: 'dotid-status' });
    const used = this.counter.getUsedCount();
    const available = this.counter.getAvailableCount();

    status.textContent = `${used}/10 DotIds used, ${available} available`;

    if (this.counter.isApproachingCapacity()) {
      status.addClass('dotid-status-warning');
      status.textContent += ' — Note is getting dense';
    }
  }

  private insertDeclaration(term: string, dotId: any) {
    const cursor = this.editor.getCursor();
    const declaration = buildDeclaration(term, dotId);

    // If there's a selection, replace it with the declaration
    const selection = this.editor.getSelection();
    if (selection) {
      this.editor.replaceSelection(declaration);
    } else {
      this.editor.replaceRange(declaration, cursor);
    }

    this.close();
  }

  private insertReference(dotId: any) {
    const cursor = this.editor.getCursor();
    const reference = buildReference(dotId);
    this.editor.replaceRange(reference, cursor);
    this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
