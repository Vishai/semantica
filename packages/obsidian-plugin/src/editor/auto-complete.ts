/**
 * Smart auto-completion for DotId signatures
 *
 * Automatically closes dotId syntax when:
 * - User types Term{ or Glyph{ followed by pip characters
 * - User presses space or any non-pip character
 */

import { EditorView, ViewPlugin, ViewUpdate, keymap } from '@codemirror/view';
import { Extension, EditorState } from '@codemirror/state';
import { isDotChar, isValidSignature } from '@semantic-glyph/core';

/**
 * Check if cursor is inside an incomplete dotId pattern
 */
function getIncompleteDotIdContext(state: EditorState, pos: number): {
  start: number;
  anchor: string;
  pips: string;
} | null {
  const doc = state.doc.toString();
  const lineStart = doc.lastIndexOf('\n', pos - 1) + 1;
  const lineBefore = doc.slice(lineStart, pos);

  // Match incomplete pattern: Word{ or Glyph{ followed by pip characters
  const match = lineBefore.match(/(\w+|[■⌂→←↑↓▲▼◇¿⊗⇄↻⌁§—⚠תת★✓≈])\{([•○⦿]*)$/);

  if (match) {
    return {
      start: lineStart + match.index!,
      anchor: match[1],
      pips: match[2],
    };
  }

  // Also check for quoted terms
  const quotedMatch = lineBefore.match(/"([^"]+)"\{([•○⦿]*)$/);
  if (quotedMatch) {
    return {
      start: lineStart + quotedMatch.index!,
      anchor: quotedMatch[1],
      pips: quotedMatch[2],
    };
  }

  return null;
}

/**
 * Auto-complete extension that closes dotId syntax
 */
export function dotIdAutoComplete(): Extension {
  return keymap.of([
    {
      key: ' ',
      run: (view: EditorView) => {
        const state = view.state;
        const pos = state.selection.main.head;
        const context = getIncompleteDotIdContext(state, pos);

        if (context && context.pips.length > 0) {
          // Check if the pips form a valid signature
          if (isValidSignature(context.pips)) {
            // Auto-close with }
            view.dispatch({
              changes: {
                from: pos,
                insert: '} ',
              },
              selection: { anchor: pos + 2 },
            });
            return true; // Handled
          }
        }

        return false; // Not handled, use default space behavior
      },
    },
    {
      key: 'Enter',
      run: (view: EditorView) => {
        const state = view.state;
        const pos = state.selection.main.head;
        const context = getIncompleteDotIdContext(state, pos);

        if (context && context.pips.length > 0) {
          // Check if the pips form a valid signature
          if (isValidSignature(context.pips)) {
            // Auto-close with } and then newline
            view.dispatch({
              changes: {
                from: pos,
                insert: '}\n',
              },
              selection: { anchor: pos + 2 },
            });
            return true; // Handled
          }
        }

        return false; // Not handled, use default enter behavior
      },
    },
  ]);
}

/**
 * Helper text insertion that auto-detects when to insert/close dotIds
 */
export function smartDotIdInput(): Extension {
  return EditorView.updateListener.of((update: ViewUpdate) => {
    if (!update.docChanged) return;

    const changes = update.changes;
    const state = update.state;

    changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      const insertedText = inserted.toString();

      // Case 1: User typed a pip character - check if we need to auto-insert {
      if (insertedText.length === 1 && isDotChar(insertedText)) {
        const pos = toB;
        const doc = state.doc.toString();
        const lineStart = doc.lastIndexOf('\n', pos - 1) + 1;
        const beforePip = doc.slice(lineStart, pos - 1);

        // Check if pip immediately follows a term/glyph (no { yet)
        const termMatch = beforePip.match(/(\w+)$/);
        const glyphMatch = beforePip.match(/([■⌂→←↑↓▲▼◇¿⊗⇄↻⌁§—⚠תת★✓≈])$/);
        const quotedMatch = beforePip.match(/"([^"]+)"$/);

        if (termMatch || glyphMatch || quotedMatch) {
          // Auto-insert { before the pip
          update.view.dispatch({
            changes: {
              from: pos - 1,
              to: pos - 1,
              insert: '{',
            },
            selection: { anchor: pos + 1 },
          });
        }
      }

      // Case 2: User typed a non-pip character after pips - auto-close with }
      if (insertedText.length === 1 && !isDotChar(insertedText)) {
        const pos = toB;
        const context = getIncompleteDotIdContext(state, pos - 1);

        if (context && context.pips.length > 0 && isValidSignature(context.pips)) {
          // Auto-insert closing brace before the character
          update.view.dispatch({
            changes: {
              from: pos - 1,
              to: pos - 1,
              insert: '}',
            },
            selection: { anchor: pos },
          });
        }
      }
    });
  });
}
