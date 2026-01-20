/**
 * Plugin settings
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import type SemanticGlyphPlugin from '../main';
import { CATEGORIES, type CategoryInfo } from '@semantic-glyph/core';

export interface SemanticGlyphSettings {
  /** Whether to show glyphs with colors */
  colorGlyphs: boolean;
  /** Whether to show glyph tooltips on hover */
  showTooltips: boolean;
  /** Size of rendered DotIds */
  dotIdSize: 'small' | 'medium' | 'large';
  /** Whether to render DotIds in nikkud style */
  nikkudStyle: boolean;
  /** Whether to show suggestions */
  enableSuggestions: boolean;
  /** Minimum confidence for showing suggestions */
  suggestionThreshold: number;
  /** Which categories to show in context menu */
  enabledCategories: Record<string, boolean>;
  /** Recently used glyphs (for quick access) */
  recentGlyphs: string[];
  /** Maximum recent glyphs to track */
  maxRecentGlyphs: number;
}

export const DEFAULT_SETTINGS: SemanticGlyphSettings = {
  colorGlyphs: true,
  showTooltips: true,
  dotIdSize: 'medium',
  nikkudStyle: true,
  enableSuggestions: true,
  suggestionThreshold: 0.5,
  enabledCategories: Object.fromEntries(
    CATEGORIES.map((c) => [c.id, true])
  ),
  recentGlyphs: [],
  maxRecentGlyphs: 5,
};

export class SemanticGlyphSettingTab extends PluginSettingTab {
  plugin: SemanticGlyphPlugin;

  constructor(app: App, plugin: SemanticGlyphPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Semantic Glyph System Settings' });

    // Appearance section
    containerEl.createEl('h3', { text: 'Appearance' });

    new Setting(containerEl)
      .setName('Color glyphs')
      .setDesc('Display glyphs with category-based colors')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.colorGlyphs).onChange(async (value) => {
          this.plugin.settings.colorGlyphs = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Show tooltips')
      .setDesc('Show glyph meanings on hover')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showTooltips).onChange(async (value) => {
          this.plugin.settings.showTooltips = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('DotId size')
      .setDesc('Size of DotId subscripts')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('small', 'Small')
          .addOption('medium', 'Medium')
          .addOption('large', 'Large')
          .setValue(this.plugin.settings.dotIdSize)
          .onChange(async (value: 'small' | 'medium' | 'large') => {
            this.plugin.settings.dotIdSize = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Nikkud-style DotIds')
      .setDesc('Render DotIds as tight subscripts beneath terms (like Hebrew vowel points)')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.nikkudStyle).onChange(async (value) => {
          this.plugin.settings.nikkudStyle = value;
          await this.plugin.saveSettings();
        })
      );

    // Suggestions section
    containerEl.createEl('h3', { text: 'Suggestions' });

    new Setting(containerEl)
      .setName('Enable suggestions')
      .setDesc('Show context-aware glyph suggestions')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableSuggestions).onChange(async (value) => {
          this.plugin.settings.enableSuggestions = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Suggestion threshold')
      .setDesc('Minimum confidence level for showing suggestions (0-1)')
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.1)
          .setValue(this.plugin.settings.suggestionThreshold)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.suggestionThreshold = value;
            await this.plugin.saveSettings();
          })
      );

    // Categories section
    containerEl.createEl('h3', { text: 'Glyph Categories' });
    containerEl.createEl('p', {
      text: 'Enable or disable categories in the glyph picker',
      cls: 'setting-item-description',
    });

    for (const category of CATEGORIES) {
      new Setting(containerEl)
        .setName(category.name)
        .setDesc(`${category.baseGlyph} / ${category.altGlyph} — ${category.description}`)
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.enabledCategories[category.id] ?? true)
            .onChange(async (value) => {
              this.plugin.settings.enabledCategories[category.id] = value;
              await this.plugin.saveSettings();
            })
        );
    }

    // Recent glyphs section
    containerEl.createEl('h3', { text: 'Recent Glyphs' });

    new Setting(containerEl)
      .setName('Max recent glyphs')
      .setDesc('Number of recently used glyphs to show at top of picker')
      .addSlider((slider) =>
        slider
          .setLimits(0, 10, 1)
          .setValue(this.plugin.settings.maxRecentGlyphs)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxRecentGlyphs = value;
            await this.plugin.saveSettings();
          })
      );

    if (this.plugin.settings.recentGlyphs.length > 0) {
      new Setting(containerEl)
        .setName('Clear recent glyphs')
        .setDesc(`Currently tracking: ${this.plugin.settings.recentGlyphs.join(' ')}`)
        .addButton((button) =>
          button.setButtonText('Clear').onClick(async () => {
            this.plugin.settings.recentGlyphs = [];
            await this.plugin.saveSettings();
            this.display(); // Refresh
          })
        );
    }
  }
}
