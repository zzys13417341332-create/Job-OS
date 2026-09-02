import { NextResponse } from "next/server";
import { runAIGateway } from "@/lib/server/ai-gateway";
import type { AIJobMatchOutput } from "@/services/ai/types";

export async function POST(req: Request) {
  const payload = (await req.json().catch(() => null)) as unknown;
  const result = await runAIGateway<AIJobMatchOutput>("job-match", payload);
  return NextResponse.json(result, { status: result.ok ? 200 : 501 });
}
