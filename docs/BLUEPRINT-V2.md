# ccBilly 工作台 · V2.0 双角色版 —— 调研蓝图与全自动冲刺提示词

> **给 B哥 的使用说明**：
> 1. 把**这份文件放进仓库**（建议路径 `docs/BLUEPRINT-V2.md`）——提示词的第一步就是让 CC 读它的 Part A / Part B 作为设计输入；
> 2. 把 **Part C 整段粘给 Claude Code**（权限配置与 Git 远端沿用之前的，不用动）；
> 3. Part D 是你的须知（含「上线」的定义、给 Codex 的两条补充生图提示词）。
>
> **V2.0 一句话定位**：从「B哥 的个人工作台」升级为「面向两类用户的产品」——产品经理（PM）与自媒体创作者——同一内核、两套角色预设，并让工作台本身成为 Agent 可驱动的工具（MCP server）。

---

# Part A · 调研发现：8 个开源标杆，各取其长

| # | 项目 | 定位 | 值得抄的点 |
|---|------|------|-----------|
| 1 | **Glance**（glanceapp/glance） | 自托管信息流仪表盘，社区口碑极高 | 核心哲学：仪表盘应该「展示你每天要看的内容」而不只是放服务入口。RSS / 视频频道 / 自定义 API 等信息流 widget 体系；多页面；widget 级缓存策略；极简克制但有个性的视觉 |
| 2 | **Homarr** | 现代化拖拽仪表盘 | 免配置文件的**拖拽式布局**：widget 可视化摆放、调整大小；内置鉴权与用户体系；「五分钟出一个好看仪表盘」的上手体验 |
| 3 | **Homepage / Dashy** | 服务导航面板 | 服务卡片 + 实时健康状态点；我们的应用中心可以补上健康检查徽标 |
| 4 | **Plane**（makeplane/plane） | 开源 Jira/Linear 替代，PM 工具标杆 | Work Items 富属性；**Cycles 周期冲刺 + 燃尽图**；Modules 分组；**列表/看板/日历/表格/时间线五种视图 + 可保存共享的自定义视图**；**Intake 需求分诊**；Pages 笔记一键转任务；产品哲学 = 学 Linear 的速度、键盘优先与克制设计 |
| 5 | **Huly** | all-in-one 协作平台，暗色视觉标杆 | 文档承载路线图与会议纪要，**纪要中的行动项直接转任务**；深色霓虹的高级质感 |
| 6 | **Postiz**（gitroomhq/postiz-app） | 开源社媒排期工具，创作者标杆 | **可视化发布排期日历**；一稿多平台（每个平台单独微调与预览）；**同一篇内容跨平台数据对比**；AI 选题辅助；最有启发的一点：**提供 MCP server / CLI，让 Claude Code 等 Agent 直接驱动排期** |
| 7 | **wewe-rss**（cooderl/wewe-rss） | 公众号 → RSS（基于微信读书），私有化部署 | 公众号订阅转 .rss/.atom/.json、全文输出、标题过滤、OPML 导出——是「竞品公众号监测」的现成外挂 |
| 8 | **we-mp-rss**（rachelos/we-mp-rss） | 公众号助手 | 公众号文章**转 Markdown**、定时更新、Webhook / API / AI Agent 接入——公众号内容进 vault 的现成通路 |

**跨项目提炼的「炫酷设计」清单**（V2 视觉与交互的模仿对象）：
1. 键盘优先 + 深度命令面板（Linear 系：一切操作可不碰鼠标完成）；
2. 可拖拽的 Bento 玻璃 widget 网格（Homarr 的交互 × Glance 的信息密度 × 我们的深空玻璃拟态）；
3. 信息流页（Glance 式「早晨一览」：竞品动态、行业资讯、自己的待办与数据，一页看完）；
4. 数据可视化作为签名元素（Plane 的燃尽图气质 → 延续我们的「今日轨道」并新增「周期燃尽环」）；
5. 可保存的自定义视图（筛选组合一键存档复用）；
6. 首启 Onboarding 角色选择（一步定制整个工作台的样子）。

---

# Part B · V2.0 设计蓝图：双角色架构

