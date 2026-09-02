/**
 * 核心链路冒烟测试（纯 Node，不依赖浏览器）：
 * 1. 演示数据库结构完整性（无 NaN / undefined、字段互通）
 * 2. 空库 + 空资料下 Mock AI 不崩溃、不虚构
 * 3. 面试复盘 Mock 核心（问题提取 / 分维度 / Gap）
 * 运行：pnpm tsx scripts/smoke.ts
 */

import { buildDemoDB } from "../services/storage/seed";
import { emptyDB, defaultProjectDraft } from "../lib/factories";
import { analyzeJobMatchCore } from "../services/ai/mock/jobMatch";
import { generateFollowUpsCore } from "../services/ai/mock/followUps";
import { reviewInterviewCore } from "../services/ai/mock/review";
import { predictInterviewCore } from "../services/ai/mock/prediction";
import { SCHEMA_VERSION } from "../lib/types";
import type { Project } from "../lib/types";

function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error(`✗ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${msg}`);
  }
}

// ---------- 1. Demo DB ----------
const demo = buildDemoDB();
assert(demo.schemaVersion === SCHEMA_VERSION, "Demo DB schemaVersion 正确");
assert(demo.projects.length === 3, "Demo 项目库 3 条");
assert(demo.jobs.length === 4, "Demo 岗位 4 条");
assert(demo.interviews.length === 1, "Demo 面试 1 条");
assert(demo.knowledge.length === 9, "Demo 知识卡片 9 条");
assert(demo.todos.length === 4, "Demo Todo 4 条");
assert(demo.jobs.every((j) => typeof j.matchScore === "number" && !Number.isNaN(j.matchScore)), "Demo 岗位匹配度无 NaN");
assert(demo.interviews[0].analysis !== null, "Demo 面试已预生成复盘");
assert((demo.interviews[0].analysis?.gaps.length ?? 0) > 0, "Demo 复盘包含缺口建议");
assert(demo.projects.every((p) => p.interviewQuestions.length > 0), "Demo 项目已有 AI 追问");

// 数据互通：Todo 引用面试/岗位 id 存在
const withRefs = demo.todos.filter((t) => t.relatedJobId || t.relatedInterviewId);
for (const todo of withRefs) {
  if (todo.relatedJobId) assert(demo.jobs.some((j) => j.id === todo.relatedJobId), "Todo→Job 引用有效");
  if (todo.relatedInterviewId) assert(demo.interviews.some((i) => i.id === todo.relatedInterviewId), "Todo→Interview 引用有效");
}

// ---------- 2. 空资料 + Mock AI 稳定性 ----------
const empty = emptyDB();
const emptyMatch = analyzeJobMatchCore({
  company: "某公司",
  position: "运营",
  jd: "负责广告投放与数据优化，至少三年相关经验，熟悉信息流、素材策略与转化提升，能独立复盘。",
  resume: empty.resume,
  projects: empty.projects,
  knowledge: empty.knowledge,
});
assert(typeof emptyMatch.score === "number" && !Number.isNaN(emptyMatch.score), "空资料匹配分不崩溃");
assert(emptyMatch.weaknesses.some((w) => /Resume|简历/.test(w)), "空资料提示补简历");
assert(emptyMatch.recommendedProjectIds.length === 0, "空项目库不推荐任何项目（不虚构）");

// 空项目生成追问：应提示补字段而不是编造数据问题
const emptyProject: Project = {
  ...defaultProjectDraft({ name: "测试项目" }),
  id: "proj-empty-test",
};
const follow = generateFollowUpsCore(emptyProject);
assert(follow.questions.length > 0, "空字段项目仍生成基础/压力问题");
assert(!follow.questions.some((q) => q.category === "data"), "无数据字段时不生成数据类问题");
assert(follow.notes.some((n) => /data/.test(n)), "提示先补充数据字段");

// ---------- 3. 复盘核心：占位转写 ----------
const review = reviewInterviewCore({
  interview: {
    company: "示例科技",
    position: "增长运营",
    round: "interview_1",
    transcript: [
      { id: "s1", startSec: 0, endSec: null, speakerLabel: "面试官", role: "interviewer", text: "先做个自我介绍吧。" },
      { id: "s2", startSec: 5, endSec: null, speakerLabel: "候选人", role: "candidate", text: "我做了三年增长相关工作，负责过投放项目……（占位）" },
      { id: "s3", startSec: 20, endSec: null, speakerLabel: "面试官", role: "interviewer", text: "这个项目的数据结果怎么计算的？" },
      { id: "s4", startSec: 30, endSec: null, speakerLabel: "候选人", role: "candidate", text: "整体效果还可以，我们做了优化之后有明显提升。（无数字，会触发 Data Gap）" },
      { id: "s5", startSec: 50, endSec: null, speakerLabel: "面试官", role: "interviewer", text: "穿山甲的流量分成模式你了解吗？" },
      { id: "s6", startSec: 70, endSec: null, speakerLabel: "候选人", role: "candidate", text: "了解得还不多……（知识缺口应出现）" },
    ],
  },
  resume: empty.resume,
  projects: [
    {
      ...defaultProjectDraft({ name: "红果投放（本地记录）", data: "ROI 0.92→1.06（周维度）" }),
      id: "proj-review-test",
    },
  ],
  knowledge: [],
});
assert(review.questions.length >= 3, "复盘提取出问题");
assert(review.ratings.every((r) => r.aspects.length === 5), "每题 5 个评价维度");
assert(review.gaps.some((g) => g.type === "data"), "无数字回答 → Data Gap");
assert(review.gaps.some((g) => g.type === "knowledge"), "未知知识点 → Knowledge Gap");

// ---------- 4. 预测核心 ----------
const prediction = predictInterviewCore({
  company: "字节跳动",
  position: "商业化运营",
  jd: "负责商业化广告运营，熟悉信息流投放与竞价逻辑，数据敏感，能输出投放方法论。",
  resume: demo.resume,
  projects: demo.projects,
  knowledge: demo.knowledge,
});
assert(prediction.topProjects.length > 0, "预测推荐了项目库中的真实项目");
assert(prediction.questions.length >= 5, "预测生成问题清单");
assert(prediction.checklist.length > 0, "预测生成准备清单");

console.log("\n冒烟测试完成。");
