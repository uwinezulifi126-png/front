# A股涨停板看盘页面

基于 Figma Make 设计稿 [A股涨停板看盘页面](https://www.figma.com/make/l23PJFG5KV9Cl4XkBLtgx6/A%E8%82%A1%E6%B6%A8%E5%81%9C%E6%9D%BF%E7%9B%AF%E7%9B%98%E9%A1%B5%E9%9D%A2)（file key: `l23PJFG5KV9Cl4XkBLtgx6`）实现。

技术栈：**React + Vite + TypeScript**，**普通 CSS + CSS 变量**（Flex/Grid 布局）。数据为本地 Mock。

## 运行

```bash
cd D:\project\front
npm install
npm run dev
```

默认地址：`http://localhost:5173`

## 功能

- 顶栏：Logo 占位（可点击）、指数、交易状态、时钟、交易日日期选择、刷新
- 统计条：涨停/跌停/炸板/封板率等
- 左栏：涨停趋势、板块热度、实时预警
- 主区 Tab：全部 / 封板 / 炸板 / 板块 / 财经新闻 / 连板天梯 / 强势个股
- 右栏：市场情绪、龙虎榜、连板晋级率

交互均用 React `useState`（Tab、日期、刷新、新闻筛选、天梯筛选选股、强势股排序/自选等）。

## 待从 Figma 导出的资源

| 资源 | 说明 | 代码占位 |
| --- | --- | --- |
| Logo / Favicon | 顶栏品牌图标 | `IconPlaceholder kind="logo"` · `data-asset="logo"` |
| calendar-icon | 日期选择器图标 | `data-asset="calendar-icon"` |
| empty-state-icon | 空状态图标 | `data-asset="empty-state-icon"` |
| refresh-icon | 刷新按钮图标 | `data-asset="refresh-icon"` |
| `7ed96a3941d9c56b3e4f8971aa6f949402f179c0.png` | Make 预览/装饰图 | 未引用，可放 `public/assets/` |
| `a6770be7d3c967bab5b85d7ebac365517f9a9b88.png` | Make 预览/装饰图 | 同上 |
| `a6c828a82e4cfd807ff0100e2202d078b7363e96.png` | Make 预览/装饰图 | 同上 |
| `f9fa15e4d059e2296fbba4ce2634dfa142469348.png` | Make 预览/装饰图 | 同上 |

字体 JetBrains Mono、Noto Sans SC 通过 Google Fonts 加载。

## 说明

- UI 对齐 Make 源码结构与配色；样式为普通 CSS，非 Tailwind。
- Mock 数据见 `src/data/mock.ts`。
