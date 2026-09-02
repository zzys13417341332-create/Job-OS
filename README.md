# Job OS｜Personal AI Job Search & Interview System

个人使用的 AI 求职管理与面试准备 Web 应用（MVP）。

## 技术栈

- Next.js 15（App Router）+ React 19 + TypeScript
- Tailwind CSS 3 + Lucide Icons
- 数据层：localStorage（结构化 DB）+ IndexedDB（面试录音）
- AI 层：Mock Provider（默认，本地启发式）+ Server API Route（预留真实 LLM 接入）

## 快速开始

```bash
pnpm install
pnpm dev
```

打开 http://localhost:3000 （若端口被占用：`pnpm dev -- -p 3210`）。
首次使用建议打开 http://localhost:3000/?demo=1 自动载入演示数据，或在 Dashboard →「设置与数据」里手动载入；演示数据为虚构人物「林一」，可随时导出/导入/清空。

> 本机没有 npm 时使用 pnpm（Node v24 环境已验证）。`package.json` 脚本与 npm 一致，也可直接 `npm run dev`。

## 已实现功能（Phase 1 MVP）

## 唯一页面框架（4 个一级页面）

| 页面 | 模块（页面内自上而下） |
| --- | --- |
| Dashboard | 目标投递岗位数量 → 今日投递（岗位增删改/状态/搜索/筛选）→ JD Match → Todo |
| Interview Prep | 自我介绍（+ Resume Profile 弹窗）→ Project Library → AI 追问（按项目 + JD 预测） |
| Interview Review | 录音 → Transcript → 问题提取 → 回答分析 → Gap Analysis（二级为单场面试详情） |
| Knowledge Base | 公司知识 / 行业知识 / 平台知识 / 面试经验 / 案例 |

个人资料编辑、数据导入导出/演示数据/清空均作为弹窗存在，不再是一级页面。

## 哪些是 Mock（明确标注，未接真实 API）

- JD Match、面试追问、面试预测、面试复盘、Gap 检测：浏览器内 Mock AI，页面均有「Mock」徽标。
- Transcript：音频只本地保存，未接入真实 Speech-to-Text；提供 Mock Transcript（占位内容）与粘贴文本两种方式。
- 真实 AI 接入点：`app/api/ai/*` + `.env.example` 已预留；配置 `AI_API_KEY` 并把 `NEXT_PUBLIC_AI_MODE=server` 即可切换，无需改动页面。

## 数据存储

- 结构化数据：浏览器 `localStorage`（key: `job-os.db.v1`），接口在 `services/storage/local.ts`。
- 面试录音：`IndexedDB`（key: `job-os-audio`），UI 仅存元数据。
- 数据层与 UI 解耦：页面 → `providers/data-context` → `services/storage` → localStorage；未来可替换为 PostgreSQL / Supabase。

## 目录结构

```text
app/                     路由页面 + API Routes（真实 AI 网关）
components/layout/       AppShell / Sidebar / Header
components/pages/        各页面组合
components/jobs|projects|prep|interviews|knowledge|match  业务组件
components/ui/           基础 UI（Button/Modal/Toast/Tags/…）
lib/                     types / constants / utils / factories / server 网关
providers/data-context   全局数据入口（CRUD + 自动持久化）
services/ai              AI 契约 + Mock Provider + Server Provider
services/storage         localStorage / IndexedDB / 演示数据
scripts/smoke.ts         核心链路冒烟测试
```

## 测试

```bash
pnpm typecheck   # TypeScript 检查
pnpm tsx scripts/smoke.ts  # 数据 + Mock AI 核心链路
```

## 安全说明

- 简历、项目、面试录音/转写只保存在本机浏览器，不上传云端。
- 不硬编码任何真实个人经历：演示数据为虚构；Mock 输出只引用用户已保存资料。
- 接入真实 AI 时 API Key 仅存在于服务端环境变量。

## 已知限制（Phase 1）

- 数据保存在当前浏览器：换设备/清缓存需先导出 JSON。
- 未接入真实 LLM 与语音识别（Phase 2）；Mock Transcript 是占位内容。
- URL 导入知识、浏览器插件、自动 Todo 触发等属于 Phase 2/3，未实现。
