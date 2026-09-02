import type { InterviewAnalysis } from "@/lib/types";
import type {
  AIFollowUpInput,
  AIFollowUpOutput,
  AIJobMatchInput,
  AIJobMatchOutput,
  AIPredictionInput,
  AIPredictionOutput,
  AIProvider,
  AIReviewInput,
} from "./types";
import { analyzeJobMatchCore } from "./mock/jobMatch";
import { generateFollowUpsCore } from "./mock/followUps";
import { predictInterviewCore } from "./mock/prediction";
import { reviewInterviewCore } from "./mock/review";
import { simulateLatency } from "./mock/engine";

export type { AIProvider } from "./types";

/**
 * Mock AI Provider：在浏览器本地完成启发式分析。
 * 流程与输出结构与真实 AI 完全一致，用于没有 API Key 的 MVP。
 */
export class MockAIProvider implements AIProvider {
  readonly mode = "mock" as const;

  async analyzeJobMatch(input: AIJobMatchInput): Promise<AIJobMatchOutput> {
    await simulateLatency();
    return analyzeJobMatchCore(input);
  }

  async generateFollowUps(input: AIFollowUpInput): Promise<AIFollowUpOutput> {
    await simulateLatency(400, 900);
    return generateFollowUpsCore(input.project);
  }

  async predictInterview(input: AIPredictionInput): Promise<AIPredictionOutput> {
    await simulateLatency();
    return predictInterviewCore(input);
  }

  async reviewInterview(input: AIReviewInput): Promise<InterviewAnalysis> {
    await simulateLatency(700, 1500);
    return reviewInterviewCore(input);
  }
}

/**
 * Server AI Provider：通过 Next.js API Route 转发到 LLM。
 * API Key 只存在于服务端环境变量，永远不会进入浏览器 bundle。
 */
export class ServerAIProvider implements AIProvider {
  readonly mode = "server" as const;

  private async post<T>(action: string, body: unknown): Promise<T> {
    const res = await fetch(`/api/ai/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: true; data: T }
      | { ok: false; error: string }
      | null;
    if (!res.ok || !json || !json.ok) {
      const msg =
        json && !json.ok
          ? json.error
          : `AI 请求失败（HTTP ${res.status}）`;
      throw new Error(msg);
    }
    return json.data;
  }

  analyzeJobMatch(input: AIJobMatchInput): Promise<AIJobMatchOutput> {
    return this.post<AIJobMatchOutput>("job-match", input);
  }

  generateFollowUps(input: AIFollowUpInput): Promise<AIFollowUpOutput> {
    return this.post<AIFollowUpOutput>("follow-ups", input);
  }

  predictInterview(input: AIPredictionInput): Promise<AIPredictionOutput> {
    return this.post<AIPredictionOutput>("prediction", input);
  }

  reviewInterview(input: AIReviewInput): Promise<InterviewAnalysis> {
    return this.post<InterviewAnalysis>("review", input);
  }
}

export function createAIProvider(): AIProvider {
  const mode =
    typeof process !== "undefined" &&
    typeof process.env.NEXT_PUBLIC_AI_MODE === "string"
      ? process.env.NEXT_PUBLIC_AI_MODE
      : "mock";
  return mode === "server" ? new ServerAIProvider() : new MockAIProvider();
}

export const AI_MODE_LABEL: Record<"mock" | "server", string> = {
  mock: "Mock（本地启发式）",
  server: "Server AI（已配置）",
};
