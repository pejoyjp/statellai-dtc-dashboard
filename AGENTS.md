<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 项目目的与范围

本项目是 SATELLAI 黑五运营看板，数据来自 Shopify Admin GraphQL / ShopifyQL 和活动服务器。默认中文，支持英文和打印。工作区内已有未提交的用户文件与改动，修改前先查看 `git status`；不得为了清理工作区覆盖、删除或提交与当前任务无关的内容。

## 领域划分和依赖方向

- `app/` 是 Next.js App Router 的入口层，只负责页面组合、HTTP 参数解析和响应转换；不要把业务规则或第三方请求堆在路由中。
- `modules/commerce/`：Shopify 销售、订单与访问数据。
- `modules/campaign/`：活动统计、抽奖参与和用户查询。
- `modules/storefront/`：店铺可访问性和网站性能。
- 每个领域按需使用 `domain/`（类型、规则和不依赖框架的计算）、`application/`（用例和网关接口）、`infrastructure/`（Shopify 或活动服务器适配器）、`presentation/`（该领域界面）。领域规则不能依赖 Next.js、React、网络或环境变量；应用层依赖接口，由路由入口组装具体适配器。
- `modules/shared/` 只放确实跨领域复用的基础设施和应用类型；`components/ui/` 是共享 shadcn/ui 组件，`components/layout/` 是布局；不要为了形式创建没有职责的层或跨领域直接访问对方的基础设施。
- 新功能先确定领域及规则，再添加用例、适配器、路由和界面。更改 API 契约时检查旧客户端并维护兼容层。

## 页面与 API 路由

- `/`：汇总，可打印；`/sales`：销售；`/campaign`：活动；`/health`：网站健康；`/customers`：用户查询。导航必须真实跳转并支持移动端，中英文切换在路由切换后保持有效。
- 新接口使用 `/api/commerce/dashboard`、`/api/campaign/stats`、`/api/campaign/users/summary`、`/api/storefront/performance`、`/api/storefront/availability`。原 `/api/dashboard`、`/api/stats`、`/api/campaign`、`/api/health`、`/api/storefront-status` 暂作兼容，不要未经确认删除。

## 数据口径与集成约定

- Shopify 销售起点为 2026-11-12 15:00 北京时间（`2026-11-12T07:00:00Z`），订单数排除取消订单；超过 Shopify 60 天读取窗口、缺少 `read_all_orders` 时不可将不完整数量显示为完整值。
- 活动服务器累计数包含活动全部历史，不等同于 Shopify 起点；今日按服务器返回的北京时间口径。性能指标是最近 30 个自然日的 Shopify P75；可访问性检查只代表服务端对店铺首页的 HTTP 探测。
- 所有密钥只从服务端环境变量读取，禁止输出到日志、浏览器、源码和版本库；不向真实活动抽奖、注册或订单写入接口发送测试请求。
- 保留现有 API 返回结构、错误状态和中英文文案；不可用的数据展示缺失或错误，不得伪造 0 或示例数据。打印应使用当前筛选周期并保留当前数据。

## 验证与维护

- 项目使用 pnpm。完成相关修改后至少运行 `pnpm lint`、`pnpm test`、`pnpm build`；涉及页面布局、路由或打印时还要检查相关页面及移动布局；涉及 API 或领域规则时覆盖错误、边界和原有契约。
- 使用 Next.js 功能前，按本文件顶部自动生成的规则阅读当前版本的本地文档，尤其注意缓存与路由约定。
- 添加或改变路由、领域边界、数据口径、环境变量和验证命令时，同步维护本文件和 `README.md`。顶部 Next.js 自动生成区块必须原样保留。
