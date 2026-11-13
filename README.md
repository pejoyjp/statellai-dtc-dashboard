# 2026 Black Friday 运营看板

基于 Next.js App Router 的 Shopify 和活动运营看板，支持中文、英文与打印。

## 运行

安装依赖：`pnpm install`。在项目根目录创建 `.env.local`：

```dotenv
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-admin-access-token
CAMPAIGN_API_URL=https://campaign.satellai.com
DASHBOARD_API_KEY=your-dashboard-api-key
DASHBOARD_INTERNAL_EMAILS=
# 额外确认的内部邮箱，使用逗号分隔
```

执行 `pnpm dev` 后打开 `http://localhost:3000`。局域网使用可执行 `pnpm dev -H 0.0.0.0 -p 3008`，其他设备通过服务器的局域网 IP 和端口访问；IP 变化后需重启开发服务。密钥仅供服务端使用。

## 页面

| 路由 | 内容 |
| --- | --- |
| `/` | 汇总与完整打印 |
| `/sales` | Shopify 核心指标、趋势、销售渠道、SKU 和折扣码 |
| `/campaign` | 活动旅程、奖品、最近动态和内部邮箱排除名单 |
| `/health` | Shopify 网页性能与店铺首页访问状态 |
| `/customers` | 按邮箱查询活动参与情况 |

## 架构与接口

`app/` 负责路由和响应；`modules/commerce`、`modules/campaign`、`modules/storefront` 分别管理销售、活动和网站健康领域。每个领域按职责分为 `domain`、`application`、`infrastructure`、`presentation`；用例依赖网关接口，由路由组装外部服务适配器。共享 Shopify 传输及通用界面分别位于 `modules/shared` 和 `components`。详细约定见 [AGENTS.md](AGENTS.md)。

新 API 路由为 `/api/commerce/dashboard`、`/api/campaign/stats`、`/api/campaign/users/summary`、`/api/storefront/performance` 和 `/api/storefront/availability`；原 API 路由继续保留以兼容已有客户端。

### 报表口径

- 新销售报表使用 `GET /api/commerce/dashboard?view=report`。活动页使用 `GET /api/campaign/stats?view=activity` 读取原有统计与过滤后的最近动态。不传 `view` 时保持旧接口的返回结构及统计范围。
- 销售页使用店铺的 Shopify IANA 时区和日期范围。默认开始时刻保留北京时间 2026 年 11 月 12 日 15:00（`2026-11-12T07:00:00Z`），页面换算为店铺当地时间。销售趋势图的轴标签和悬浮提示也使用同一店铺时区。可传店铺当地日期时间 `start` 和 `end`，结束留空表示查询时刻。时间范围保留到秒，夏令时跳过或重复的当地时间须改用其他时间。
- 销售可用重复的 `channel`、`campaign`、`source`、`medium` 参数多选。维度内取并集，维度间取交集。Shopify 会话指标使用在线商店会话数据，选择只有非在线商店渠道时显示缺失。转化率和跳出率分别按完成结账的会话数和跳出会话数除以总会话数。
- 销售额使用 `total_sales + abs(total_sales_reversals)`。Shopify 的冲销涵盖退款、退货、取消和编辑调整。订单量排除已取消订单与冲销记录，超过 60 天时需要 `read_all_orders`。AOV 和新客数使用 Shopify 原生口径，SKU 销量使用 `net_items_sold`，折扣码分布使用 Shopify 的折扣码归因。统计查询需要 `read_reports` 和受保护客户数据权限。
- 新报表默认排除 `163.com`、`satellai.com`、`qq.com` 三个精确域名。可用 `DASHBOARD_INTERNAL_EMAILS` 补充已确认的完整地址。Shopify 在聚合前按邮箱域名和邮箱过滤，匿名会话无法按邮箱识别。活动页合并 Shopify 黑五报表、最近活动记录与配置名单中的完整地址，并列出拼音候选供核对。

