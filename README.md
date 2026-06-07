# 1st Timeline

> A simple, elegant, Chinese-friendly timeline rendering plugin for Obsidian.
> **Current version**: 1.4.4

---

## Description

1st Timeline is an Obsidian plugin that renders beautiful timeline views from simple text code blocks. It supports multiple date formats with first-class Chinese date format support, intelligent date parsing, and elegant visual presentation — helping you create timelines, project progress views, or historical event records effortlessly.

## Installation

### From Obsidian Community Plugin Marketplace (Recommended)

1. Open Obsidian **Settings → Community plugins**
2. Disable **Safe mode**
3. Click **Browse**, search for **"1st Timeline"**
4. Install and enable

### From GitHub Releases

1. Go to the [Releases page](https://github.com/lnabc03/1st-Timeline/releases)
2. Download the latest `main.js`, `manifest.json`, and `styles.css`
3. Create the directory `.obsidian/plugins/first-timeline/` in your vault
4. Copy the three files into that directory
5. Restart Obsidian and enable the plugin in **Settings → Community plugins**

### From Source

```bash
git clone https://github.com/lnabc03/1st-Timeline.git
cd 1st-Timeline
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` to `.obsidian/plugins/first-timeline/`, restart Obsidian, and enable the plugin.

> **Note**: The target directory name must match the `id` field in `manifest.json` (`first-timeline`).

---

## Features

- **Simple syntax**: Separate dates and event content with colons (`:` / `：`) or two spaces
- **Multiple date formats**:
  - `YYYY-MM-DD` (ISO standard)
  - `YYYY-MM-DD_HH:MM` (with precise time)
  - `YYYY年MM月DD日` (Chinese date format)
  - `YYYY年MM月DD日[time word]` (Chinese date with time-of-day: 早上/上午/中午/下午/晚上)
- **Multi-line events**: Add multi-line content to a single event with full Obsidian Markdown support
- **Notes summary**: Generate a timeline of notes based on a configurable frontmatter date property
- **Auto collapse**: When the event count exceeds a threshold, only show events closest to today
- **Smart interactions**:
  - Hover tooltip showing days until or since an event (configurable delay)
  - Automatic highlighting of today's events
  - Card lift animation on hover
- **Rich customization**:
  - Multiple color presets (Blue / Green / Purple / Red / Orange) or custom colors
  - Adjustable dot size, line width, and event spacing
  - Toggle hover tooltips and set delay time
  - Ascending / descending sort order
- **Full Markdown support**: Event content supports wikilinks, external links, tables, callouts, blockquotes, and all Obsidian Markdown syntax
- **Responsive design**: Adapts to desktop and mobile screen sizes
- **Dark theme support**: Automatically adapts to light and dark themes

---

## Usage

### Basic Timeline

Insert a `timeline` code block in any Obsidian note:

````markdown
```timeline
2024-01-01  New Year's Day (two spaces)
2024-03-08: International Women's Day (colon)
2024年5月1日：Labor Day (Chinese date + colon)
2025-01-28_12:04  Precise time format
2025年1月29日早上  Chinese date with time-of-day word
2026-01-01
A new year begins! (multi-line text)
- Full Markdown syntax supported
# Headings
> Blockquotes
> [!NOTE] Callouts
| A | B |
|---|---|
| C | D |
```
````

### Syntax Rules

| Format | Separator | Example |
|--------|-----------|---------|
| Two spaces | `␣␣` | `2024-01-01  Event content` |
| Chinese colon | `：` | `2024年3月8日：Event content` |
| English colon | `:` | `2024-05-01: Event content` |
| Date only (multi-line) | Newline | Date on one line, content on following lines |

### Notes Summary

Use the command palette (`Ctrl+P`) and run the **"Notes summary"** command:

1. Enter a date range (format: `YYYY-MM-DD,YYYY-MM-DD`)
2. The current month is pre-filled by default
3. Confirm to insert a timeline of notes based on the configured frontmatter date field

---

## Settings

| Setting | Description | Default | Range |
|---------|-------------|---------|-------|
| Sort direction | Event sort order | Ascending | Ascending / Descending |
| Date property for notes summary | Frontmatter field name | `created` | Any field name |
| Timeline color | Color of timeline line and dots | `#5588cc` | CSS color value |
| Color presets | One-click theme switching | — | Blue / Green / Purple / Red / Orange |
| Dot size | Size of timeline dots | 12px | 6–20px |
| Line width | Width of the timeline line | 2px | 1–5px |
| Event spacing | Spacing between event cards | 20px | 10–40px |
| Hover tooltip | Show days-until/since tooltip | On | Toggle |
| Hover delay | Delay before tooltip appears | 500ms | 0–1000ms |
| Highlight today | Special highlight for today's events | On | Toggle |
| Auto collapse | Auto-collapse when above threshold | On | Toggle |
| Collapse threshold | Events needed to trigger collapse | 10 | 5–50 |
| Show when collapsed | Events shown when collapsed | 5 | 1–15 |

---

## Tips

- **Hover interaction**: Hover over event cards to see how many days until or since that event
- **Today marker**: Today's events are automatically highlighted with a special left border
- **Date display**: Chinese dates are auto-formatted to `YYYY-MM-DD` in the display while preserving time descriptions
- **Layout**: Dates and times are displayed on separate lines for a clean card layout
- **Theme switching**: Use the color presets to quickly change the timeline color theme
- **Notes summary**: Defaults to the current month; pair with `created` or any custom frontmatter field

---

## Development

This plugin follows [Obsidian's official sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin) best practices:

```bash
npm install          # Install dependencies
npm run dev          # Development mode (watch)
npm run build        # Production build (tsc + esbuild)
npm run lint         # ESLint check
```

- **Language**: TypeScript (strict mode)
- **Build**: esbuild (CJS output, ES2021 target)
- **Linting**: ESLint 9 + typescript-eslint + eslint-plugin-obsidianmd
- **CI/CD**: GitHub Actions (lint + release)

---

## Compatibility

- Minimum Obsidian version: **1.8.7**
- Supports desktop and mobile devices
- Light and dark theme compatible

---

## Changelog

### 1.4.4

- Added bilingual Chinese/English support — auto-detects Obsidian language setting via `getLanguage()`
- All UI text now adapts: settings labels, command names, tooltips, error messages, modal dialogs
- New `src/i18n.ts` locale module with EN and ZH translations
- Bumped `minAppVersion` to 1.8.7 (required by `getLanguage()`)

### 1.4.3

- Fixed deprecated `display()` calls in settings — replaced with direct component updates
- Fixed deprecated `MarkdownRenderer.renderMarkdown` — switched to `MarkdownRenderer.render` with a child `Component` for proper lifecycle management
- Fixed `obsidianmd/no-plugin-as-component` by using `plugin.addChild(new Component())` instead of passing `plugin` directly
- Fixed README title to match manifest.json plugin name
- Added bilingual English/Chinese README

### 1.4.2

- Fixed community plugin review warnings (same as 1.4.3, initial fix rejected due to `eslint-disable` on `no-plugin-as-component`)

### 1.4.1

- Fixed community plugin review issues (eslint-disable descriptions, sentence-case UI, CSS specificity, README English)

### 1.4.0

- **Refactor**: Fully aligned with Obsidian official sample plugin best practices
  - JavaScript → TypeScript (strict mode)
  - Single file → multi-module architecture (constants / date-parser / settings / timeline-processor / notes-summary)
  - Added esbuild build system
  - Added ESLint + eslint-plugin-obsidianmd
  - Added GitHub Actions CI/CD (lint + release)
- **Security**: All DOM events now use `registerDomEvent()` for automatic cleanup on plugin unload
- **Fix**: Dynamic CSS injection → static stylesheet
- **Fix**: `tooltipDelay` default value inconsistency (unified to 500ms)
- **Optimization**: Removed redundant runtime settings guards (guaranteed by `Object.assign`)
- **Optimization**: `activeLeaf` → `getActiveViewOfType` (eliminates deprecated API warning)

### 1.3.3

- Added auto-collapse: timeline collapses when events exceed threshold, showing only events closest to today
- Added collapse settings: auto-collapse toggle, threshold, show count
- Improved timeline visual design: modern card shadows, smooth transitions, refined hover effects

### 1.3.2

- Fixed precise time parsing issues

### 1.3.1

- Fixed date parsing issues

### 1.3.0

- Added multi-line event content support
- Added notes summary feature — generate a timeline from note creation dates
- Added date property setting for custom frontmatter fields

### 1.2.0

- Added hover tooltip showing days until/since events
- Added today-highlight feature
- Improved timeline visual styling

### 1.1.0

- Added Chinese date format support
- Added multiple color preset themes
- Improved responsive design

### 1.0.0

- Initial release

---

## Contributing

Issue reports and feature suggestions are welcome!

---

## License

**MIT License**

---

## Author

[lnabc03](https://github.com/lnabc03) | 弋鹓

---

---

# 第一时间轴 (1st Timeline)

> 一个简单、优雅、中文友好的 Obsidian 时间轴渲染插件。
> **当前版本**: 1.4.4

## 简介

1st Timeline 是一个 Obsidian 插件，可以将简单的文本代码块渲染为精美的时间轴视图。支持多种日期格式（含中文日期优先支持），智能日期解析，优雅的视觉呈现——帮助您轻松创建时间线、项目进度视图或历史事件记录。

## 安装

### 从 Obsidian 社区插件市场安装（推荐）

1. 打开 Obsidian **设置 → 社区插件**
2. 关闭"安全模式"
3. 点击"浏览"，搜索 **"1st Timeline"**
4. 安装并启用

### 从 GitHub Releases 安装

1. 前往 [Releases 页面](https://github.com/lnabc03/1st-Timeline/releases)
2. 下载最新版本的 `main.js`、`manifest.json`、`styles.css`
3. 在 vault 中创建目录 `.obsidian/plugins/first-timeline/`
4. 将三个文件放入该目录
5. 重启 Obsidian，在 **设置 → 社区插件** 中启用

### 从源码构建

```bash
git clone https://github.com/lnabc03/1st-Timeline.git
cd 1st-Timeline
npm install
npm run build
```

然后将 `main.js`、`manifest.json`、`styles.css` 复制到 `.obsidian/plugins/first-timeline/` 目录，重启 Obsidian 并启用插件。

> **注意**: 目标目录名必须与 `manifest.json` 中的 `id` 字段一致（`first-timeline`）。

---

## 功能特点

- **简洁的语法**: 使用中英文冒号或两个空格分隔日期和事件内容
- **多种日期格式支持**:
  - `YYYY-MM-DD`（ISO 标准格式）
  - `YYYY-MM-DD_HH:MM`（精确到分钟）
  - `YYYY年MM月DD日`（中文日期格式）
  - `YYYY年MM月DD日[时间词]`（支持"早上"、"上午"、"中午"、"下午"、"晚上"）
- **多行事件内容**: 支持为单个事件添加多行内容，完整支持 Obsidian Markdown 语法
- **笔记汇总功能**: 一键生成基于指定 frontmatter 日期属性的笔记时间轴
- **自动折叠**: 事件数量超过阈值时自动折叠，仅显示距今天最近的关键事件
- **智能交互体验**:
  - 悬停提示显示事件距今天数（可配置延迟）
  - 当天事件自动高亮显示
  - 鼠标悬停卡片浮起动画
- **丰富的自定义选项**:
  - 多种预设颜色主题（蓝/绿/紫/红/橙）或自定义任意颜色
  - 时间点大小、线宽和事件间距可调
  - 悬停提示开关及延迟时间
  - 升序/降序排列
- **完整 Markdown 支持**: 事件内容支持双链、外链、表格、Callout、引用块等所有 Obsidian Markdown 语法
- **响应式设计**: 自适应桌面和移动端不同屏幕尺寸
- **暗色主题适配**: 自动适配明亮和暗黑主题

---

## 使用方法

### 基本时间轴

在 Obsidian 笔记中插入 `timeline` 代码块：

````markdown
```timeline
2024-01-01  新年第一天（双空格分隔）
2024年3月8日：妇女节（中文冒号分隔）
2024-05-01: 劳动节（英文冒号分隔）
2025-01-28_12:04  精确时间格式
2025年1月29日早上  中文日期+时间词
2026-01-01
新的一年开始了！（多行文本）
- 支持完整的 Markdown 语法
# 标题
> 引用块
> [!NOTE] Callout
| A | B |
|---|---|
| C | D |
```
````

### 语法规则

| 格式 | 分隔符 | 示例 |
|------|--------|------|
| 双空格 | `␣␣` | `2024-01-01  事件内容` |
| 中文冒号 | `：` | `2024年3月8日：事件内容` |
| 英文冒号 | `:` | `2024-05-01:事件内容` |
| 仅日期（多行） | 换行 | 日期独占一行，后续行为事件内容 |

### 笔记汇总

使用命令面板（`Ctrl+P`）执行 **"Notes summary"** 命令：

1. 输入日期范围（格式：`YYYY-MM-DD,YYYY-MM-DD`）
2. 默认填充当前月份
3. 确认后自动生成基于指定 frontmatter 属性的笔记时间轴

---

## 设置选项

| 设置项 | 说明 | 默认值 | 范围 |
|--------|------|--------|------|
| 排序方向 | 事件排列顺序 | 升序 | 升序 / 降序 |
| 笔记创建日期属性 | frontmatter 字段名 | `created` | 任意字段名 |
| 时间轴颜色 | 时间轴线条和点的颜色 | `#5588cc` | CSS 颜色值 |
| 颜色预设 | 一键切换主题色 | — | 蓝/绿/紫/红/橙 |
| 时间点大小 | 时间轴上点的大小 | 12px | 6–20px |
| 线条宽度 | 时间轴竖线宽度 | 2px | 1–5px |
| 事件间距 | 事件卡片之间的间距 | 20px | 10–40px |
| 悬停提示框 | 是否显示距今天数提示 | 开启 | 开关 |
| 悬停延迟 | 提示框出现前的等待时间 | 500ms | 0–1000ms |
| 当天事件高亮 | 当天事件特殊标记 | 开启 | 开关 |
| 自动折叠 | 事件过多时自动折叠 | 开启 | 开关 |
| 折叠阈值 | 触发折叠的事件数量 | 10 | 5–50 |
| 折叠时显示数量 | 折叠后显示的事件数 | 5 | 1–15 |

---

## 小贴士

- **互动体验**: 将鼠标悬停在事件卡片上，会显示该事件距离今天的天数
- **当天标记**: 当天的事件会自动高亮显示，左侧有特殊边框
- **日期显示**: 中文日期格式会在显示时自动转换为 `YYYY-MM-DD` 标准格式，同时保留时间描述
- **布局优化**: 日期和时间会自动分行显示，保持卡片整洁
- **主题切换**: 可以通过设置中的预设颜色快速切换时间轴主题
- **笔记汇总**: 默认使用当前月份作为日期范围，可配合 `created` 等 frontmatter 字段使用

---

## 开发

本插件已对齐 [Obsidian 官方示例插件](https://github.com/obsidianmd/obsidian-sample-plugin) 的最佳实践：

```bash
npm install          # 安装依赖
npm run dev          # 开发模式（watch）
npm run build        # 生产构建（tsc + esbuild）
npm run lint         # ESLint 代码检查
```

- **语言**: TypeScript（strict 模式）
- **构建**: esbuild（CJS 输出，ES2021 target）
- **代码检查**: ESLint 9 + typescript-eslint + eslint-plugin-obsidianmd
- **CI/CD**: GitHub Actions（lint + release）

---

## 兼容性

- 最低 Obsidian 版本: **1.8.7**
- 支持桌面和移动设备
- 适配明亮和暗黑主题

---

## 更新日志

### 1.4.4

- 新增中英文双语支持 — 通过 `getLanguage()` 自动检测 Obsidian 语言设置
- 所有界面文字均适配语言：设置标签、命令名称、提示框、错误消息、模态对话框
- 新增 `src/i18n.ts` 语言模块，包含完整中英文翻译
- `minAppVersion` 提升至 1.8.7（`getLanguage()` 所需最低版本）

### 1.4.3

- 修复弃用的 `display()` 调用 — 改为直接更新组件
- 修复弃用的 `MarkdownRenderer.renderMarkdown` — 切换为 `MarkdownRenderer.render`，使用子 `Component` 进行生命周期管理
- 修复 `obsidianmd/no-plugin-as-component` — 使用 `plugin.addChild(new Component())` 而非直接传入 `plugin`
- 修复 README 标题与 manifest.json 插件名称不一致的问题
- 新增中英双语 README

### 1.4.2

- 修复社区插件审核警告（与 1.4.3 内容相同，初次修复因对 `no-plugin-as-component` 使用 `eslint-disable` 被拒绝）

### 1.4.1

- 修复社区插件审核问题（eslint-disable 描述、sentence-case UI、CSS 优先级、README 英文内容）

### 1.4.0

- **重构**: 完全对齐 Obsidian 官方示例插件最佳实践
  - JavaScript → TypeScript（strict 模式）
  - 单文件 → 多模块架构（constants / date-parser / settings / timeline-processor / notes-summary）
  - 新增 esbuild 构建系统
  - 新增 ESLint + eslint-plugin-obsidianmd 代码检查
  - 新增 GitHub Actions CI/CD（lint + release）
- **安全**: 所有 DOM 事件改用 `registerDomEvent()`，插件卸载时自动清理
- **修复**: 动态注入 CSS → 静态样式文件
- **修复**: `tooltipDelay` 默认值不一致（统一为 500ms）
- **优化**: 移除冗余的运行时设置守卫（由 `Object.assign` 保证默认值）
- **优化**: `activeLeaf` → `getActiveViewOfType`（消除废弃 API 警告）

### 1.3.3

- 新增自动折叠功能：事件数量超过阈值时自动折叠，仅显示距今天最近的事件
- 新增折叠相关设置项：自动折叠开关、折叠阈值、折叠显示数量
- 优化时间轴视觉设计：更现代的卡片阴影、流畅的过渡动画、改进的悬停效果

### 1.3.2

- 修复了精确时间解析的相关问题

### 1.3.1

- 修复了日期解析相关的已知问题

### 1.3.0

- 新增多行事件内容支持，提供更灵活的排版
- 新增笔记汇总功能，一键生成基于创建日期的笔记时间轴
- 新增笔记创建日期属性设置，支持自定义 frontmatter 字段

### 1.2.0

- 添加悬停提示功能，显示事件距今天数
- 添加当天事件高亮功能
- 优化时间轴视觉效果

### 1.1.0

- 增加中文日期格式支持
- 添加多种颜色预设主题
- 改进响应式设计

### 1.0.0

- 初始版本发布

---

## 贡献

欢迎提交问题报告和功能建议！

---

## 许可证

**MIT License**

---

## 作者

[lnabc03](https://github.com/lnabc03) | 弋鹓
