# ccBilly 工作台 · 安全审计记录（Security Audit）

> 本文件是本轮 S1 安全加固的**审计留痕**。每一个攻击面先写「攻击面分析」（入口 / 信任边界 / 可达性 / 影响），再写「对抗性测试」（先证明漏洞存在，红），最后写「修复」（转绿）。
> 审计者视角高于开发者视角：不接受「应该没问题」式的自我豁免。
>
> 方法论：STRIDE 简化版 + 数据流信任边界分析。信任边界 = 「文件系统 / 网络输入」→「渲染或执行」之间的那道线。

---

## S1-1 · XSS / Markdown 渲染链

### 攻击面分析

**入口（source）**：
- `vault/knowledge/*.md` 笔记正文 → knowledge 详情页渲染为 HTML。
- 任何经 `[[双链]]` / frontmatter 字符串值间接进入渲染 HTML 的文本。

**渲染链（sink）**：
```
note.content (文件内容)
  → renderMarkdown()  [src/lib/markdown/render.ts]
    → 手写正则把 [[wiki]] 替换成 [alias](href)
    → marked.parse()  ← marked 15.0.12，默认 NOT 消毒
  → dangerouslySetInnerHTML  [src/app/knowledge/[slug]/page.tsx:37]
```

**信任边界**：`vault/` 文件是「数据」，不该被当作「可信 HTML/JS 代码」。但 marked 默认把 Markdown 里内联的原始 HTML 原样透传，`dangerouslySetInnerHTML` 又把它当 HTML 注入 DOM——信任边界被跨越。

**可达性**：
- 直接：用户在 knowledge 里放一篇含 payload 的笔记（本机单人时是自伤，风险低）。
- **真实威胁**：`vault/` 通过 Git 多设备同步、且项目开源后他人会 clone 陌生仓库的 vault、Obsidian 社区笔记互相拷贝、或未来内网多人共享 vault。**任何一篇来自他人的 .md 都可能带 payload**，打开即在 B哥 浏览器上下文执行。
- frontmatter 注入：schema 里 title/description 等字符串字段若被渲染进页面且未净化，是二级注入点。

**影响**：任意 JS 在应用同源上下文执行 → 可调用本应用全部**无鉴权的 mutation API**（写 skills 目录、触发 Git、导出数据）。即：一篇笔记的 XSS 可升级为对 `~/.claude/skills/` 的写入与代码执行。**严重度：High。**

**注入点清单（全仓检索结果）**：
| # | sink | 文件 | 状态 |
|---|---|---|---|
| 1 | `dangerouslySetInnerHTML` ← `renderMarkdown(note.content)` | `src/app/knowledge/[slug]/page.tsx:37` | ⛳ 唯一真实 HTML 注入点 |
| — | 任务正文 / 日报 / 周报 / skill 学习记录 | `<textarea>` 纯文本编辑，**不渲染 HTML** | ✅ 天然免疫 |
| — | `react-markdown` / `innerHTML` / `insertAdjacentHTML` | 全仓检索：**无** | ✅ |

结论：HTML 注入面收敛到**单一** `renderMarkdown` 函数——只要它的输出被净化，全站 XSS 面即封闭。

### 对抗性测试（先红）

`tests/unit/markdown-xss.test.ts`：对 `renderMarkdown` 输入以下 payload，断言输出**不含**可执行向量：
`<script>`、`<img src=x onerror>`、`<svg onload>`、`javascript:` 链接、`data:text/html` URI、`onclick` 等事件属性、`<iframe>`、`<object>/<embed>`、`<a href="vbscript:">`、以及**藏在 frontmatter 值里再渲染**的 payload。
回归：`[[双链]]`、代码块、表格、任务 checklist、普通链接（含 http/https/mailto/相对路径）正常渲染不被破坏。

### 修复（转绿）

见 ADR-013：`renderMarkdown` 从 `marked` 切换到 **unified/rehype 管线**
（`remark-parse → remark-gfm → remark-rehype(allowDangerousHtml:false) → rehype-sanitize(白名单) → rehype-stringify`）。
- 净化在 HAST（AST）层完成，白名单式：只放行安全标签/属性，`javascript:`/`data:`/`vbscript:` 协议被 rehype-sanitize 默认 schema 拒绝。
- `[[双链]]` 在进入管线前先转成标准 Markdown 链接，`href` 只允许内部路径/http(s)/mailto。
- 原始内联 HTML 因 `remark-rehype` 不透传 dangerous HTML 而被丢弃，无绕过路径。

**状态：✅ 已修复并转绿**（2026-07-12）。10 个 XSS 向量先全部打穿旧 `marked` 渲染器（证明漏洞存在），切换 rehype 管线后 10 个向量全部封堵、7 个合法内容回归全部保留（`tests/unit/markdown-xss.test.ts` 17/17 绿）。`marked` 依赖已从 package.json 移除。

---

## 修复状态表

| 面 | 攻击面分析 | 对抗测试 | 修复 | 状态 |
|---|---|---|---|---|
| S1-1 XSS/Markdown | ✅ | ✅ 17 用例（10 攻击 + 7 回归） | ✅ rehype-sanitize 管线（ADR-013） | ✅ 完成 |
