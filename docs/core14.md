# Mix Space Core 14 兼容与部署

本分支面向 **Mix Space Core 14.15.2**，使用 V3 API、字符串 Snowflake ID
和 Core 14 原生 WebSocket 协议。Core 13 的 Socket.IO 实时协议不再支持。

## 版本与变化

- `@mx-space/api-client`：5.13.0
- `@mx-space/webhook`：1.0.0
- `@mx-space/ws-client`：0.1.0
- Node.js：22+；pnpm：10.27.0

实时连接改为 `/ws/web`，消息使用 `{ v: 1, event, payload, id? }`。
事件名使用 `post.create`、`comment.create` 等点分格式；加入/退出房间使用
`room.join` / `room.leave` 和 `{ room: 'article_<id>' }`。
连接在收到 `gateway.connect` 后才恢复会话、语言和当前文章房间。
断线期间离开的文章不会在重连后重新订阅；心跳和退避重连由官方客户端处理。

评论提交区分已发布、待自动审核、待博主审核和已拒绝。只有已发布的评论
才传给评论完成回调，审核凭证不会写入共享评论缓存；审核拒绝时保留草稿。

保留 Shiro 原有富文本样式和渲染器。新编辑器的引文、聊天、股票节点继续
降级为可读内容；渲染错误或正文 JSON 缺失时，文章、手记和独立页面回退到
Core 返回的 Markdown 正文。此升级不包含 Core 新增会员购买、TTS 等前端界面。

## 配置与部署

复制 `.env.template` 为 `.env`，至少配置：

```dotenv
NEXT_PUBLIC_API_URL=https://core.example.com/api/v3
NEXT_PUBLIC_GATEWAY_URL=https://core.example.com
WEBHOOK_SECRET=replace-with-the-core-webhook-secret
```

`NEXT_PUBLIC_API_URL` 保留 `/api/v3` 后缀。`NEXT_PUBLIC_GATEWAY_URL` 填 Core
origin，不带 `/api/v3`、`/web` 或 `/ws/web`。HTTPS 自动使用 `wss://`。
如浏览器和服务端地址不同，另设 `NEXT_PUBLIC_CLIENT_API_URL`。

反向代理须转发 `/ws/web` 的 WebSocket Upgrade；旧 `/socket.io/` 转发规则
不足以支持 Core 14。Core 的 `ALLOWED_ORIGINS` 填站点 host（含非默认端口），例如
`blog.example.com` 或 `localhost:2323`，不要带 `https://`。

Core webhook 指向 `https://shiro.example.com/api/webhook`，两端使用相同密钥。
Shiro 验证 Core 同时发送的 SHA-1 和 SHA-256 签名，并识别 1.0 的事件名。

```bash
docker build --build-arg BASE_URL=https://core.example.com -t shiro:core14 .
docker compose up -d
```

Compose 默认使用刚构建的本地镜像 `shiro:core14`。
`WEBHOOK_SECRET`、`TMDB_API_KEY`、`GH_TOKEN` 仅作为运行时变量传入。

Core 自身从旧版本升级时，应按 Core 发布说明先备份并运行 `mx-migrate`，
然后启动 Core 14。本仓库只升级 Shiro，不执行生产数据库迁移。

## 验证

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @shiro/web exec tsc --noEmit
pnpm --filter @shiro/web test
pnpm --filter @shiro/web build:ci
```

真实 Core 测试默认跳过。指定有公开文章、手记、独立页面的测试实例：

```bash
CORE14_INTEGRATION_URL=https://core.example.com/api/v3 \
  CORE14_GATEWAY_URL=https://core.example.com \
  CORE14_EXPECTED_VERSION=14.15.2 \
  pnpm --filter @shiro/web test:core14
```

HTTP 测试检查聚合信息、列表/详情、搜索、评论和回复；WebSocket 测试等待
`gateway.connect` 与在线人数事件，并确认房间、会话、语言和心跳指令的 ack。
测试不会创建内容或评论，但实时连接会产生正常的访客统计。

同时设置 `CORE14_SHIRO_URL` 可检查 Shiro 的 RSS、说说/思考 Feed、Sitemap
和 OG 输出。浏览器还应检查文章渲染、评论提交和断线后恢复在线人数/文章通知。

Core 14 搜索仍返回嵌套列表和 `current_page` / `total_page` 分页字段。
搜索归一化逻辑保留；评论列表也兼容 SDK 解包后的原生 V3 分页元信息。

## 回滚

保留上一版 Shiro 镜像、Core 镜像和部署配置。前端回滚时使用与后端协议
匹配的版本：原 Core 13 分支应连接 Core 13。回滚 Shiro 不会回滚 Core 数据库；
Core 的数据库回滚需独立遵循其发布说明和备份恢复流程。
