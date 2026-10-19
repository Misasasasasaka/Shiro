# Core 14 WebSocket 适配

Shiro 的实时连接遵循 Mix Space Core 14.16.0 的协议，使用官方
`@mx-space/ws-client` 0.1.0 和 `@mx-space/webhook` 1.0.0。Core 14 已移除
Socket.IO，旧的 `/web` namespace、`/socket.io/` 入口及大写事件名不再适用。
HTTP 请求仍使用 `/api/v3`；本次变更针对实时连接，不代表完整的 Core 14 HTTP
API 兼容认证。

## 连接配置

```dotenv
NEXT_PUBLIC_API_URL=https://core.example.com/api/v3
NEXT_PUBLIC_GATEWAY_URL=https://core.example.com
```

gateway 可填写 HTTP(S) 或 WS(S) 地址，Shiro 会转换协议并连接 `/ws/web`，例如
`wss://core.example.com/ws/web`。也支持带代理前缀或已包含 `/ws/web` 的地址。
未设置 gateway 时连接当前页面所在 origin 的 `/ws/web`，因此同域部署需代理此路径。

反向代理须把 `/ws/web` 转发给 Core，并保留 WebSocket upgrade 头。例如 nginx：

```nginx
location /ws/ {
    proxy_pass http://core:2333;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 120s;
}
```

只代理 `/api/v3` 或 `/socket.io/` 无法承载新连接。Core 13 的实时服务不再受支持。

## 协议与重连

双向文本帧使用 `{ v: 1, event, payload, id? }`。文章房间名仍为
`article_<id>`，ID 保留为字符串。

| 功能 | 事件 | payload 示例 |
| --- | --- | --- |
| 订阅文章 | `room.join` | `{ "room": "article_9007199254740993001" }` |
| 取消订阅 | `room.leave` | `{ "room": "article_9007199254740993001" }` |
| 更新访客身份 | `session.update` | `{ "sessionId": "reader-id" }` |
| 更新语言 | `lang.update` | `{ "lang": "zh-CN" }` |

下行事件使用 `post.create`、`comment.create`、`visitor.online`、
`article.read_count_update` 等新名称。Webhook 的 `x-webhook-event` 也使用新名称。

官方客户端负责心跳探活和指数退避重连。Shiro 收到 `gateway.connect` 后才发送
指令；重连后恢复最新身份、语言和当前仍在查看的文章订阅，不重放已离开的房间。
多个视图订阅同一文章时，最后一个视图离开后才取消订阅。

## 验证

```bash
pnpm --filter @shiro/web test:websocket
pnpm --filter @shiro/web exec tsc --noEmit
```

默认测试使用本地真实 WebSocket 服务，验证握手、版本化消息、事件转发、断线
恢复及房间订阅。真实 Core 测试默认跳过；提供测试实例后运行：

```bash
CORE14_GATEWAY_URL=https://core.example.com \
  pnpm --filter @shiro/web test:websocket
```

真实实例测试等待连接问候及在线人数，并逐项检查房间、身份和语言指令的成功 ack。
它只修改临时连接状态，不创建评论或修改持久化内容。
