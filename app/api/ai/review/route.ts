import { NextResponse } from "next/server";
import { runAIGateway } from "@/lib/server/ai-gateway";
import type { InterviewAnalysis } from "@/lib/types";

export async function POST(req: Request) {
  const payload = (await req.json().catch(() => null)) as unknown;
  const result = await runAIGateway<InterviewAnalysis>("review", payload);
  return NextResponse.json(result, { status: result.ok ? 200 : 501 });
}
