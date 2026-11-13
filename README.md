# 2026 Black Friday 运营看板

基于 Next.js App Router 的 Shopify 和活动运营看板，支持中文、英文与打印。

## 运行

安装依赖：`pnpm install`。在项目根目录创建 `.env.local`：

```dotenv
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-admin-access-token
CAMPAIGN_API_URL=https://campaign.satellai.com
DASHBOARD_API_KEY=your-dashboard-api-key
```

执行 `pnpm dev` 后打开 `http://localhost:3000`。局域网使用可执行 `pnpm dev -H 0.0.0.0 -p 3008`，其他设备通过服务器的局域网 IP 和端口访问；IP 变化后需重启开发服务。密钥仅供服务端使用。

## 页面

| 路由 | 内容 |
| --- | --- |
| `/` | 汇总与完整打印 |
| `/sales` | Shopify 销售、订单和访问量 |
| `/campaign` | 活动指标、趋势、奖品和最近动态 |
| `/health` | Shopify 网页性能与店铺首页访问状态 |
| `/customers` | 按邮箱查询活动参与情况 |

## 架构与接口

`app/` 负责路由和响应；`modules/commerce`、`modules/campaign`、`modules/storefront` 分别管理销售、活动和网站健康领域。每个领域按职责分为 `domain`、`application`、`infrastructure`、`presentation`；用例依赖网关接口，由路由组装外部服务适配器。共享 Shopify 传输及通用界面分别位于 `modules/shared` 和 `components`。详细约定见 [AGENTS.md](AGENTS.md)。

新 API 路由为 `/api/commerce/dashboard`、`/api/campaign/stats`、`/api/campaign/users/summary`、`/api/storefront/performance` 和 `/api/storefront/availability`；原 API 路由继续保留以兼容已有客户端。

Shopify 指标从 2026 年 11 月 12 日 15:00（北京时间）开始，订单数排除取消订单；统计查询需要 `read_reports` 和 Shopify 所要求的受保护客户数据权限，超过 60 天的完整订单数还需要 `read_all_orders`。活动累计和今日数据使用活动服务器自身口径，可能包含该时间之前的历史；活动统计可按日或小时切换，页面可见时每 10 秒更新。

## 验证

执行 `pnpm lint`、`pnpm test` 和 `pnpm build`。网站健康指标使用 Shopify 真实访客最近 30 个自然日的数据；首页访问状态是服务器侧检查，不代表结账等所有功能正常。
