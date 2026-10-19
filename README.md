# Shiro

如纸的纯净，似雪的清新。Shiro 是为 [Mix Space](https://github.com/mx-space) 构建的个人网站主题，提供文章、手记、思考与时间线等内容展示方式。

本仓库基于 [Innei/Shiro](https://github.com/Innei/Shiro)，包含 Mix Space Core 14 的 HTTP V3、原生 WebSocket、评论审核与正文渲染适配。

**[在线站点](https://lrc.qzz.io)** · **[本地开发](#本地开发)** · **[部署](#部署)** · **[相关文档](#相关文档)**

> [!IMPORTANT]
> 上游 Shiro 已进入维护模式，仅修复关键 Bug。本分支的 Core 14 兼容说明以仓库内文档为准。
>
> 运行环境为 **Node.js 22+**、**pnpm 10.27.0** 和 **Mix Space Core 14**。HTTP 使用 `/api/v3`，实时连接使用原生 WebSocket `/ws/web`，协议按 Core **14.16.0** 适配。

## 功能概览

- **内容展示**：文章、手记、独立页面，以及支持评论、点赞和 RSS 的思考（Recently）页面。
- **首页与时间线**：Hero 区域、活动流、风向标导航，以及按年份和内容类型筛选的时间线。
- **阅读体验**：Markdown 扩展语法、富文本渲染与 Spring 弹性动画；正文 JSON 缺失或渲染失败时回退到 Markdown。
- **评论互动**：支持回复，并区分评论已发布、待自动审核、待博主审核和已拒绝等状态。
- **实时更新**：通过 WebSocket 接收文章通知、评论和在线人数等事件，断线重连后恢复订阅。
- **活动状态**：结合 [ProcessReporter](https://github.com/Innei/ProcessReporter) 展示当前活动。
- **多语言**：使用 next-intl 提供国际化支持。

## 本地开发

先准备 Node.js 22+ 和可访问的 Mix Space Core 14 实例，再克隆本仓库：

```bash
git clone https://github.com/Misasasasasaka/Shiro.git
cd Shiro
corepack enable
pnpm install --frozen-lockfile
cp apps/web/.env.template apps/web/.env
```

编辑 `apps/web/.env`，至少配置以下变量：

```dotenv
NEXT_PUBLIC_API_URL=https://core.example.com/api/v3
NEXT_PUBLIC_GATEWAY_URL=https://core.example.com
WEBHOOK_SECRET=replace-with-the-core-webhook-secret
```

| 变量                         | 用途                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`        | Core HTTP API 地址，保留 `/api/v3` 后缀。                            |
| `NEXT_PUBLIC_GATEWAY_URL`    | Core 实时服务地址，通常填写 Core 的 origin；客户端会连接 `/ws/web`。 |
| `NEXT_PUBLIC_CLIENT_API_URL` | 可选；浏览器与服务端使用不同 API 地址时填写。                        |
| `WEBHOOK_SECRET`             | 与 Core 中配置的 webhook 密钥保持一致。                              |

其他可选变量见 [环境变量模板](apps/web/.env.template)。完成配置后启动开发服务：

```bash
pnpm dev
```

访问 <http://localhost:2323>。Core 的 `ALLOWED_ORIGINS` 需要包含站点 host，例如 `localhost:2323`，不要带 `http://` 或 `https://`。

常用检查命令：

```bash
pnpm --filter @shiro/web exec tsc --noEmit
pnpm --filter @shiro/web test
pnpm --filter @shiro/web build:ci
```

真实 Core 实例测试的配置方式见 [Core 14 兼容与部署指南](docs/core14.md#验证)。

## 部署

### Vercel

在 Vercel 导入本仓库，按以下配置构建网页应用：

| 设置             | 值                               |
| ---------------- | -------------------------------- |
| Framework Preset | Next.js                          |
| Root Directory   | `apps/web`                       |
| Node.js Version  | 22.x                             |
| Install Command  | `pnpm install --frozen-lockfile` |
| Build Command    | `pnpm build:ci`                  |

这是一个 pnpm monorepo，构建时需要包含仓库根目录的工作区配置与锁文件。在 Vercel 项目中配置环境变量，并确保构建环境、服务端和浏览器均可访问对应的 Core 地址。

将 Core webhook 指向 `https://你的站点域名/api/webhook`，两端设置相同的 `WEBHOOK_SECRET`。实时连接直接访问 Core 的 gateway；如果 Core 位于反向代理后，需转发 `/ws/web` 的 WebSocket Upgrade。

### Docker Compose

在已克隆的仓库根目录执行：

```bash
cp .env.template .env
mkdir -p public
cp -R apps/web/public/. public/
```

编辑根目录的 `.env`，填写 Core 地址与 webhook 密钥。`public` 目录用于挂载站点图标等静态资源，可在其中替换默认文件。

将以下 `BASE_URL` 替换为你的 Core 地址，不带 `/api/v3` 后缀，再构建并启动：

```bash
docker build --build-arg BASE_URL=https://core.example.com -t shiro:core14 .
docker compose up -d
```

默认通过 `2323` 端口提供服务。Compose 使用本地构建的 `shiro:core14` 镜像；更新代码后，需要重新构建并启动容器：

```bash
git pull --ff-only
docker build --build-arg BASE_URL=https://core.example.com -t shiro:core14 .
docker compose up -d
```

构建与运行时变量、反向代理及回滚注意事项见 [Core 14 兼容与部署指南](docs/core14.md)。

> [!NOTE]
> [上游 Releases](https://github.com/Innei/Shiro/releases) 中的预构建产物不一定包含本分支的 Core 14 适配。部署本分支时，请使用本仓库源码构建。

## 相关文档

| 文档                                                             | 内容                                             |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| [Core 14 兼容与部署](docs/core14.md)                             | HTTP V3、评论审核、正文渲染、验证与回滚。        |
| [Core 14 WebSocket 适配](docs/core14-websocket.md)               | 连接配置、反向代理、事件协议与重连行为。         |
| [上游部署教程](https://mx-space.js.org/docs/themes/shiro/deploy) | Shiro 通用部署说明；本分支配置以仓库内文档为准。 |
| [Markdown 扩展语法](https://shiro.innei.in/#/markdown)           | 写作时可使用的扩展语法。                         |
| [更新记录](CHANGELOG.md)                                         | 项目历史版本记录。                               |

## 技术栈与目录

- **框架**：Next.js 16（App Router）、React 19、TypeScript。
- **状态与数据**：Jotai、TanStack Query、Mix Space API SDK。
- **样式与交互**：Tailwind CSS v4、DaisyUI v5、Radix UI、Motion。
- **实时通信与国际化**：原生 WebSocket、next-intl。
- **工程工具**：pnpm workspace、Turborepo、Vitest。

```text
apps/web/          Next.js 网页应用
packages/types/    类型与样式导出包
docs/              兼容、部署与协议文档
Dockerfile         Docker 镜像构建配置
docker-compose.yml 本地镜像启动配置
```

## 界面参考

以下截图来自上游，供了解 Shiro 的设计风格；实际界面以当前版本和站点配置为准。

<img width="1471" alt="Shiro 上游首页截图" src="https://github.com/Innei/Shiro/assets/41265413/bf8af4ec-0f0c-441a-8c06-4b44e1649597">

<details>
<summary>查看更多页面截图</summary>

![Shiro 上游页面截图 1](https://github.com/Innei/Shiro/assets/41265413/1b85c9be-0cd3-46b5-a089-a9ab97fdfecb)
![Shiro 上游页面截图 2](https://github.com/Innei/Shiro/assets/41265413/d808d288-c022-42f2-8d74-ad057a588771)

</details>

<details>
<summary>查看上游性能测试参考</summary>

上游在 M2 MacBook Air 上对重负载页面的测试截图。实际表现取决于内容、后端响应和部署环境。

![上游性能测试结果](https://github.com/Innei/Shiro/assets/41265413/f76152af-4a52-46a2-9b83-20567800ba75)

</details>

## 上游与相关项目

- [Innei/Shiro](https://github.com/Innei/Shiro)：原始项目与主题设计。
- [余白 / Yohaku](https://github.com/Innei/Yohaku)：独立的个人博客项目，采用新的设计语言；完整代码需通过赞助获得访问权限。
- [白い / Shiroi](https://github.com/innei-dev/Shiroi)：Shiro 的付费赞助版本，提供 AI、视觉效果、认证和编辑等扩展能力。具体功能与获取方式以该项目说明为准。
- [赞助 Innei](https://github.com/sponsors/Innei)：支持原作者及其项目。

## 致谢与许可

感谢 [Innei](https://github.com/Innei) 的原始设计与开发，以及 @wibus-wee、@wuhang2003 等社区贡献者的代码和文档贡献。

**© 2026 Innei**。本项目采用 [AGPLv3 许可证](LICENSE)，并附加特定的商业使用条件。使用前请阅读 [附加条款和条件](ADDITIONAL_TERMS.md)。
