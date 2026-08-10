# ⚠️ 已迁入 `stock_project/front`

**请勿在此目录继续开发。** 规范路径：

`D:\project\stock_project\front`

一键启动：`D:\project\stock_project\scripts\start_all.ps1`（Vite :5174）

详见同目录 [MOVED.md](./MOVED.md)。下方为迁入前的旧说明，仅供对照。

---

# A股涨停板看盘页面（旧位置说明）

基于 Figma Make 视觉稿实现，**数据对接** [stock_project](../stock_project) 后端（FastAPI + Redis/PG）。

技术栈：React + Vite + TypeScript，普通 CSS。

## 运行（请改用新路径）

```powershell
cd D:\project\stock_project\front
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

默认：`http://localhost:5174`，`/api` → `:8000`。