## B1 三个核心架构决策

**决策一：角色预设层（Persona Presets）——同一内核，两套人格。**
不做两个产品，也不把两类功能堆在同一屏。新增「预设」概念：`preset = 模块开关集合 + 仪表盘默认布局 + vault 模板包 + 界面词汇表`。内置三个预设：**PM 模式**、**创作者模式**、**双修模式**（全开）。首次启动出 Onboarding 选择页（可跳过，默认双修），后台随时切换；切换只影响展示层，**不迁移不删除任何数据**。

**决策二：Widget 化仪表盘（抄 Glance + Homarr）。**
建立 widget 注册表（今日轨道、今日待办、进行中、14 天趋势、合集分布、活动热力图、周期燃尽环、需求池分诊队列、发布日历缩略、内容数据趋势、情报源信息流、快速捕捉框……），仪表盘变为**可拖拽、可增删、可调宽度的玻璃 Bento 网格**，布局持久化到 `vault/config/dashboard.md`（frontmatter 存布局，Git 可同步）。两个角色预设 = 两套默认布局。

**决策三：工作台自身成为 Agent 的工具——内置 MCP server（抄 Postiz）。**
暴露一组 MCP 工具：查询/创建/更新任务与选题、追加动态、生成日报草稿、读取统计。这样 Claude Code / 其他 Agent 不再只是「开发这个工作台」，而是能**日常驱动**它（例：「把这周的选题按 RICE 排个序」「给今天的公众号阅读数据录入并生成复盘」）。与既有多 Agent 文档协作协议互补：文档协议管开发协作，MCP 管产品使用。

## B2 数据层扩展（必须向后兼容）

任务 frontmatter 新增**可选**判别字段 `kind: task | requirement | content`（缺省 = task，旧文件零改动可用）：
- `requirement`（需求，PM）：增 `rice: {reach, impact, confidence, effort}`，score 由索引计算；`stage: inbox | pool | scheduled | shipped`；
- `content`（内容，创作者）：增 `platforms: [公众号, 小红书, 抖音, B站, X, ...]`、`publish_date`、`stage: idea | draft | ready | published | review`、`metrics: [{date, platform, views, likes, comments, shares, followers_gained}]`（手动录入的快照数组）；
- 合集新增可选 `cycle: {start, end}` → 有起止日期的合集自动获得**燃尽图**。
新增目录：`vault/inbox/`（快速捕捉）、`vault/decisions/`（决策日志）、`vault/config/`（布局与预设）、`vault/templates/`（模板包）。

## B3 PM 模块包（对标 Plane / Huly）

1. **需求池与分诊**：inbox → 需求池 → 排期 三段式（Intake 思路）；需求卡带 RICE 四项打分，列表按 score 排序，一键拖入某个周期；
2. **周期（Cycle）**：给合集加起止日期即成周期，详情页出燃尽图（剩余任务数 × 日期）与完成率；
3. **路线图**：时间线视图——按周期/合集横向铺开，今日线高亮；
4. **决策日志**：`vault/decisions/` 的 ADR 式模板（背景/选项/决定/理由/复盘时间），列表 + 到期复盘提醒；
5. **会议纪要 → 行动项**：纪要模板中的 `- [ ] @行动项` 一键批量转任务（Huly/Plane Pages 思路）；
6. **模板包**：PRD、竞品分析、用户访谈记录、复盘（存 `vault/templates/pm/`，新建文档时可选）。

## B4 创作者模块包（对标 Postiz + 公众号生态）

