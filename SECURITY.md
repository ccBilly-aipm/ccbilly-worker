# 安全策略 · Security Policy

## 支持范围

ccBilly 工作台是**本地优先（local-first）的单用户个人工作台**。它的默认设计目标是运行在你自己的机器上（`localhost`），数据是你自己的 Markdown 文件。安全模型围绕这一定位构建。

## 部署姿势与安全模型（务必阅读）

工作台有三种典型部署姿势，安全要求不同：

| 姿势 | 配置 | 说明 |
|---|---|---|
| **本机单人（默认）** | `AUTH_MODE=none`，仅 `localhost` 访问 | 所有写操作免登录，体验最顺。**只要不对外暴露端口即可。** |
| **局域网 / 公网** | `AUTH_MODE=passcode` + 强 `ADMIN_PASSCODE` | 所有写操作（不只 `/admin`）都需登录会话。**对外部署必须用此模式。** |
| **Docker** | 见 `docker-compose.yml`（默认注入 `AUTH_MODE=passcode` 示例） | 容器场景等同"暴露"，走 passcode 模式。 |

**Fail-closed 保护**：若检测到从**非 `localhost` 地址**访问、但你没有启用鉴权（`AUTH_MODE` 非 `passcode` 或未设口令），所有写操作会被直接拒绝并返回配置指引——而不是裸奔。这是防止误暴露的兜底。

> ⚠️ 即便在 passcode 模式下，本工具的鉴权是**单用户级**的口令 + 会话，不是多租户认证体系。若要在不可信网络暴露，请在前面再加一层反向代理鉴权（OAuth / mTLS 等）。

## 已做的安全加固

本项目做过一轮系统性安全审计（攻击面分析 → 对抗性测试 → 修复），记录在 [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md)，覆盖：

- **XSS**：Markdown 渲染经 `rehype-sanitize` 白名单净化（知识库笔记等）。
- **路径穿越 / 符号链接逃逸**：Skill 文件操作基于 `realpath` 的最近存在祖先校验，写真实 `~/.claude/skills/` 受白名单守卫。
- **SSRF**：反向代理对目标 IP 分类拒绝（环回/私网/云元数据），逐跳重定向重校验。
- **鉴权**：分层模型 + fail-closed 暴露闸 + 常数时间口令比较 + 登录限速。
- **依赖**：`pnpm audit` 零已知漏洞；CI 持续验证。
- **响应头**：CSP + `X-Content-Type-Options` + `Referrer-Policy` + `X-Frame-Options` 等。

## 报告漏洞

如果你发现了安全问题：

1. **请勿**直接开公开 issue 披露可利用细节。
2. 通过 GitHub 的 **"Report a vulnerability"**（仓库 Security → Advisories）私密报告，或直接联系仓库所有者。
3. 请附上复现步骤、影响面、受影响的版本 / commit。

作为单人维护的开源个人项目，我会尽力在合理时间内响应，但不承诺 SLA。感谢你的负责任披露。
