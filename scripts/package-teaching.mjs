import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'preview', `teaching-${Date.now()}`);
mkdirSync(output, { recursive: true });
const entries = ['src', 'public', 'scripts', 'tests', 'docs', 'teaching', '.agents', 'package.json', 'package-lock.json', 'astro.config.mjs', 'tsconfig.json', '.node-version', '.gitignore', '.gitattributes', '头像.png', 'README.md', 'spec.md', 'tasks.md'];
const packages = [['03-complete', 3, false], ['04-starter', 4, true], ['04-complete', 4, false], ['05-starter', 5, true], ['05-complete', 5, false], ['06-starter', 5, false], ['06-complete', 6, false]];
const manifest = [];
for (const [name, stage, starter] of packages) {
  const destination = join(output, name); mkdirSync(destination);
  for (const entry of entries) {
    const source = join(root, entry);
    if (!existsSync(source)) continue;
    cpSync(source, join(destination, entry), { recursive: true, filter(path) {
      const rel = relative(root, path).replaceAll('\\', '/');
      if (stage === 3 && (rel === 'src/pages/learn.astro' || rel === 'src/scripts/resources.js' || rel === 'src/styles/learn.css' || rel === 'src/lib/resources' || rel.startsWith('tests/resources'))) return false;
      return true;
    } });
  }
  const edit = (path, transform) => { const target = join(destination, path); writeFileSync(target, transform(readFileSync(target, 'utf8'))); };
  edit('tasks.md', source => {
    let chapter = 3;
    return source.split('\n').map(line => {
      const match = line.match(/^## 第(\d)章/); if (match) chapter = Number(match[1]);
      return chapter > stage || (starter && chapter === stage) ? line.replace('- [x]', '- [ ]') : line;
    }).join('\n');
  });
  if (stage === 3) {
    edit('src/layouts/BaseLayout.astro', source => source.replace(" | 'learn'", '').replace(/.*key: 'learn'.*\r?\n/, '').replace(/.*class="footer-tool".*\r?\n/, ''));
    edit('scripts/verify-build.mjs', source => source.replace("'projects', 'learn',", "'projects',"));
    edit('package.json', source => { const data = JSON.parse(source); delete data.scripts['check:resources']; return JSON.stringify(data, null, 2) + '\n'; });
  } else edit('src/pages/learn.astro', source => source.replace('const stage = 6;', `const stage = ${stage};`));
  if (starter && stage === 4) {
    edit('src/lib/resources/rules.js', source => source
      .replace(/export function upsert\([\s\S]*?(?=export function filterResources)/, 'export function upsert(resources, input, version = VERSION) {\n  throw new Error("练习4.1：按 spec 实现 upsert，保留 id 与顺序");\n}\n')
      .replace(/export function filterResources\([\s\S]*?(?=export function migrate)/, 'export function filterResources(resources, filters = {}) {\n  // 练习4.2：替换为条件交集；空页面仍可运行。\n  return resources;\n}\n'));
  }
  if (starter && stage === 5) {
    edit('src/lib/resources/storage.js', source => source.replace('getAdapter().setItem(STORAGE_KEY, JSON.stringify(candidate));', 'throw new Error("练习5.1：用适配器保存校验后的候选集合");'));
    edit('src/lib/resources/csv.js', source => source.replace('const seen = new Set(resources.map(item => item.url));', 'throw new Error("练习5.2：完成逐行校验、重复识别和预览");\n  const seen = new Set(resources.map(item => item.url));'));
  }
  const info = { name, stage, starter, storage: stage < 5 ? 'memory' : `v${stage >= 6 ? 2 : 1}`, generatedFrom: '当前工作区源码；不是历史提交或已试教记录' };
  writeFileSync(join(destination, 'STAGE.json'), JSON.stringify(info, null, 2) + '\n');
  writeFileSync(join(destination, '开始本章.md'), `# ${name}\n\n${stage === 3 ? '本章只交付规格与调查，尚无 /learn。' : `当前页面阶段 ${stage}。${starter ? '这是可启动的练习骨架，TODO 功能与相关检查预期失败。' : '这是本章完成版。'}`}\n\n先 npm ci，再 npm run dev。阅读 teaching/README.md 的对应章节。完整规则模块和部分教师适配器会预先提供，阶段文件通过 page stage 控制课堂能力；不是人为制作的 Git 历史。\n\n06-starter 延续第5章 v1；先修改规格，再将 learn.astro 的 stage 改为6并实现 CR-01。教师完成版保留可复用的兼容实现。\n`);
  manifest.push(info);
}
writeFileSync(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`教学包已生成：${output}\n共 ${manifest.length} 个独立工程目录；含阶段能力版本和练习骨架，不含 node_modules、.git 或浏览器收藏。`);
