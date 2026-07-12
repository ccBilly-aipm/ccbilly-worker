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

## S1-2 · 路径穿越与符号链接逃逸（Skill 管理写真实 `~/.claude/skills/`）

### 攻击面分析

**入口**：Skill 管理 API（编辑保存 `saveSkill`、编辑前备份到 `.trash/`、读取附件 `readSkillFile`）接收 `name` / `relPath` 参数，拼进白名单 root 后做文件系统读写——**写的是 B哥 真实的 `~/.claude/skills/`**。

**信任边界**：HTTP 请求参数（不可信）→ 真实文件系统路径（高权限）。跨越此边界的唯一守卫是 `resolveWithinRoot()` [src/lib/skills/paths.ts]。

**可达性**：任一 mutation API 可达（S1-4 前无鉴权，本机/暴露场景均可调用）；`relPath` 由前端文件树点选，但 API 层不可信输入必须自证。

**影响**：若守卫可被绕过 → 在白名单外任意位置读/写文件（覆盖 `~/.ssh/authorized_keys`、写 `~/.zshrc`、读任意密钥）。**严重度：High（写真实高权限目录）。**

**审计者视角发现的真实缺口（README 声称"白名单防穿越"，实测有洞）**：
`resolveWithinRoot` 做两层检查——① 词法层 `path.relative(base, candidate)` 拒 `../`/绝对路径；② 符号链接层 `fs.realpathSync(candidate)` 校验真实路径仍在白名单内。**但 ② 只在 `fs.existsSync(candidate)` 为真时执行**。
- 写操作（`saveSkill`、`.trash` 备份 `mkdirSync`）会创建**尚不存在**的路径。
- 攻击：在 root 内放一个软链 `evil → /home/victim`（Claude Code 官方允许 skill 条目本身是软链），请求写 `evil/SKILL.md`。`candidate = root/evil/SKILL.md` 不存在 → **跳过 realpath 检查** → 词法层认为它在 root 下 → **放行** → `atomicWriteFile` 经软链写到 `/home/victim/SKILL.md`。**逃逸成功。**
- 词法检查基于**请求字符串**而非 `realpath` 解析后的真实路径，正是提示词点名的错误做法。

### 对抗性测试（先红）

`tests/unit/skill-path-traversal.test.ts`，对 `resolveWithinRoot` + `saveSkill` + 备份链路施加全套向量：
`../` 相对穿越、`%2e%2e%2f` URL 编码、绝对路径注入、Windows 反斜杠 `..\`、空字节/特殊字符文件名、**软链目标存在时读取**（旧用例已覆盖）、**软链父目录 + 写不存在文件**（新洞，先红）、`.trash` 备份走软链逃逸。

### 修复（转绿）

见 ADR-014：改为**基于最近存在祖先的 realpath 校验**——不再依赖 `existsSync(candidate)`。对 candidate 逐级向上找到最近的已存在祖先，对其做 `fs.realpathSync`，再拼接剩余不存在的尾段，断言最终真实路径仍落在白名单 root 的 realpath 内。这样即便尾段不存在，任何中间软链都会在祖先 realpath 步骤被解析并暴露，无法逃逸。

_状态：见修复状态表。_

---

## 修复状态表

| 面 | 攻击面分析 | 对抗测试 | 修复 | 状态 |
|---|---|---|---|---|
| S1-1 XSS/Markdown | ✅ | ✅ 17 用例（10 攻击 + 7 回归） | ✅ rehype-sanitize 管线（ADR-013） | ✅ 完成 |
| S1-2 路径穿越/符号链接 | ✅（发现写不存在路径经软链父目录逃逸的真实洞） | ✅ 8 用例（相对/绝对/反斜杠/NUL/软链读/**软链父写**/saveSkill/.trash 逃逸） | ✅ 最近存在祖先 realpath 校验 + NUL 拒绝（ADR-014） | ✅ 完成 |