1. **选题库**：灵感卡（标题、来源链接、一句话切入角度、热度打分 1–5、标签），支持从情报源页一键「存为选题」；
2. **内容管道看板**：选题 → 草稿 → 待发 → 已发 → 复盘 五列（即 content 的 stage 流转，复用现有看板引擎）；
3. **发布排期日历**：月视图，每篇内容按 `publish_date` 落格，格内显示平台徽标；拖拽换日期；
4. **一稿多平台清单**：内容详情页按所选平台生成适配 checklist（如公众号封面图/摘要、小红书首图/话题标签、B站简介），逐项勾选（Postiz「每平台微调」的本地化表达）;
5. **数据复盘**：发布后手动录入各平台数据快照 → 单篇跨平台对比条形图、账号级趋势线、「本月最佳」榜；复盘模板一键生成；
6. **情报源页（信息流）**：Glance 式多栏信息流——通过既有 proxy（沿用 V1.1 的 allowlist + SSRF 防护，仅此白名单可出网）订阅任意 RSS/JSON 源；官方推荐搭配写进文档：用 wewe-rss / we-mp-rss 私有化实例把竞品公众号变成源，应用中心提供这两个项目的一键登记模板。文章卡片支持「存为选题」「存入知识库」。

## B5 通用体验升级（两个角色都受益）

1. **快速捕捉 Inbox**：全局快捷键呼出极简输入框（也在 Cmd+K 内），一句话进 `vault/inbox/`，稍后分诊为 任务/需求/选题/笔记；
2. **命令面板深化**：动作（新建 X、生成日报、切视图、切主题、Git 同步）+ 搜索 + 最近访问，全键盘可达，`?` 呼出快捷键表；
3. **可保存视图**：任意筛选/排序/分组组合可命名保存，侧边栏直达；
4. **周复盘引导流**：升级周报为四步向导（本周数据自动汇总 → 亮点 → 问题 → 下周计划），完成即产出周报定稿；
5. Onboarding：三屏（选角色 → 看一眼预设布局 → 完成），可跳过。

## B6 视觉规范增量（深空玻璃拟态延续）

widget 拖拽时玻璃卡「悬浮升起 + 轨道对齐辅助线」微动效；PM 模式主强调色偏电光青、创作者模式偏星云紫（同一 token 体系内的变量切换，两套均须过 AA 对比度）；「今日轨道」保留为默认签名 widget，新增「周期燃尽环」作为 PM 模式的第二签名；`prefers-reduced-motion` 约束继续全覆盖。

---

# Part C · 给 Claude Code 的提示词（整段复制，全自动：改 → 测 → 审 → 上线）

## 0. 模式与输入

延续 CLAUDE.md 的自主交付模式（循环、红线、禁止向 B哥 提问、三类例外全部照旧）。本轮为 **V2.0 双角色版冲刺**。设计输入 = 仓库内 `docs/BLUEPRINT-V2.md` 的 Part A 与 Part B（若该文件在其他路径，以实际为准）——**先完整读它**，再读 HANDBOOK 的已知问题与 DELIVERY_REPORT 的遗留项，把三者合并拆解为任务卡登记到 COLLABORATION 看板，然后开跑。蓝图与现有架构冲突时，你有权做取舍，但必须写 ADR。

## 1. 里程碑

- **V2-M1 架构底座**：角色预设层（preset 定义、切换、持久化）；模块注册表（模块可按 preset 开关）；Widget 化仪表盘（注册表、拖拽布局、宽度调整、布局存 `vault/config/dashboard.md`）；数据 schema 扩展（B2）+ **迁移与兼容**：旧 vault 打开即用，缺省字段自动兜底；提供 `pnpm migrate` 显式迁移脚本，**迁移前自动把 vault 备份为带时间戳的 zip**。
- **V2-M2 PM 模块包**：B3 全部六项。
- **V2-M3 创作者模块包**：B4 全部六项；情报源页必须复用并通过 V1.1 的 proxy allowlist 与 SSRF 防护（新增出网面 = 新增对抗性测试）。
- **V2-M4 通用体验**：B5 全部五项 + B6 视觉增量。
- **V2-M5 MCP server**：以官方 MCP 规范实现（stdio 与 HTTP 二选一起步，写 ADR 说明）；工具集：`list_tasks / create_task / update_task / append_activity / create_idea / generate_daily_draft / get_stats`；**写操作受 V1.1 鉴权模型约束**（AUTH_MODE=passcode 时必须携带凭据）；附使用文档与 Claude Code 连接示例；集成测试覆盖每个工具。
- **V2-M6 审核与上线**：见 §3、§4。

## 2. 测试要求（每个里程碑内完成，不留到最后）

