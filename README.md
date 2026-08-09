# A股涨停板看盘页面

基于 Figma Make 视觉稿实现，**数据对接** [stock_project](../stock_project) 后端（FastAPI + Redis/PG）。

技术栈：React + Vite + TypeScript，普通 CSS。

## 运行

1. 先启动后端（见 `D:\project\stock_project` 的 `scripts/start_all.ps1` 或 API）
2. 前端：

```bash
cd D:\project\front
npm install
npm run dev
```

默认：`http://localhost:5174`，API：`VITE_API_BASE_URL`（默认 `http://127.0.0.1:8000`）

## 数据策略

| 模块 | 数据来源 |
| --- | --- |
| 涨停表 / 封板 / 炸板 | `/api/rank/*` + `/api/limit-history` |
| 板块 / 强势个股 | `concept_top` / `strong_stocks` |
| 连板天梯 | `/api/limit-history` 按连板数分组 |
| 统计条 / 情绪热度 | `meta.market_pulse` |
| 新闻 / 龙虎榜 / 晋级率 / 指数 | **暂无接口 → 不展示假数据** |

非交易日自动走复盘日期（`default_replay_date`）。接口无数据时页面显示空状态，**不会生成 Mock**。

## 待导出 Figma 资源

Logo / 日历 / 空状态 / 刷新图标等仍为占位（见组件 `data-asset`）。
