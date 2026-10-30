# 林安的个人网站

沿用 `原型/` 中已确认的暖米白、陶土橙、卡片底色、加粗标题和固定导航，使用 Astro 7 静态生成、Tailwind CSS v4（CSS-first）、astro-icon 与 Lucide 图标集实现。

## 本地运行

在包含本文件与 package.json 的 `my-site/` 目录中执行，统一使用 Node.js `24.15.0` 与 npm `11.17.0`。`.node-version`、`engines.node` 与 `packageManager` 记录对应版本；`@types/node` 使用 24 系列。

```sh
npm ci
npm run dev
```

浏览器打开终端实际输出的地址，默认 http://localhost:4321。不要双击 `.astro` 文件。`原型/index.html` 仍可独立浏览，但正式网站以 Astro 开发/生产预览结果为准。

```sh
npm run check
npm run build
npm run verify
npm run preview
```

`check` 检查类型与 Astro 组件；`build` 输出静态文件至 `dist/`；`verify` 检查构建结果的内部链接、资源、日期排序与草稿隔离；`preview` 预览生产构建。新增内容会自动纳入链接检查；移除或重命名示例文件时，需要同步更新验证脚本中对应的预期路由。

## 页面与源码

- `/`：个人介绍、兴趣、联系方式图标、最近作品和文章。
- `/projects/`、`/projects/[id]/`：作品列表与 Markdown 项目说明。
- `/blog/`、`/blog/[id]/`：日期倒序的文章列表及正文详情。
- `src/layouts/BaseLayout.astro`：公共页面、固定导航、主题初始化和页脚。
- `src/components/`：项目卡片、文章列表项、区块标题及 `AutumnWindow.astro` 头像窗景。
- `src/styles/global.css`：Tailwind 入口、CSS-first 主题变量和响应式排版。
- `src/scripts/site.ts`：主题切换与偏好保存、跟随系统主题、滚动淡入。
- `src/content.config.ts`：内容字段校验和 glob loader。
- `src/content/blog/`、`src/content/projects/`：可直接编辑的 Markdown 内容。

标题使用系统衬线字体，正文使用系统无衬线字体，没有外部字体请求。亮色主色为 `#B85C38`，暗色通过 CSS 变量切换。正文内容区域最大约680px，行高1.7；代码块有区块底色。系统启用减少动态效果时关闭非必要动画。

## 更新内容

文章示例：

```yaml
---
title: "我的新文章"
description: "文章的一句话摘要"
pubDate: "2026-10-29"
tags: ["AI 应用", "写作"]
author: "林安"
draft: true
isExample: false
---
```

将上述 frontmatter 与 Markdown 正文一起保存到 `src/content/blog/my-new-post.md`。文件名决定稳定地址 `/blog/my-new-post/`；修改标题不会改变地址，修改文件名会改变地址。准备好公开时改为 `draft: false`，重新构建。

项目字段参考 `src/content/projects/digital-garden.md`：`order` 控制排序，`cover` 选择已约定的 Lucide 图标，`tags` 表示技术栈或分类，`role` 表示角色；可选 `link` 仅接受 HTTP(S) 地址，未配置时不显示外链。Markdown 内容可自由扩展项目说明。文章和项目的草稿在列表与详情路由中均过滤。

文章图片统一放在 `public/images/blog/<文章文件名>/`，与 Markdown 一起纳入 Git。当前旅行文章的图片为 `public/images/blog/travel-with-space/autumn-forest.jpg`，正文引用：

```md
![秋天的森林](/images/blog/travel-with-space/autumn-forest.jpg)
```

`public/` 中的文件构建时原样复制至 `dist/`；发布网站时图片随静态产物一起上传至 Cloudflare，不需要独立图床、R2 或上传密钥。以后新增图片建议使用小写英文文件名，并在上传前压缩；当前保留原图。只在本地保存而未提交的图片不会出现在 Git 自动部署中。

当前展示的3篇文章、3个项目均保留示例标记，不代表已发布的真实成果。两个 `draft: true` 的文件用于演示未发布状态。邮箱和 GitHub 只显示图标，无链接。首页头像直接引用根目录 `头像.png`，构建时自动生成资源地址。拱形窗框和窗台采用深砖红色，CSS与SVG绘制错缝砖纹，中央不设十字窗格，鼠标移入、点击或键盘激活时播放一次约2.7秒的风线与四片SVG落叶，播放期间不重复叠加。手机点击也可触发；系统开启减少动态效果时不播放，保留静态窗景。无需额外图片或动画依赖。

## 交付与发布

源码仓库：[kk-carp/my-site](https://github.com/kk-carp/my-site)，主分支为 `main`。仓库根目录就是网站工程目录，不包含上层课程文档。`原型/`、源码、头像和依赖锁文件纳入版本管理；`node_modules/`、`dist/`、`.astro/`、临时截图及环境变量文件不提交。

后续修改时先验证，再检查并提交差异：

```sh
git status
git diff
npm run check
npm run build
npm run verify
git add <本轮修改的文件>
git diff --cached
git commit -m "说明本次修改"
git push
```

首次克隆后运行 `npm ci` 安装锁文件对应的依赖，再运行 `npm run dev`。Astro 精确固定为 `7.4.4`，`package.json` 与 `package-lock.json` 应保持一致；不使用 `npm update` 或 `npm audit fix --force` 替代安装。当前采用静态输出，不安装 SSR 适配器。

当前尚未部署网站，GitHub源码仓库地址不等于可访问的网站地址。未来可将 `dist/` 部署至静态托管平台；构建命令 `npm run build`，输出目录 `dist`。直接导入此仓库时，项目根目录选择仓库根目录；放入其他仓库的子目录时再按实际路径设置。不需要 SSR 适配器、数据库或账号系统。

Cloudflare Pages 构建使用 `NODE_VERSION=24.15.0`（仓库也提供 `.node-version`）。如需确保安装使用指定 npm 版本且严格遵循锁文件，可设置 `SKIP_DEPENDENCY_INSTALL=true`，构建命令填写 `npx --yes npm@11.17.0 ci && npm run check && npm run build && npm run verify`，输出目录仍为 `dist`。检查与构建顺序执行，避免同时写入 Astro/Vite 缓存。

## 依赖安全维护

2026-10-30 将 Astro 从 `5.18.2` 升级至 `7.4.4`，更新锁文件，修复此前 Astro、esbuild、sharp、zod 与 zod-to-ts 的 5 项依赖告警。内容 schema 改用 `astro/zod`，继续使用本地 Markdown、静态路由和原有页面。依赖审计结果以当次 `npm audit` 为准，更新依赖后顺序执行 `npm run check`、`npm run build`、`npm run verify`，再复核 `npm audit`。

技术接入依据：[Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)、[Astro 7 升级指南](https://docs.astro.build/en/guides/upgrade-to/v7/)、[Tailwind 与 Astro](https://tailwindcss.com/docs/installation/framework-guides/astro)、[Astro Icon](https://www.astroicon.dev/getting-started/)。
