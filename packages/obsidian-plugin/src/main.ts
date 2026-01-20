/**
 * Semantic Glyph System - Obsidian Plugin
 *
 * Main entry point. Provides:
 * - Glyph and DotId recognition
 * - Context-aware glyph suggestions
 * - Nikkud-style DotId rendering
 * - Context menus for glyph/DotId insertion
 * - Sidebar views for legend and note objects
 */

import {
  App,
  Editor,
  MarkdownView,
  Menu,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  WorkspaceLeaf,
} from 'obsidian';

import { glyphDecorations, dotIdDecorations } from './editor/decorations';
import { dotIdAutoComplete, smartDotIdInput } from './editor/auto-complete';
import { GlyphLegendView, VIEW_TYPE_GLYPH_LEGEND } from './views/glyph-legend';
import { NoteObjectsView, VIEW_TYPE_NOTE_OBJECTS } from './views/note-objects';
import { SemanticGlyphSettings, DEFAULT_SETTINGS, SemanticGlyphSettingTab } from './settings/settings';
import { showGlyphMenu, showDotIdMenu } from './context-menu/menus';

export default class SemanticGlyphPlugin extends Plugin {
  settings: SemanticGlyphSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    // Register CodeMirror extensions for glyph/DotId rendering
    this.registerEditorExtension(glyphDecorations(this.settings));
    this.registerEditorExtension(dotIdDecorations(this.settings));
    this.registerEditorExtension(dotIdAutoComplete());
    this.registerEditorExtension(smartDotIdInput());

    // Register custom views
    this.registerView(VIEW_TYPE_GLYPH_LEGEND, (leaf) => new GlyphLegendView(leaf));
    this.registerView(VIEW_TYPE_NOTE_OBJECTS, (leaf) => new NoteObjectsView(leaf, this));

    // Add ribbon icon for glyph legend
    this.addRibbonIcon('languages', 'Glyph Legend', () => {
      this.activateView(VIEW_TYPE_GLYPH_LEGEND);
    });

    // Add commands
    this.addCommand({
      id: 'insert-glyph',
      name: 'Insert glyph',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.showGlyphPicker(editor);
      },
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'g' }],
    });

    this.addCommand({
      id: 'insert-dotid',
      name: 'Insert DotId',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.showDotIdPicker(editor);
      },
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'd' }],
    });

    this.addCommand({
      id: 'show-glyph-legend',
      name: 'Show glyph legend',
      callback: () => {
        this.activateView(VIEW_TYPE_GLYPH_LEGEND);
      },
    });

    this.addCommand({
      id: 'show-note-objects',
      name: 'Show note objects',
      callback: () => {
        this.activateView(VIEW_TYPE_NOTE_OBJECTS);
      },
    });

    this.addCommand({
      id: 'validate-note',
      name: 'Validate DotIds in note',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.validateCurrentNote(editor);
      },
    });

    this.addCommand({
      id: 'insert-pip-unit',
      name: 'Insert pip (unit: •)',
      editorCallback: (editor: Editor) => {
        editor.replaceSelection('•');
      },
      hotkeys: [{ modifiers: ['Alt'], key: '1' }],
    });

    this.addCommand({
      id: 'insert-pip-five',
      name: 'Insert pip (five: ○)',
      editorCallback: (editor: Editor) => {
        editor.replaceSelection('○');
      },
      hotkeys: [{ modifiers: ['Alt'], key: '5' }],
    });

    this.addCommand({
      id: 'insert-pip-ten',
      name: 'Insert pip (ten: ⦿)',
      editorCallback: (editor: Editor) => {
        editor.replaceSelection('⦿');
      },
      hotkeys: [{ modifiers: ['Alt'], key: '0' }],
    });

    // Register context menu for editor
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
        this.addEditorContextMenu(menu, editor, view);
      })
    );

    // Add settings tab
    this.addSettingTab(new SemanticGlyphSettingTab(this.app, this));

    console.log('Semantic Glyph System loaded');
  }

  onunload() {
    console.log('Semantic Glyph System unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Activate a sidebar view
   */
  async activateView(viewType: string) {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(viewType);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: viewType, active: true });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  /**
   * Show glyph picker modal
   */
  showGlyphPicker(editor: Editor) {
    const cursor = editor.getCursor();
    const lineText = editor.getLine(cursor.line);

    // Use the context-menu module to show glyph picker
    showGlyphMenu(this.app, editor, lineText, cursor.ch, this.settings);
  }

  /**
   * Show DotId picker modal
   */
  showDotIdPicker(editor: Editor) {
    const content = editor.getValue();
    showDotIdMenu(this.app, editor, content, this.settings);
  }

  /**
   * Validate current note for DotId issues
   */
  validateCurrentNote(editor: Editor) {
    const content = editor.getValue();

    // Import validation functions from core
    const {
      parseDotIds,
      extractDeclarations,
      extractReferences,
      validateDotIds,
    } = require('@semantic-glyph/core');

    const matches = parseDotIds(content);
    const declarations = extractDeclarations(matches);
    const references = extractReferences(matches, declarations);
    const result = validateDotIds(declarations, references);

    if (result.isValid) {
      new Notice('✓ All DotIds are valid');
    } else {
      const errorCount = result.errors.length;
      const warningCount = result.warnings.length;

      let message = '';
      if (errorCount > 0) {
        message += `${errorCount} error${errorCount > 1 ? 's' : ''}`;
      }
      if (warningCount > 0) {
        if (message) message += ', ';
        message += `${warningCount} warning${warningCount > 1 ? 's' : ''}`;
      }

      new Notice(`DotId validation: ${message}`);

      // Log details to console
      console.log('DotId Validation Results:', result);
    }
  }

  /**
   * Add context menu items
   */
  addEditorContextMenu(menu: Menu, editor: Editor, view: MarkdownView) {
    const cursor = editor.getCursor();
    const selection = editor.getSelection();
    const lineText = editor.getLine(cursor.line);

    // Add glyph insertion
    menu.addItem((item) => {
      item
        .setTitle('Insert glyph')
        .setIcon('languages')
        .onClick(() => {
          showGlyphMenu(this.app, editor, lineText, cursor.ch, this.settings);
        });
    });

    // Add DotId insertion (only if text is selected or cursor is on a word)
    const wordAtCursor = this.getWordAtCursor(editor);
    if (selection || wordAtCursor) {
      menu.addItem((item) => {
        item
          .setTitle(selection ? `Add DotId to "${selection}"` : `Add DotId to "${wordAtCursor}"`)
          .setIcon('dot')
          .onClick(() => {
            const content = editor.getValue();
            showDotIdMenu(this.app, editor, content, this.settings, selection || wordAtCursor);
          });
      });
    }

    // Add DotId reference insertion
    menu.addItem((item) => {
      item
        .setTitle('Insert DotId reference')
        .setIcon('corner-down-right')
        .onClick(() => {
          const content = editor.getValue();
          showDotIdMenu(this.app, editor, content, this.settings);
        });
    });
  }

  /**
   * Get the word at cursor position
   */
  getWordAtCursor(editor: Editor): string | null {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);

    // Find word boundaries
    let start = cursor.ch;
    let end = cursor.ch;

    while (start > 0 && /\w/.test(line[start - 1])) {
      start--;
    }
    while (end < line.length && /\w/.test(line[end])) {
      end++;
    }

    if (start === end) return null;
    return line.slice(start, end);
  }
}
