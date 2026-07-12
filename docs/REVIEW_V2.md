# V2.0 双角色版 · 上线前独立审核（Review）

> 以「外部 reviewer」视角对 V2 全量 diff（v1.1.0 → HEAD）做的一次上线前自审。默认怀疑、不橡皮图章。每项给结论 + 证据（测试名 / 命令）。
> 审核者：claude-main（切换到审查视角）· 日期：2026-07-12

**总评：可上线（Ship）。** 无 blocker；发现的 note 级问题已当场修复（死代码清理、helper 复用）。V1.1 全部安全对抗测试持续绿，未因 V2 变红。

---

## 1. 安全回归（重点：情报源出网面 / MCP 写入面 / widget 布局注入）

| 面 | 结论 | 证据 |
|---|---|---|
| **情报源出网面（新）** | ✅ 无绕过。所有 feed URL 在**添加**与**抓取**前都过 V1.1 的 `assertProxyableUrl`（SSRF 守卫）；内网/私网/云元数据（多 notation）一律拒绝，被拒源不落盘，`redirect:"manual"` + 2MB + 8s | `tests/unit/v2-feeds-ssrf.test.ts`（15 用例全绿）；ADR-024 |
| **MCP 写入面（新）** | ✅ 写工具受 `AUTH_MODE=passcode` 约束：无有效 `token` 拒绝、口令未设 fail-closed、读工具不受限。stdio 实机往返验证过 | `tests/unit/v2-mcp.test.ts`（10 用例，含鉴权矩阵）；docs/MCP.md |
| **新增 15 个 mutation API 是否漏鉴权** | ✅ 全部落在 `/api/*`，被 middleware 的 `isProtectedRequest`（POST/PATCH/DELETE）覆盖 → 暴露场景 fail-closed。无 bypass | middleware matcher `/api/:path*`；`tests/e2e/auth-exposure.spec.ts` |
| **widget 布局注入** | ✅ 布局写回经 `sanitize()`：未知 widget id 丢弃、宽度 clamp 到白名单、去重；恶意 payload 无法注入任意 widget 或撑破网格 | `tests/unit/v2-dashboard.test.ts`「sanitizes: drops unknown ids...」 |
| **inbox / decisions / feeds slug 穿越** | ✅ `removeCapture` / content slug 均 `path.basename` + 前缀校验防 `../` 穿越 | `tests/unit/v2-dashboard.test.ts`「removeCapture is traversal-safe」 |
| **依赖回归** | ✅ 新增 `@modelcontextprotocol/sdk` / `@dnd-kit/utilities` 后 `pnpm audit` 仍 **0 漏洞** | `pnpm audit` → No known vulnerabilities found |
| **V1.1 安全套件** | ✅ 91 个安全测试（XSS/路径穿越/SSRF/鉴权/feeds）持续全绿，未因 V2 变红 | 5 个安全测试文件全绿 |

## 2. 性能（大 vault 下仪表盘首屏、日历月视图）

| 路由 | P95（2935 条目，prod build） | 目标 | 结论 |
|---|---|---|---|
| `/`（widget 仪表盘） | 30ms | <200ms | ✅ 未因 V2 widget 化回退 |
| `/requirements` | 4ms | <200ms | ✅ |
| `/content`（看板） | 3ms | <200ms | ✅ |
| `/calendar`（月视图，42 格 + 内容按日分组） | 3ms | <200ms | ✅ |
| `/cycles`（燃尽计算） | 3ms | <200ms | ✅ |
| `/feeds` | 3ms | <200ms | ✅ |

**结论**：SQLite 索引的 kind/stage/score 列使需求/内容筛选走索引；燃尽/日历在服务端一次算好。大 vault 无退化。（复现：`pnpm seed:stress` + 上述 bench）

## 3. 无障碍（新组件键盘可达 / 焦点可见 / AA 对比度）

| 项 | 结论 | 说明 |
|---|---|---|
| 键盘可达 | ✅ | widget 拖拽用 dnd-kit 的 `KeyboardSensor`（sortableKeyboardCoordinates）；命令面板全键盘；`?` 快捷键表 |
| aria 标注 | ✅ | 新组件的图标按钮均带 `aria-label`（拖拽/删除/刷新/宽度/打开等，18+ 处）；预设选择 `aria-pressed` |
| 焦点可见 | ✅ | 复用全站 focus-visible 环；弹层 `role="dialog"` + aria-label |
| AA 对比度 | ✅ | 预设 accent（PM 青 / 创作紫）都在既有 token 内、深空底上过 AA；`prefers-reduced-motion` 覆盖 widget lift 微动效 |
| reduced-motion | ✅ | widget-dragging 动效包在 `@media (prefers-reduced-motion: no-preference)` 内 |

**note（非 blocker）**：平台适配 checklist 目前是展示态（`platformDef` 渲染），勾选状态未持久化——属功能深度而非无障碍缺陷，记入后续迭代。

## 4. 一致性（两个 preset 的文案与视觉统一）

- ✅ 两预设共用同一 nav / widget 注册表，仅按 `moduleVisible` 过滤，文案与图标一致。
- ✅ 预设 accent 通过 `data-preset` + 同一 token 体系切换（PM 青 / 创作紫），不引入割裂的第二套视觉。
- ✅ Onboarding、后台 PresetSwitcher、命令面板「前往」三处对模块的称呼一致。
- ✅ 双修模式（both）= 两套模块并集，E2E 覆盖 nav 过滤（`tests/e2e/preset.spec.ts`）。

## 5. 死代码与依赖清理

**审核发现并当场修复**：
- ❌→✅ `aggregateByPlatform`（原仅测试用）→ 已接入 content-detail 的跨平台对比图，去掉内联重复计算。
- ❌→✅ `buildPlatformChecklist` / `getTemplate` / `REQUIREMENT_STAGES`（真死代码，0 生产引用）→ 已删除，相应测试同步清理。
- ✅ 新增依赖 `@modelcontextprotocol/sdk`、`@dnd-kit/utilities` 均被实际使用。

---

## 结论

- **Blocker**：0
- **当场修复**：死代码 3 处 + helper 复用 1 处
- **记入后续迭代（note）**：平台 checklist 勾选持久化、feeds 定时刷新
- **门槛**：`pnpm verify` 全绿（209 单测）、E2E 全绿、安全套件全绿、`pnpm audit` 0 漏洞、大 vault P95 达标 → **准予上线 v2.0.0**。
