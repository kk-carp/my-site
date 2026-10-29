# 林安的个人网站

沿用 `原型/` 中已确认的暖米白、陶土橙、卡片底色、加粗标题和固定导航，使用 Astro 5 静态生成、Tailwind CSS v4（CSS-first）、astro-icon 与 Lucide 图标集实现。

## 本地运行

在包含本文件与 package.json 的 `my-site/` 目录中执行，使用 Node.js 22.12+（本次验证环境为 Node.js 24.15）：

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

首次克隆后运行 `npm ci` 安装锁文件对应的依赖，再运行 `npm run dev`。

当前尚未部署网站，GitHub源码仓库地址不等于可访问的网站地址。未来可将 `dist/` 部署至静态托管平台；构建命令 `npm run build`，输出目录 `dist`。直接导入此仓库时，项目根目录选择仓库根目录；放入其他仓库的子目录时再按实际路径设置。不需要 SSR 适配器、数据库或账号系统。

## 已知依赖限制

按课程要求锁定 Astro 5（实际解析版本及全部依赖见 package-lock.json）。本次 `npm audit` 报告5项依赖告警（1低、3高、1严重），其中包含 Astro 5 及其依赖；审计建议的整体修复涉及升级 Astro 主版本，因此没有执行 `npm audit fix --force`。网站采用纯静态输出，没有 SSR、Server Islands、用户上传图片或动态执行外部输入；这些范围限制不表示依赖漏洞已修复。公开部署前需重新评估并处理版本约束。复核命令：`npm audit`。

技术接入依据：[Astro 5 Content Collections](https://v5.docs.astro.build/en/guides/content-collections/)、[Tailwind 与 Astro](https://tailwindcss.com/docs/installation/framework-guides/astro)、[Astro Icon](https://www.astroicon.dev/getting-started/)。
