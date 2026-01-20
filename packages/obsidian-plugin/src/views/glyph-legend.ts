/**
 * Glyph Legend sidebar view
 */

import { ItemView, WorkspaceLeaf } from 'obsidian';
import {
  CATEGORIES,
  getAllGlyphs,
  getAllCompounds,
  getAllHebrewGlyphs,
  MENTAL_CHECKLIST,
} from '@semantic-glyph/core';

export const VIEW_TYPE_GLYPH_LEGEND = 'semantic-glyph-legend';

export class GlyphLegendView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_GLYPH_LEGEND;
  }

  getDisplayText(): string {
    return 'Glyph Legend';
  }

  getIcon(): string {
    return 'languages';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('semantic-glyph-legend');

    // Title
    container.createEl('h3', { text: 'Semantic Glyph Legend' });

    // Quick reference
    this.renderQuickReference(container);

    // Categories
    this.renderCategories(container);

    // Compounds
    this.renderCompounds(container);

    // Hebrew
    this.renderHebrew(container);

    // Mental checklist
    this.renderChecklist(container);
  }

  private renderQuickReference(container: Element) {
    const section = container.createDiv({ cls: 'legend-section' });
    section.createEl('h4', { text: 'Quick Reference' });

    const grid = section.createDiv({ cls: 'legend-quick-grid' });

    for (const category of CATEGORIES) {
      const row = grid.createDiv({ cls: 'legend-quick-row' });

      const glyphs = row.createSpan({ cls: 'legend-quick-glyphs' });
      glyphs.textContent = `${category.baseGlyph} / ${category.altGlyph}`;

      const name = row.createSpan({ cls: 'legend-quick-name' });
      name.textContent = category.name;
    }
  }

  private renderCategories(container: Element) {
    const section = container.createDiv({ cls: 'legend-section' });
    section.createEl('h4', { text: 'Categories' });

    for (const category of CATEGORIES) {
      const categoryEl = section.createDiv({ cls: 'legend-category' });

      const header = categoryEl.createDiv({ cls: 'legend-category-header' });
      header.createEl('strong', { text: category.name });
      header.createEl('span', { text: ` — ${category.description}` });

      const glyphs = getAllGlyphs().filter((g) => g.category === category.id);

      for (const glyph of glyphs) {
        const glyphRow = categoryEl.createDiv({ cls: 'legend-glyph-row' });

        const symbol = glyphRow.createSpan({ cls: 'legend-glyph-symbol' });
        symbol.textContent = glyph.symbol;
        symbol.style.color = glyph.color;

        const info = glyphRow.createDiv({ cls: 'legend-glyph-info' });
        info.createEl('strong', { text: glyph.name });
        info.createEl('span', { text: ` — ${glyph.description}` });
      }
    }
  }

  private renderCompounds(container: Element) {
    const section = container.createDiv({ cls: 'legend-section' });
    section.createEl('h4', { text: 'Compounds' });
    section.createEl('p', {
      text: 'Combine glyphs to express relationships (max 3 per statement)',
      cls: 'legend-note',
    });

    const compounds = getAllCompounds();

    // Group by category
    const byCategory: Record<string, typeof compounds> = {
      agency: [],
      epistemic: [],
      structural: [],
    };

    for (const compound of compounds) {
      byCategory[compound.compoundCategory].push(compound);
    }

    for (const [category, items] of Object.entries(byCategory)) {
      if (items.length === 0) continue;

      const catEl = section.createDiv({ cls: 'legend-compound-category' });
      catEl.createEl('h5', { text: category.charAt(0).toUpperCase() + category.slice(1) });

      for (const compound of items) {
        const row = catEl.createDiv({ cls: 'legend-compound-row' });

        const symbol = row.createSpan({ cls: 'legend-compound-symbol' });
        symbol.textContent = compound.symbols;

        const meaning = row.createSpan({ cls: 'legend-compound-meaning' });
        meaning.textContent = compound.meaning;
      }
    }
  }

  private renderHebrew(container: Element) {
    const section = container.createDiv({ cls: 'legend-section' });
    section.createEl('h4', { text: 'Hebrew Micro-Glyphs' });
    section.createEl('p', {
      text: 'Interpretive bias layer — one per sentence/paragraph',
      cls: 'legend-note',
    });

    const hebrewGlyphs = getAllHebrewGlyphs();

    for (const glyph of hebrewGlyphs) {
      const row = section.createDiv({ cls: 'legend-hebrew-row' });

      const letter = row.createSpan({ cls: 'legend-hebrew-letter' });
      letter.textContent = glyph.letter;

      const info = row.createDiv({ cls: 'legend-hebrew-info' });
      info.createEl('strong', { text: glyph.bias });
      info.createEl('span', { text: ` — ${glyph.description}` });
    }
  }

  private renderChecklist(container: Element) {
    const section = container.createDiv({ cls: 'legend-section' });
    section.createEl('h4', { text: 'Mental Checklist' });
    section.createEl('p', {
      text: 'Before adding a glyph, ask:',
      cls: 'legend-note',
    });

    const list = section.createEl('ol', { cls: 'legend-checklist' });

    for (const item of MENTAL_CHECKLIST) {
      const li = list.createEl('li');
      li.createEl('span', { text: item.question });
      li.createEl('span', { text: ` → ${item.glyphs.join(' ')}`, cls: 'legend-checklist-glyphs' });
    }

    section.createEl('p', {
      text: "If none apply, don't mark it.",
      cls: 'legend-note legend-note-emphasis',
    });
  }

  async onClose() {
    // Nothing to clean up
  }
}
