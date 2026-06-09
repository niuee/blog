import { describe, it, expect } from 'vitest';
import { rehype } from 'rehype';
import rehypeHighlight from 'rehype-highlight';
import { rehypeCodeLanguageLabel } from './rehype-code-language-label';

async function run(html: string): Promise<string> {
  const file = await rehype()
    .data('settings', { fragment: true })
    .use(rehypeHighlight)
    .use(rehypeCodeLanguageLabel)
    .process(html);
  return String(file);
}

describe('rehypeCodeLanguageLabel', () => {
  it('prepends a language label span inside <pre> for fenced code with a language', async () => {
    const out = await run('<pre><code class="language-javascript">const x = 1;</code></pre>');
    expect(out).toContain('<span class="code-language-label">javascript</span>');
    expect(out.indexOf('code-language-label')).toBeLessThan(out.indexOf('<code'));
  });

  it('does not add a label when there is no language class', async () => {
    const out = await run('<pre><code>plain text</code></pre>');
    expect(out).not.toContain('code-language-label');
  });
});