`pnpm verify` 全绿是底线；新增 E2E 至少覆盖：双角色 Onboarding 走通且预设生效；widget 拖拽后刷新布局不丢；需求 RICE 打分排序正确；周期燃尽图数据正确；内容从选题拖到已发、录入数据、生成复盘全链路；情报源添加合法源成功、非法源（私网地址）被拒；快速捕捉 → 分诊为任务；MCP 每个工具的读写往返。**V1.1 的全部安全对抗性测试必须持续全绿**——任何新功能不得使其变红。

## 3. 审核（上线前的独立步骤，不可跳过）

以「外部 reviewer」视角对 V2 全量 diff 做一次自审，产出 `docs/REVIEW_V2.md`，清单至少含：安全回归（重点：情报源出网面、MCP 写入面、widget 布局注入）、性能（大 vault 下仪表盘首屏、日历月视图）、无障碍（新组件键盘可达、焦点可见、AA 对比度）、一致性（两个 preset 的文案与视觉统一）、死代码与依赖清理。发现的问题当场修复或降级记录，Review 报告中每项给出结论与证据（测试名/截图路径）。

## 4. 上线（本轮「上线」的客观定义）

1. verify + 全量 E2E + 安全回归全绿，REVIEW_V2 完成；
2. 更新 README（双角色定位与新截图——用 Playwright 重生成，含两个 preset 的仪表盘对比图）、CHANGELOG（v2.0.0）、DELIVERY_REPORT 追加「V2.0 双角色版」人话章节；
3. `git tag v2.0.0` 并 push；用 `gh release create` 发布 GitHub Release（附 CHANGELOG 摘录与截图）；gh 未认证则本地完成 tag、在日志与交付报告中给出一条待执行命令，不阻塞；
4. 尽力项：README 增加「只读演示模式」说明（`DEMO_MODE=readonly` 时禁用全部写入与 Git/MCP 写工具），为将来部署公开 demo 铺路；实现成本过高则降级为 issue 记录。

## 5. 本轮追加红线

数据迁移必须可逆（自动备份先行）；旧版 vault 无损兼容是硬性验收项（用 V1 的 seed 数据做回归 E2E）；预设切换不得改写业务数据；情报源抓取只允许经 proxy allowlist 出网，任何绕过即为缺陷。

---

# Part D · 给 B哥 的须知

1. **操作顺序**：本文件入库（`docs/BLUEPRINT-V2.md`）→ commit → 把 Part C 粘给 CC。权限与 Git 远端配置沿用，无需变动；想让「上线」一步到位，提前跑一次 `gh auth login`（GitHub CLI），否则它会本地打好 tag 并留一条命令等你执行。
2. **两个角色其实都是你**：PM 模式服务你的求职与产品训练（需求池、RICE、周期、决策日志本身就是面试可讲的方法论落地），创作者模式服务你的公众号事业（选题库 + 情报源 + 数据复盘正好承接你的竞品内容分析系统）。这个项目从 V2 起就是你 AI PM 求职的作品集主案例：双角色产品设计 + 多 Agent 协作开发 + MCP 生态接入，三条故事线都齐了。
3. **竞品公众号监测的落地路径**：本地或小鸡上起一个 wewe-rss（或 we-mp-rss）实例 → 在工作台后台的应用中心用一键模板登记 → 情报源页订阅它输出的 RSS → 看到好选题点「存为选题」。全链路数据都在你自己手里。
4. **跑完看两处**：`docs/REVIEW_V2.md`（审核报告）与 `docs/DELIVERY_REPORT.md` 的 V2.0 章节。
5. **给 Codex 的两条补充生图提示词**（Onboarding 角色选择页插画，风格后缀沿用 V1 文档 Part B5 的统一后缀）：
   - PM 角色卡（`persona-pm.png`，1:1）：`A translucent glass telescope on a small floating glass platform, pointed at a constellation shaped like a rising roadmap line with milestone nodes` + 统一风格后缀；
   - 创作者角色卡（`persona-creator.png`，1:1）：`A glowing glass quill drawing a spiral of light that scatters into small floating social feed cards, one card showing a tiny ascending chart` + 统一风格后缀。
