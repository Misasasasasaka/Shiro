# Mix Space Core 13 兼容与部署

本文记录 Mix Space Core 13 的 HTTP V3 适配，不再兼容 Core 10。代码直接使用 V3
`{ data, meta }` 响应、Snowflake 字符串 ID 和 API Client v5 正式模型，未引入
任何旧响应适配器。

实时功能现已迁移到 Core 14 的 `/ws/web`，不再连接 Core 13 的 Socket.IO。
连接配置与测试见 [Core 14 WebSocket 适配指南](core14-websocket.md)。

## 已验证版本

- Mix Space Core：13.14.1
- `@mx-space/api-client`：5.5.0
- `@mx-space/webhook`：当前使用 1.0.0（Core 14 事件名）；HTTP 适配时使用 0.9.0
- Node.js：22 或更高

任务最初指定的 Core 13.13.1 已由 13.14.1 取代。13.14.1 是实施时的最新
Core 13.x 稳定版本；SDK、webhook 和 Node.js 最低版本没有变化。

## 环境变量

复制仓库根目录的 `.env.template` 为 `.env`：

```bash
cp .env.template .env
```

至少配置：

```dotenv
NEXT_PUBLIC_API_URL=https://core.example.com/api/v3
NEXT_PUBLIC_GATEWAY_URL=https://core.example.com
WEBHOOK_SECRET=replace-with-the-core-webhook-secret
```

`NEXT_PUBLIC_API_URL` 必须包含 `/api/v3`。`NEXT_PUBLIC_GATEWAY_URL` 只填写
Core 14 gateway origin，Shiro 会通过原生 WebSocket 连接 `/ws/web`。若浏览器和服务端需要不同的
Core 地址，可额外设置 `NEXT_PUBLIC_CLIENT_API_URL`。

Core 中的 webhook 地址应设为 `https://shiro.example.com/api/webhook`，两端必须
使用相同的 `WEBHOOK_SECRET`。Shiro 要求同时通过 SHA-1 和 SHA-256 签名验证，
事件名遵循 webhook 1.0.0 的 `post.create` 等格式。

## 本地验证

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @shiro/web exec tsc --noEmit
pnpm --filter @shiro/web test
pnpm --filter @shiro/web build
```

只读的真实 Core 13 集成测试默认跳过。指定测试实例后运行：

```bash
CORE13_INTEGRATION_URL=https://core.example.com/api/v3 \
  CORE13_EXPECTED_VERSION=13.14.1 \
  pnpm --filter @shiro/web exec vitest run \
  src/contracts/core13-live.integration.test.ts
```

WebSocket 测试已迁移至 Core 14；使用 `pnpm --filter @shiro/web test:websocket`，
真实实例测试需设置 `CORE14_GATEWAY_URL`，详见上述适配指南。

## Docker 部署

构建时的 `BASE_URL` 是 Core origin，不带 `/api/v3`：

```bash
docker build \
  --build-arg BASE_URL=https://core.example.com \
  -t shiro:core13 .
docker compose up -d
```

`WEBHOOK_SECRET`、`TMDB_API_KEY` 和 `GH_TOKEN` 只作为运行时环境变量传入，
不会写进镜像构建层。容器健康后检查首页、文章/手记/页面、搜索、评论、
`/feed`、`/sitemap.xml` 和 OG 图片。

## 已知的 Core/SDK 响应差异

Core 13.14.1 的搜索结果仍在 `data.data` 中携带列表，并使用
`current_page`/`total_page`；评论列表的分页位于 `data.meta.pagination`。
API Client 5.5.0 的声明描述的是扁平 `PaginateResult`。Shiro 只在搜索和评论
输入边界验证并归一化这两个已由真实 Core 响应确认的差异；它们不是旧 V2
接口兼容层。

## 回滚

1. 保留当前 `.env` 和上一版镜像 tag。
2. 停止新容器，将 Compose 的镜像改回上一版 tag，再执行
   `docker compose up -d`。
3. 若上一版 Shiro 只支持 Core 10，必须同时将前端流量切回与 Core 10 匹配的
   旧部署；不要让旧 Shiro 连接 Core 13，也不要把本分支连接 Core 10。

本适配不会迁移或修改生产数据库。MongoDB 到 PostgreSQL 的数据迁移不属于
本任务，回滚前端也不会回滚 Core 数据。
