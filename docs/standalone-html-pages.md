# 独立 HTML 页面

Shiro 可以把 mx-space 管理的页面正文作为完整 HTML 文档返回。地址仍为
`/页面-slug`，不加载博客导航、页脚、评论、主题样式或 React 运行时。
此功能仅用于已发布页面，不改变 Core，也不扩展后台的草稿实时预览。

## 创建页面

1. 在 mx-space 创建 Markdown 格式的页面，填写标题和 slug，例如 `demo`。
2. 正文直接粘贴完整 HTML 源码，包括 `<!doctype html>`、`head` 和 `body`。
   **不要包在 Markdown 代码围栏中，也不要通过富文本编辑器转换源码。**
3. 在页面的自定义字段 `meta` 中添加以下配置，保留其他已有字段：

   ```json
   { "render": "html" }
   ```

4. 发布后访问 `https://你的站点/demo`。

对应现有内容字段是 `text: "完整 HTML 源码"`、`contentFormat: "markdown"`
和 `meta.render: "html"`。`html` 不是 Core 的 `contentFormat` 值。
旧 SDK 中的 `type: "html"` 不用于启用此功能。

可以直接复制 [完整交互示例](examples/standalone-page.html)，内含 CSS、按钮和
JavaScript。文档标题、viewport、favicon、SEO 标签与样式都由 HTML 自己设置；
Shiro 不自动补全、清洗或注入正文。

已发布的 Lexical 页面不能通过 Core 直接降级为 Markdown；如需替换，创建新的
Markdown 页面并通过 mx-space 管理其内容。标记为 HTML 但正文为空或格式不正确时，
Shiro 返回 HTTP 422，并显示格式说明。

## 脚本、样式与资源

`style`、`script`、模块脚本和外部 CSS/JS 使用浏览器原生规则执行。
这些代码与博客同源，具有同源网页的 Cookie、存储和请求能力，
因此只发布你自己编写或审核过的可信代码。

图片、字体、CSS 和 JS 可引用已有的 mx-space 文件地址、站点公开资源或 CDN。
本功能不新增文件上传或资源托管接口。外部资源仍须满足浏览器的 HTTPS、CORS
规则以及部署环境已有的 CSP。

相对路径按浏览器地址解析：在 `/demo` 中，`./app.js` 指向 `/app.js`，
不是 `/demo/app.js`。推荐使用完整资源 URL 或以 `/` 开头的路径；如需指定
资源基址，可以自行在 HTML 的 `head` 中设置 `base`。

## 地址、更新与恢复

- `/en/demo`、`/ja/demo`、`/zh/demo` 临时重定向至 `/demo`，保留查询参数和锚点。
  HTML 读取不携带语言参数，不使用 Core 翻译版本。
- 页面仍可以出现在已有的导航、页面翻页和搜索中。HTML 链接整页打开；搜索中的
  自定义页面结果也整页打开。HTML 内返回博客的链接使用普通 `a` 即可。
- HTML 响应及正文查询均不缓存；更新后刷新页面即可生效，不自动通过 WebSocket
  更新已打开的 HTML 文档。
- 删除 `meta.render` 即恢复普通页面渲染；删除页面后走原有 404 处理。
- slug 仍受 Shiro 现有路由约束：使用单个路径段，不能占用 `posts`、`notes`、
  `preview` 等内置路由、语言首页或静态资源路径；不要使用点号或以下划线开头。

未设置此标记的 Markdown、Lexical 和 equipment 页面使用原有渲染方式。
