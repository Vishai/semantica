/**
 * Context menus for glyph and DotId insertion
 *
 * Improved UX:
 * - Clear preview of what will be inserted
 * - Visual DotId grid showing available/used
 * - Support for multi-word terms and glyph attachment
 */

import { App, Editor, Modal } from 'obsidian';
import {
  getAllGlyphs,
  getGlyph,
  isGlyph,
  CATEGORIES,
  getAllCompounds,
  getSuggestions,
  parseDotIds,
  extractDeclarations,
  DotIdCounter,
  DOT_IDS,
  buildDeclaration,
  buildGlyphAttachment,
  buildReference,
  type Glyph,
  type GlyphCompound,
  type GlyphSuggestion,
  type DotDeclaration,
  type DotId,
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
  selectedText?: string | null
) {
  const modal = new DotIdPickerModal(app, editor, content, settings, selectedText);
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
    contentEl.addClass('semantica-glyph-picker');

    contentEl.createEl('h2', { text: 'Insert Glyph' });

    // Filter input
    const filterContainer = contentEl.createDiv({ cls: 'semantica-filter' });
    const filterInput = filterContainer.createEl('input', {
      type: 'text',
      placeholder: 'Filter glyphs...',
    });
    filterInput.focus();
    filterInput.addEventListener('input', () => {
      this.filterText = filterInput.value.toLowerCase();
      this.renderGlyphs();
    });

    // Get suggestions
    const fullText = this.editor.getValue();
    const cursorPos = this.editor.posToOffset(this.editor.getCursor());
    const suggestions = getSuggestions(fullText, cursorPos);

    // Container for glyphs
    const glyphContainer = contentEl.createDiv({ cls: 'semantica-picker-container' });
    glyphContainer.id = 'glyph-container';

    this.renderGlyphs(suggestions.glyphs);

    // Keyboard navigation
    filterInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const firstGlyph = glyphContainer.querySelector('.semantica-item');
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

    // Recent glyphs
    if (this.settings.recentGlyphs.length > 0 && !this.filterText) {
      const recentSection = container.createDiv({ cls: 'semantica-section' });
      recentSection.createEl('h4', { text: 'Recent' });
      const recentGrid = recentSection.createDiv({ cls: 'semantica-grid' });

      for (const symbol of this.settings.recentGlyphs) {
        const glyph = getGlyph(symbol);
        if (glyph) {
          this.createGlyphItem(recentGrid, glyph);
        }
      }
    }

    // Suggestions
    if (suggestions && suggestions.length > 0 && !this.filterText) {
      const suggestedSection = container.createDiv({ cls: 'semantica-section' });
      suggestedSection.createEl('h4', { text: 'Suggested' });
      const suggestedGrid = suggestedSection.createDiv({ cls: 'semantica-grid' });

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

      const section = container.createDiv({ cls: 'semantica-section' });
      section.createEl('h4', { text: category.name });

      const grid = section.createDiv({ cls: 'semantica-grid' });
      for (const glyph of filteredGlyphs) {
        this.createGlyphItem(grid, glyph);
      }
    }

    // Compounds
    if (!this.filterText || 'compound'.includes(this.filterText)) {
      const compoundSection = container.createDiv({ cls: 'semantica-section' });
      compoundSection.createEl('h4', { text: 'Compounds' });
      const compoundGrid = compoundSection.createDiv({ cls: 'semantica-grid' });

      for (const compound of getAllCompounds()) {
        this.createCompoundItem(compoundGrid, compound);
      }
    }
  }

  private createGlyphItem(container: Element, glyph: Glyph, reason?: string) {
    const item = container.createDiv({ cls: 'semantica-item' });
    item.setAttribute('title', reason || `${glyph.name}: ${glyph.description}`);

    const symbol = item.createSpan({ cls: 'semantica-symbol' });
    symbol.textContent = glyph.symbol;
    symbol.style.color = this.settings.colorGlyphs ? glyph.color : 'inherit';

    const name = item.createSpan({ cls: 'semantica-name' });
    name.textContent = glyph.name;

    item.addEventListener('click', () => {
      this.insertGlyph(glyph.symbol);
    });
  }

  private createCompoundItem(container: Element, compound: GlyphCompound) {
    const item = container.createDiv({ cls: 'semantica-item' });
    item.setAttribute('title', compound.meaning);

    const symbol = item.createSpan({ cls: 'semantica-symbol' });
    symbol.textContent = compound.symbols;

    const name = item.createSpan({ cls: 'semantica-name' });
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
 *
 * Improved UX:
 * - Shows clear visual grid of available DotIds
 * - Preview of exactly what will be inserted
 * - Handles multi-word selections and glyph attachment
 */
class DotIdPickerModal extends Modal {
  private editor: Editor;
  private content: string;
  private settings: SemanticGlyphSettings;
  private selectedText: string | null;
  private counter: DotIdCounter;
  private declarations: DotDeclaration[];
  private isGlyphAttachment: boolean;

  constructor(
    app: App,
    editor: Editor,
    content: string,
    settings: SemanticGlyphSettings,
    selectedText?: string | null
  ) {
    super(app);
    this.editor = editor;
    this.content = content;
    this.settings = settings;
    this.selectedText = selectedText?.trim() || null;

    // Check if selected text is a glyph
    this.isGlyphAttachment = this.selectedText !== null &&
      this.selectedText.length === 1 &&
      isGlyph(this.selectedText);

    // Parse existing DotIds
    const matches = parseDotIds(content);
    this.declarations = extractDeclarations(matches);
    this.counter = new DotIdCounter(this.declarations);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('semantica-dotid-picker');

    // Title based on context
    let title = 'DotId Assignment';
    if (this.selectedText) {
      if (this.isGlyphAttachment) {
        title = `Assign DotId to glyph: ${this.selectedText}`;
      } else {
        title = `Assign DotId to: "${this.selectedText}"`;
      }
    }
    contentEl.createEl('h2', { text: title });

    // If we have selected text, show assignment options
    if (this.selectedText) {
      this.renderAssignmentSection();
    }

    // Always show available DotIds as a visual grid
    this.renderDotIdGrid();

    // Show existing declarations for reference
    if (this.declarations.length > 0) {
      this.renderExistingDeclarations();
    }

    // Status bar
    this.renderStatus();
  }

  private renderAssignmentSection() {
    const section = this.contentEl.createDiv({ cls: 'semantica-section semantica-section-primary' });
    section.createEl('h4', { text: 'Choose a DotId' });

    const grid = section.createDiv({ cls: 'semantica-dotid-assignment-grid' });

    // Show all 10 DotIds with visual state
    for (const dotId of DOT_IDS) {
      const isUsed = this.counter.isUsed(dotId.value);
      const decl = this.counter.getDeclaration(dotId.value);

      const item = grid.createDiv({
        cls: `semantica-dotid-slot ${isUsed ? 'semantica-dotid-slot-used' : 'semantica-dotid-slot-available'}`,
      });

      // Dot signature
      const sig = item.createDiv({ cls: 'semantica-dotid-sig' });
      sig.textContent = dotId.signature;

      // Status label
      const label = item.createDiv({ cls: 'semantica-dotid-label' });
      if (isUsed && decl) {
        label.textContent = decl.term;
        label.title = `Already assigned to "${decl.term}"`;
      } else {
        label.textContent = `DotId ${dotId.value}`;
      }

      // Only allow clicking available slots
      if (!isUsed) {
        item.addEventListener('click', () => {
          this.assignDotId(dotId);
        });
      }
    }

    // Preview section
    const preview = section.createDiv({ cls: 'semantica-preview' });
    preview.createEl('span', { text: 'Will insert: ' });
    const previewCode = preview.createEl('code');

    const nextAvailable = this.counter.getNextAvailable();
    if (nextAvailable) {
      if (this.isGlyphAttachment) {
        previewCode.textContent = buildGlyphAttachment(this.selectedText!, nextAvailable);
      } else if (this.selectedText!.includes(' ')) {
        previewCode.textContent = `"${this.selectedText}"{${nextAvailable.signature}}`;
      } else {
        previewCode.textContent = buildDeclaration(this.selectedText!, nextAvailable);
      }
    } else {
      previewCode.textContent = '(all DotIds in use)';
    }
  }

  private renderDotIdGrid() {
    const section = this.contentEl.createDiv({ cls: 'semantica-section' });
    section.createEl('h4', { text: 'DotId Overview' });

    const grid = section.createDiv({ cls: 'semantica-dotid-overview' });

    for (const dotId of DOT_IDS) {
      const isUsed = this.counter.isUsed(dotId.value);
      const decl = this.counter.getDeclaration(dotId.value);

      const item = grid.createDiv({
        cls: `semantica-dotid-mini ${isUsed ? 'semantica-dotid-mini-used' : ''}`,
      });
      item.textContent = dotId.signature;

      if (isUsed && decl) {
        item.title = `${dotId.value}: ${decl.term}`;
      } else {
        item.title = `${dotId.value}: available`;
      }
    }
  }

  private renderExistingDeclarations() {
    const section = this.contentEl.createDiv({ cls: 'semantica-section' });
    section.createEl('h4', { text: 'Insert Reference' });
    section.createEl('p', {
      text: 'Click to insert a reference to an existing DotId:',
      cls: 'semantica-hint'
    });

    const list = section.createDiv({ cls: 'semantica-ref-list' });

    for (const decl of this.declarations) {
      const item = list.createDiv({ cls: 'semantica-ref-item' });

      const sig = item.createSpan({ cls: 'semantica-ref-sig' });
      sig.textContent = decl.dotId.signature;

      const term = item.createSpan({ cls: 'semantica-ref-term' });
      term.textContent = decl.term;

      const arrow = item.createSpan({ cls: 'semantica-ref-arrow' });
      arrow.textContent = '→';

      const result = item.createSpan({ cls: 'semantica-ref-result' });
      result.textContent = `{${decl.dotId.signature}}`;

      item.addEventListener('click', () => {
        this.insertReference(decl.dotId);
      });
    }
  }

  private renderStatus() {
    const status = this.contentEl.createDiv({ cls: 'semantica-status' });
    const used = this.counter.getUsedCount();

    status.textContent = `${used}/10 DotIds used`;

    if (this.counter.isApproachingCapacity()) {
      status.addClass('semantica-status-warning');
      status.createEl('span', {
        text: ' — Consider splitting this note',
        cls: 'semantica-status-hint',
      });
    }
  }

  private assignDotId(dotId: DotId) {
    let insertion: string;

    if (this.isGlyphAttachment) {
      insertion = buildGlyphAttachment(this.selectedText!, dotId);
    } else if (this.selectedText!.includes(' ')) {
      // Multi-word: wrap in quotes
      insertion = `"${this.selectedText}"{${dotId.signature}}`;
    } else {
      insertion = buildDeclaration(this.selectedText!, dotId);
    }

    // Replace selection with the declaration
    const selection = this.editor.getSelection();
    if (selection) {
      this.editor.replaceSelection(insertion);
    } else {
      const cursor = this.editor.getCursor();
      this.editor.replaceRange(insertion, cursor);
    }

    this.close();
  }

  private insertReference(dotId: DotId) {
    const reference = buildReference(dotId);
    const cursor = this.editor.getCursor();
    this.editor.replaceRange(reference, cursor);
    this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
