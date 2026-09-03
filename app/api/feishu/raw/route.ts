// =============================================================
// 飞书文档内容抓取（服务端，避免 CORS）
// 需要环境变量：FEISHU_APP_ID / FEISHU_APP_SECRET
// 支持 /docx/xxx 与 /wiki/xxx（wiki 节点自动解析为 docx）。
// =============================================================

import { NextRequest, NextResponse } from "next/server";

const FEISHU_OPEN = "https://open.feishu.cn/open-apis";

interface FeishuDocToken {
  kind: "docx" | "wiki";
  token: string;
}

function extractToken(rawUrl: string): FeishuDocToken | null {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    const okHost =
      host === "feishu.cn" ||
      host.endsWith(".feishu.cn") ||
      host === "larksuite.com" ||
      host.endsWith(".larksuite.com");
    if (!okHost) return null;
    const seg = u.pathname.split("/").filter(Boolean);
    if (seg.length >= 2 && (seg[0] === "docx" || seg[0] === "wiki")) {
      return { kind: seg[0], token: decodeURIComponent(seg[1]) };
    }
    return null;
  } catch {
    return null;
  }
}

async function tenantAccessToken(): Promise<string> {
  const appId = process.env.FEISHU_APP_ID ?? "";
  const appSecret = process.env.FEISHU_APP_SECRET ?? "";
  const res = await fetch(`${FEISHU_OPEN}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    cache: "no-store",
  });
  const data = (await res.json()) as {
    code?: number;
    msg?: string;
    tenant_access_token?: string;
  };
  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`获取飞书 tenant_access_token 失败：${data.msg ?? res.status}`);
  }
  return data.tenant_access_token;
}

async function fetchDocxRaw(docId: string, token: string): Promise<string> {
  const res = await fetch(`${FEISHU_OPEN}/docx/v1/documents/${docId}/raw_content`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = (await res.json()) as {
    code?: number;
    msg?: string;
    data?: { document?: { raw_content?: string; title?: string } };
  };
  if (data.code !== 0) {
    throw new Error(
      `飞书返回错误（${data.code ?? res.status}）：${data.msg ?? "未知错误"}。请确认文档已分享给该飞书应用。`
    );
  }
  return data.data?.document?.raw_content ?? "";
}

async function resolveWikiDocId(wikiToken: string, accessToken: string): Promise<string> {
  const url = new URL(`${FEISHU_OPEN}/wiki/v2/spaces/get_node`);
  url.searchParams.set("token", wikiToken);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = (await res.json()) as {
    code?: number;
    msg?: string;
    data?: { node?: { obj_type?: string; obj_token?: string } };
  };
  if (data.code !== 0 || !data.data?.node) {
    throw new Error(`飞书 wiki 节点解析失败（${data.code ?? res.status}）：${data.msg ?? "未知错误"}`);
  }
  if (data.data.node.obj_type !== "docx") {
    throw new Error(`暂只支持导入飞书文档（docx），该链接类型为 ${data.data.node.obj_type ?? "未知"}。`);
  }
  return data.data.node.obj_token ?? "";
}

export async function POST(req: NextRequest) {
  const appId = process.env.FEISHU_APP_ID ?? "";
  const appSecret = process.env.FEISHU_APP_SECRET ?? "";
  if (!appId || !appSecret) {
    return NextResponse.json({
      ok: false,
      code: "feishu_not_configured",
      message:
        "尚未配置飞书开放平台凭证（FEISHU_APP_ID / FEISHU_APP_SECRET）。可先在部署环境变量中配置；临时方案：把飞书文档导出为 .md / .docx 后上传。",
    });
  }

  let url = "";
  try {
    const body = (await req.json()) as { url?: string };
    url = (body.url ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误。" }, { status: 400 });
  }

  const parsed = extractToken(url);
  if (!parsed) {
    return NextResponse.json({
      ok: false,
      message: "无法识别该链接。请粘贴形如 https://xxx.feishu.cn/docx/xxxx 或 /wiki/xxxx 的分享链接。",
    });
  }

  try {
    const accessToken = await tenantAccessToken();
    const docId =
      parsed.kind === "wiki"
        ? await resolveWikiDocId(parsed.token, accessToken)
        : parsed.token;
    const text = await fetchDocxRaw(docId, accessToken);
    if (!text.trim()) {
      return NextResponse.json({ ok: false, message: "文档内容为空，或该文档没有可导入的文本。" });
    }
    return NextResponse.json({ ok: true, text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "抓取飞书文档失败，请稍后重试。";
    return NextResponse.json({ ok: false, message });
  }
}
