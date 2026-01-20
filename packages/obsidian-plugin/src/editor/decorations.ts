/**
 * CodeMirror 6 decorations for glyphs and DotIds
 *
 * Renders:
 * - Term{•} → Term with · beneath
 * - "Multi Word"{•} → Multi Word with · beneath (quotes hidden)
 * - ■{•} → ■ with · beneath
 * - {•} → · inline (standalone reference)
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
  isGlyph,
  getGlyph,
  parseDotIds,
  toNikkudSize,
  CLUSTER_PATTERNS,
  type DotIdMatch,
} from '@semantic-glyph/core';
import type { SemanticGlyphSettings } from '../settings/settings';

/**
 * Widget for rendering DotId with subscript dots
 */
class DotIdWidget extends WidgetType {
  constructor(
    private match: DotIdMatch,
    private settings: SemanticGlyphSettings,
    private isIncomplete = false
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const container = document.createElement('span');
    container.className = 'semantica-dotid';
    if (this.isIncomplete) {
      container.className += ' semantica-dotid-incomplete';
    }

    if (this.settings.nikkudStyle) {
      // Nikkud-style: show anchor with subscript dots
      const anchorSpan = document.createElement('span');
      anchorSpan.className = 'semantica-anchor';

      if (this.match.attachmentType === 'term' && this.match.term) {
        // Term attachment
        anchorSpan.textContent = this.match.term;
        anchorSpan.className += ' semantica-anchor-term';
      } else if (this.match.attachmentType === 'glyph' && this.match.glyph) {
        // Glyph attachment
        anchorSpan.textContent = this.match.glyph;
        anchorSpan.className += ' semantica-anchor-glyph';
        const glyph = getGlyph(this.match.glyph);
        if (glyph && this.settings.colorGlyphs) {
          anchorSpan.style.color = glyph.color;
        }
      } else {
        // Standalone reference - just show the dots inline
        container.textContent = toNikkudSize(this.match.dotId.signature);
        container.className = 'semantica-reference';
        return container;
      }

      container.appendChild(anchorSpan);

      // Add dots beneath
      const dotSpan = this.createDotSubscript();
      container.appendChild(dotSpan);
    } else {
      // Fallback: show raw syntax (for debugging)
      container.textContent = this.match.raw;
      container.className = 'semantica-dotid-raw';
    }

    // Add tooltip
    if (this.settings.showTooltips) {
      const anchor = this.match.term || this.match.glyph || 'reference';
      container.title = `DotId ${this.match.dotId.value}: ${anchor}`;
    }

    return container;
  }

  private createDotSubscript(): HTMLElement {
    const dotSpan = document.createElement('span');
    dotSpan.className = `semantica-dots semantica-dots-${this.settings.dotIdSize}`;

    if (this.match.dotId.isCluster) {
      // Grape cluster pattern (3, 7, 8)
      const pattern = CLUSTER_PATTERNS[this.match.dotId.value];
      if (pattern) {
        const topRow = document.createElement('span');
        topRow.className = 'semantica-cluster-top';
        topRow.textContent = pattern.top.map((d) => toNikkudSize(d)).join('');

        const bottomRow = document.createElement('span');
        bottomRow.className = 'semantica-cluster-bottom';
        bottomRow.textContent = toNikkudSize(pattern.bottom);

        dotSpan.appendChild(topRow);
        dotSpan.appendChild(bottomRow);
        dotSpan.className += ' semantica-cluster';
      }
    } else {
      // Simple horizontal dots
      dotSpan.textContent = toNikkudSize(this.match.dotId.signature);
    }

    return dotSpan;
  }

  eq(other: DotIdWidget): boolean {
    return (
      this.match.dotId.value === other.match.dotId.value &&
      this.match.attachmentType === other.match.attachmentType &&
      this.match.term === other.match.term &&
      this.match.glyph === other.match.glyph &&
      this.settings.nikkudStyle === other.settings.nikkudStyle &&
      this.settings.dotIdSize === other.settings.dotIdSize &&
      this.isIncomplete === other.isIncomplete
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

        // Parse both complete and incomplete dotIds for live preview
        const completeMatches = parseDotIds(text, false);
        const allMatches = parseDotIds(text, true);

        // Create a set of complete match positions to avoid duplicates
        const completePositions = new Set(
          completeMatches.map(m => `${m.position.offset}-${m.position.length}`)
        );

        // First add all complete matches
        for (const match of completeMatches) {
          const from = match.position.offset;
          const to = from + match.position.length;

          const decoration = Decoration.replace({
            widget: new DotIdWidget(match, settings, false),
          });

          builder.add(from, to, decoration);
        }

        // Then add incomplete matches (only if not already matched as complete)
        for (const match of allMatches) {
          const posKey = `${match.position.offset}-${match.position.length}`;
          if (!completePositions.has(posKey)) {
            const from = match.position.offset;
            const to = from + match.position.length;

            const decoration = Decoration.replace({
              widget: new DotIdWidget(match, settings, true),
            });

            builder.add(from, to, decoration);
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

/**
 * Glyph mark decoration with color and tooltip
 */
function glyphMark(symbol: string, settings: SemanticGlyphSettings): Decoration {
  const glyph = getGlyph(symbol);
  if (!glyph) {
    return Decoration.mark({ class: 'semantica-glyph-unknown' });
  }

  const classes = ['semantica-glyph'];
  if (settings.colorGlyphs) {
    classes.push(`semantica-glyph-${glyph.category}`);
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

        // Find DotId ranges to exclude (glyphs inside DotIds are handled by DotIdWidget)
        const dotIdMatches = parseDotIds(text);
        const excludeRanges = new Set<number>();
        for (const match of dotIdMatches) {
          for (let i = match.position.offset; i < match.position.offset + match.position.length; i++) {
            excludeRanges.add(i);
          }
        }

        // Find and decorate standalone glyphs
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
