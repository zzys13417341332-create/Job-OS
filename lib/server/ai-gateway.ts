// =============================================================
// 服务端 AI 网关（真实 LLM 接入点）。
// 仅在服务端运行：读取 AI_API_KEY 环境变量，绝不暴露给前端。
// 未配置 Key 时返回明确错误，前端会显示"未配置"而不是静默失败。
// =============================================================

const ACTION_SYSTEM_PROMPTS: Record<string, string> = {
  "job-match":
    "你是资深招聘顾问与求职教练。基于用户提供的 JD、简历、项目库、知识库做匹配分析。" +
    "只能引用用户数据中真实存在的内容，禁止编造简历、项目、数据。资料不足时在 weaknesses / summary 中明确说明。",
  "follow-ups":
    "你是面试官模拟器。根据用户提供的单个项目记录，预测面试官最可能追问的问题。" +
    "只能基于项目已有字段生成问题；某个字段为空则不要生成依赖该字段的问题，可在 notes 中提示先补充资料。",
  prediction:
    "你是面试教练。根据 JD、简历、项目库预测最可能被问到的项目与问题，输出准备清单。" +
    "推荐项目必须来自用户提供的项目库，不得虚构。",
  review:
    "你是面试复盘教练。根据面试转写（Interviewer/候选人分段）、项目库、知识库、简历，提取问题、评价回答、检测缺口。" +
    "区分 Knowledge Gap（知识库缺失）、Project Gap（项目记录缺失）、Expression Gap（资料存在但未表达）、Data Gap（数据口径不足）。" +
    "输出必须与输入数据完全对应，禁止虚构用户经历。",
};

interface GatewaySuccess<T> {
  ok: true;
  data: T;
}

interface GatewayFailure {
  ok: false;
  error: string;
}

export async function runAIGateway<T>(
  action: string,
  payload: unknown
): Promise<GatewaySuccess<T> | GatewayFailure> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "服务端未配置 AI_API_KEY。当前为本地 Mock 模式；如需真实 AI，请在 .env.local 配置 AI_API_KEY 并将 NEXT_PUBLIC_AI_MODE 设为 server。",
    };
  }

  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gpt-4.1-mini";
  const system = ACTION_SYSTEM_PROMPTS[action];

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${system}\n请只返回符合调用方要求的 JSON 对象，不要输出多余文字。`,
          },
          {
            role: "user",
            content: JSON.stringify(payload),
          },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `AI 服务返回错误（HTTP ${res.status}）：${body.slice(0, 200)}` };
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return { ok: false, error: "AI 服务未返回内容。" };
    const parsed = JSON.parse(content) as T;
    return { ok: true, data: parsed };
  } catch (err) {
    return {
      ok: false,
      error: `AI 网关异常：${err instanceof Error ? err.message : "未知错误"}`,
    };
  }
}
