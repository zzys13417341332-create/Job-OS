# Job OS 云端落地步骤

目标架构：GitHub（代码）→ Vercel（网站）→ Supabase（数据 + 录音）。
当前阶段数据仍在浏览器本地；完成第 4 步后我会上线“远程同步层”，页面代码无需改动。

## 第 1 步：推送代码到 GitHub（在你的终端执行）

```bash
cd /Users/niangjiu/Documents/Codex/2026-09-02/files-pasted-by-the-user-job/outputs/job-os
git push -u origin main
```

仓库已初始化并完成两次提交，远端已配置为：
https://github.com/zzys13417341332-create/Job-OS.git

> 建议在 GitHub 上把仓库设为 Private（含求职数据相关的代码与演示数据）。

## 第 2 步：部署到 Vercel

1. 打开 https://vercel.com/new ，用 GitHub 账号导入 `Job-OS` 仓库。
2. Framework 选 **Next.js**（会自动识别），其余默认。
3. 环境变量（暂可不填，纯本地存储也能跑）：
   - `AI_API_KEY`：真实 AI Key（仅服务端使用）
   - `AI_MODEL`：如 `gpt-4.1-mini`
   - `NEXT_PUBLIC_AI_MODE`：`mock` 或 `server`
4. Deploy。得到 `https://<project>.vercel.app`。

## 第 3 步：创建 Supabase 项目

1. https://supabase.com → New project（免费档足够单用户）。
2. SQL Editor 中执行仓库里的 `supabase/schema.sql`。
3. Storage → Buckets，确认已创建 `interview-audio`（私有）。
4. 在 Settings → API 复制：
   - Project URL（`NEXT_PUBLIC_SUPABASE_URL`）
   - anon public key（`NEXT_PUBLIC_SUPABASE_ANON_KEY`）

## 第 4 步：把参数发给我，我接入远程数据层

我需要的参数：

```text
Vercel 域名：https://xxx.vercel.app
NEXT_PUBLIC_SUPABASE_URL：https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY：eyJ...
```

anon key 是前端公开 key，可放心提供。拿到后我会实现：

- Supabase Auth（邮箱 + 密码登录，单用户）；
- localStorage → 数据库的全量同步（首次登录自动上传，此后每次改动即写库）；
- 面试录音改存 `interview-audio` 私有桶；
- Vercel 环境变量配置文档与真实 AI 启用。

## 数据安全提醒

- 不要把真实简历/录音写进 GitHub 仓库；演示数据均为虚构。
- Supabase anon key 配合 RLS 只能读写本人数据，不能越权。
- 数据库接入完成前，请定期在 Dashboard → 设置与数据 → 导出 JSON 备份。
