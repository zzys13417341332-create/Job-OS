// =============================================================
// .docx 文本提取（服务端，用 mammoth 解析）
// 飞书/Word 导出为 docx 后可直接上传。
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ ok: false, message: "上传内容解析失败，请重试。" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ ok: false, message: "没有收到文件。" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ ok: false, message: "仅支持 .docx 文件。" }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ ok: false, message: "文件超过 15MB，请拆分后导入。" }, { status: 400 });
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { value } = await mammoth.extractRawText({ buffer });
    if (!value.trim()) {
      return NextResponse.json({ ok: false, message: "未能从文档中提取到文本（可能是扫描件/纯图片文档）。" });
    }
    return NextResponse.json({ ok: true, text: value });
  } catch {
    return NextResponse.json(
      { ok: false, message: "文档解析失败，请确认是有效的 Word 文档，或另存为 .md / .txt 后上传。" },
      { status: 400 }
    );
  }
}
