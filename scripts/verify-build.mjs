import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
function files(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
assert.ok(existsSync(dist), '先运行 npm run build');
const pages = files(dist).filter(path => path.endsWith('.html'));
assert.ok(pages.length >= 10, '应包含首页、两个列表、示例详情和404页');
const expected = [
  '', 'blog', 'projects', 'blog/human-words', 'blog/small-ai-app', 'blog/travel-with-space',
  'projects/one-page-ideas', 'projects/digital-garden', 'projects/travel-notes',
];
for (const route of expected) assert.ok(existsSync(join(dist, route, 'index.html')), `缺少路由 ${route}`);
assert.ok(!existsSync(join(dist, 'blog/writing-next')), '文章草稿不应生成详情页');
assert.ok(!existsSync(join(dist, 'projects/next-tool')), '项目草稿不应生成详情页');
let checkedLinks = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  assert.ok(!html.includes('下一篇写作计划') && !html.includes('下一个小工具'), `草稿泄漏到 ${page}`);
  assert.match(html, /<title>[^<]+<\/title>/, `页面缺少标题 ${page}`);
  assert.match(html, /name="description"/, `页面缺少描述 ${page}`);
  assert.match(html, /data-icon="lucide:/, `Lucide 图标未渲染 ${page}`);
  for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(?:https?:|data:|mailto:)/.test(href)) continue;
    const pathname = decodeURIComponent(href.split(/[?#]/)[0]);
    if (!pathname) continue;
    let target = pathname.startsWith('/') ? resolve(dist, `.${pathname}`) : resolve(page, '..', pathname);
    assert.ok(existsSync(target), `${page} 中的 ${href} 无目标`);
    if (statSync(target).isDirectory()) {
      target = join(target, 'index.html');
      assert.ok(existsSync(target), `${href} 缺少 index.html`);
    }
    checkedLinks++;
  }
}
const list = readFileSync(join(dist, 'blog/index.html'), 'utf8');
assert.ok(list.indexOf('/blog/human-words/') < list.indexOf('/blog/small-ai-app/'));
assert.ok(list.indexOf('/blog/small-ai-app/') < list.indexOf('/blog/travel-with-space/'));
assert.match(readFileSync(join(dist, 'blog/human-words/index.html'), 'utf8'), /<pre[^>]*><code/);
console.log(`通过：${pages.length}个页面、${checkedLinks}个内部链接/资源、日期倒序、Markdown代码块与草稿隔离。`);
