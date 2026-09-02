import type { FollowUpQuestion, Project } from "@/lib/types";
import { FOLLOW_UP_CATEGORY_LABELS } from "@/lib/constants";
import { uid } from "@/lib/utils";
import { excerpt, numberClues, pickBySeed } from "./engine";
import type { AIFollowUpOutput } from "../types";

function q(category: FollowUpQuestion["category"], question: string, note?: string): FollowUpQuestion {
  return { id: uid("fuq"), category, question, note };
}

/**
 * 针对单个项目预测面试追问（Mock 核心，纯函数）。
 * 每类问题都依赖项目里真实存在的内容字段：
 * 没有数据的项目不会生成数据类问题，而是提示先补字段。
 */
export function generateFollowUpsCore(project: Project): AIFollowUpOutput {
  const notes: string[] = [];
  const questions: FollowUpQuestion[] = [];
  const p = project;

  // 基础问题：永远可以问
  questions.push(
    q("basic", `请用 2 分钟介绍「${p.name || "这个项目"}」：背景、你的角色、目标与结果。`,
      "建议按 Background → Goal → Action → Result 四段式组织")
  );

  // 项目细节
  if (p.responsibility.trim() || p.actions.length) {
    questions.push(
      q("detail", `在「${p.name}」中你具体负责什么？哪些是你独立决策、哪些是协作完成？`,
        "重点区分『我做的』与『团队做的』")
    );
    questions.push(
      q("detail", `把「${p.name}」按时间线拆开：开始时的核心矛盾是什么？中途发生了什么变化？`,
        "体现项目推进过程，而不是只讲结论")
    );
  } else {
    notes.push("项目缺少「职责与行动」记录，未生成更多细节类问题；建议补充 responsibility / actions。");
  }

  // 数据问题（只在该项目有数据成果时生成）
  const clues = numberClues(p.data);
  if (p.data.trim()) {
    const sample = clues[0] ?? "效果数字";
    questions.push(
      q("data", `你说「${p.name}」带来了${sample}的提升——这个数字是怎么算出来的？基线、周期、统计口径分别是什么？`)
    );
    questions.push(
      q("data", `这个结果如何拆解归因？有没有做过剔除其他变量的验证（如 A/B、同期对比）？`)
    );
  } else {
    notes.push("项目没有填写 data（数据成果），未生成数据口径类问题——面试官大概率会问，建议补上。");
  }

  // 决策问题
  if (p.decisions.trim()) {
    questions.push(
      q("decision", `做「${p.name}」时你面临的最大取舍是什么？为什么选择 A 而不是 B？`,
        "决策类问题考验判断框架：约束条件 → 选项 → 选择依据 → 验证")
    );
  } else {
    notes.push("缺少 decisions（关键决策），未生成决策类问题；请补上『当时为什么这么做』。");
  }

  // 挑战问题
  if (p.challenges.trim()) {
    questions.push(q("challenge", `「${p.name}」推进中最难的一环是什么？你当时卡在哪里、如何突破？`));
  } else {
    notes.push("缺少 challenges（难点），未生成挑战类问题；建议补写 1-2 个真实难点。");
  }

  // 反事实问题（有结果/复盘内容时才更有意义）
  if (p.result.trim() || p.reflection.trim() || p.data.trim()) {
    questions.push(
      q("counterfactual", `如果「${p.name}」重做一次，你会保留什么、放弃什么？基于哪些证据？`)
    );
    questions.push(
      q("counterfactual", `如果当时效果不升反降，你的排查顺序是什么？（反事实推演，检验你对因果的理解）`)
    );
  }

  // 压力问题：从项目最薄弱字段切入
  const weakFields: string[] = [];
  if (!p.data.trim()) weakFields.push("没有数据成果");
  if (!p.decisions.trim()) weakFields.push("缺少决策依据记录");
  if (!p.challenges.trim()) weakFields.push("没有写明难点");
  if (!p.reflection.trim()) weakFields.push("没有复盘反思");
  const weakPoint = weakFields.length
    ? weakFields[p.name.length % weakFields.length]
    : "数据不够漂亮";
  questions.push(
    q("pressure", `有面试官可能追问：「${p.name || "这个项目"}看起来${weakPoint}，你觉得它真的算成功吗？」你如何回应？`)
  );

  // 控制在合理数量（按类别去重并排序展示）
  const stable = pickBySeed(p.id || p.name, questions, 7);
  const ordered = stable.sort((a, b) => {
    const order: Record<string, number> = {
      basic: 0,
      detail: 1,
      data: 2,
      decision: 3,
      challenge: 4,
      counterfactual: 5,
      pressure: 6,
    };
    return order[a.category] - order[b.category];
  });

  return {
    version: "mock",
    questions: ordered.map((item) => ({
      ...item,
      note: `${FOLLOW_UP_CATEGORY_LABELS[item.category]}${item.note ? ` · ${item.note}` : ""}`,
    })),
    notes,
  };
}
