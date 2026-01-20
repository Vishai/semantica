/**
 * CodeMirror 6 decorations for glyphs and DotIds
 */

import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { RangeSetBuilder, Extension } from '@codemirror/state';
import {
  GLYPHS,
  isGlyph,
  getGlyph,
  CATEGORY_COLORS,
  parseDotIds,
  getDotIdBySignature,
  toNikkudSize,
  CLUSTER_PATTERNS,
  type DotId,
} from '@semantic-glyph/core';
import type { SemanticGlyphSettings } from '../settings/settings';

/**
 * Widget for rendering DotId subscripts
 */
class DotIdWidget extends WidgetType {
  constructor(
    private dotId: DotId,
    private term: string | null,
    private settings: SemanticGlyphSettings
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const container = document.createElement('span');
    container.className = 'semantic-glyph-dotid';

    if (this.settings.nikkudStyle && this.term) {
      // Nikkud-style: show term with subscript dots
      const termSpan = document.createElement('span');
      termSpan.className = 'semantic-glyph-term';
      termSpan.textContent = this.term;
      container.appendChild(termSpan);

      const dotSpan = this.createDotSubscript();
      container.appendChild(dotSpan);
    } else {
      // Inline style: show braces with dots
      container.textContent = `{${this.dotId.signature}}`;
      container.className += ' semantic-glyph-dotid-inline';
    }

    return container;
  }

  private createDotSubscript(): HTMLElement {
    const dotSpan = document.createElement('span');
    dotSpan.className = `semantic-glyph-dots semantic-glyph-dots-${this.settings.dotIdSize}`;

    if (this.dotId.isCluster) {
      // Grape cluster pattern
      const pattern = CLUSTER_PATTERNS[this.dotId.value];
      if (pattern) {
        const topRow = document.createElement('span');
        topRow.className = 'semantic-glyph-cluster-top';
        topRow.textContent = pattern.top.map((d) => toNikkudSize(d)).join('');

        const bottomRow = document.createElement('span');
        bottomRow.className = 'semantic-glyph-cluster-bottom';
        bottomRow.textContent = toNikkudSize(pattern.bottom);

        dotSpan.appendChild(topRow);
        dotSpan.appendChild(bottomRow);
        dotSpan.className += ' semantic-glyph-cluster';
      }
    } else {
      // Simple horizontal dots
      dotSpan.textContent = toNikkudSize(this.dotId.signature);
    }

    return dotSpan;
  }

  eq(other: DotIdWidget): boolean {
    return (
      this.dotId.value === other.dotId.value &&
      this.term === other.term &&
      this.settings.nikkudStyle === other.settings.nikkudStyle &&
      this.settings.dotIdSize === other.settings.dotIdSize
    );
  }
}

/**
 * Create DotId decorations extension
 */
export function dotIdDecorations(settings: SemanticGlyphSettings): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view, settings);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view, settings);
        }
      }

      buildDecorations(view: EditorView, settings: SemanticGlyphSettings): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const text = view.state.doc.toString();
        const matches = parseDotIds(text);

        for (const match of matches) {
          const from = match.position.offset;
          const to = from + match.position.length;

          // Replace the entire match with a widget
          const decoration = Decoration.replace({
            widget: new DotIdWidget(match.dotId, match.term, settings),
          });

          builder.add(from, to, decoration);
        }

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}

/**
 * Glyph mark decoration with color and tooltip
 */
function glyphMark(symbol: string, settings: SemanticGlyphSettings): Decoration {
  const glyph = getGlyph(symbol);
  if (!glyph) {
    return Decoration.mark({ class: 'semantic-glyph-unknown' });
  }

  const classes = ['semantic-glyph'];
  if (settings.colorGlyphs) {
    classes.push(`semantic-glyph-${glyph.category}`);
  }

  const attributes: Record<string, string> = {
    class: classes.join(' '),
  };

  if (settings.showTooltips) {
    attributes['title'] = `${glyph.name}: ${glyph.description}`;
  }

  if (settings.colorGlyphs) {
    attributes['style'] = `color: ${glyph.color}`;
  }

  return Decoration.mark({ attributes });
}

/**
 * Create glyph decorations extension
 */
export function glyphDecorations(settings: SemanticGlyphSettings): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view, settings);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view, settings);
        }
      }

      buildDecorations(view: EditorView, settings: SemanticGlyphSettings): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const text = view.state.doc.toString();

        // Find DotId ranges to exclude (don't color glyphs inside DotIds)
        const dotIdMatches = parseDotIds(text);
        const excludeRanges = new Set<number>();
        for (const match of dotIdMatches) {
          for (let i = match.position.offset; i < match.position.offset + match.position.length; i++) {
            excludeRanges.add(i);
          }
        }

        // Find and decorate glyphs
        for (let i = 0; i < text.length; i++) {
          if (excludeRanges.has(i)) continue;

          const char = text[i];
          if (isGlyph(char)) {
            const decoration = glyphMark(char, settings);
            builder.add(i, i + 1, decoration);
          }
        }

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}