- SKU、折扣码、流量拥有独立的子模块筛选，顶层日期、销售渠道和 UTM 同时作用于三个模块。多选控件在点击「确认筛选」后应用并收起，日期通过「应用日期」提交。顶部「重置全部筛选」会清空全局与子模块条件。向上滚动时可用浮动目录跳到各销售区块。商品维度使用 SKU 与变体名称，净销量使用 `net_items_sold`。
- 带 UTM 筛选的销售统计与流量模块的销售、净销量使用 Shopify 末次非直接点击归因。会话按自身来源和落地页统计，流量模块支持按 Shopify 引荐渠道筛选。两张 UTM 明细表以引荐渠道为首列，落地页排行按路径汇总会话数并降序排列。销售落地页使用归因触点的 `page_path`。
- Shopify 会话报表仅提供 UTM 层级的加购与开始结账会话。商品明细里的加购、结账列保留为缺失。流量模块筛选 SKU 或变体后，销售和净销量继续按商品计算，会话指标显示缺失。

### 活动统计

累计覆盖活动服务器全部历史，今日按北京时间，趋势可单独选择日或小时。活动页独立于销售日期筛选。现有活动汇总仍包含内部记录，最近动态按域名与已确认邮箱排除。弹窗曝光和邮箱输入完成仅在活动服务器提供对应字段时显示。

本地可打开 [活动接口 JSON](http://localhost:3000/api/campaign/stats?granularity=day&days=7) 查看当前服务器返回。也可在浏览器开发者工具的 Network 中找到 `stats` 请求并查看 Response。

- `totals` 和 `today` 提供注册、抽奖、参与、中奖和未中奖次数，累计还提供用满次数的人数。
- `series` 提供按日或小时的注册、抽奖、参与和中奖数据。`rates` 提供参与率和中奖率。
- `prizes` 和 `prizeRules` 提供奖品发放数与规则，`recent` 提供最近活动明细，`range` 和 `timezone` 提供统计时间信息。
- 当前响应中的 `totals` 和 `today` 缺少 `popupOpens` 和 `emailCompletions`。要判断事件是否已经采集，需核对弹窗和表单的埋点，以及活动服务器的事件存储和汇总逻辑。
- 活动页独立请求 `view=emails` 获取 Shopify 默认黑五周期及已配置的邮箱名单。

### 按周期过滤的活动接口

`GET /api/campaign/stats?view=journey` 使用活动服务器的 `GET /dashboard/stats`，传 `view=journey`、UTC ISO 格式的 `start` 和 `end`（均含边界），以及可重复的 `excludeEmail` 和 `excludeDomain` 参数。活动服务器需要按事件发生时刻与邮箱归因过滤后返回以下结构，`scope` 回显实际生效的范围和排除名单。

```ts
{
  scope: { start: string, end: string, excludeEmails: string[], excludeDomains: string[] },
  totals: { popupOpens: number, emailCompletions: number }
}
```

`popupOpens` 统计弹窗每次实际展开，`emailCompletions` 统计邮箱输入完成事件。若弹窗展开时未识别邮箱，上游需要用后续事件关联同一访客，才能排除该访客的曝光。缺少上述响应时，活动旅程指标显示缺失。上游可在同一 `scope` 下补充活动趋势 `series`、奖品 `prizes` 和参与率及中奖率 `rates`。旧接口可提供奖品规则与最近事件，页面按所选时间及邮箱排除规则筛选这些事件。

## 验证

执行 `pnpm lint`、`pnpm test` 和 `pnpm build`。网站健康指标使用 Shopify 真实访客最近 30 个自然日的数据；首页访问状态是服务器侧检查，不代表结账等所有功能正常。

界面遵循 [shadcn/ui](https://ui.shadcn.com/docs/components) 的组件与布局约定，细则见 [AGENTS.md](AGENTS.md)。
