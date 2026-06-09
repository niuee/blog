import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';

/**
 * Reproduces the legacy build's `<span class="code-language-label">{lang}</span>`
 * inserted as the first child of each <pre> that contains a highlighted code block
 * with a `language-*` class.
 */
export function rehypeCodeLanguageLabel() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'pre') return;
      const code = node.children.find(
        (c): c is Element => c.type === 'element' && c.tagName === 'code',
      );
      if (!code) return;
      const classes = (code.properties?.className as string[] | undefined) ?? [];
      const langClass = classes.find((c) => c.startsWith('language-'));
      if (!langClass) return;
      const lang = langClass.replace('language-', '');
      node.children.unshift({
        type: 'element',
        tagName: 'span',
        properties: { className: ['code-language-label'] },
        children: [{ type: 'text', value: lang }],
      });
    });
  };
}
