// =============================================================
// 演示数据（虚构人物「林一」）。
// 所有内容均为虚拟示例，仅用于快速体验页面与流程；
// 加载前会二次确认，且不会自动覆盖真实数据。
// =============================================================

import type {
  DB,
  FollowUpQuestion,
  Interview,
  Job,
  Knowledge,
  Project,
  ResumeSkill,
  SelfIntroduction,
  Todo,
  TranscriptSegment,
} from "@/lib/types";
import { SCHEMA_VERSION } from "@/lib/types";
import { emptyResume } from "@/lib/factories";
import { nowISO, todayISO, uid } from "@/lib/utils";
import { analyzeJobMatchCore } from "@/services/ai/mock/jobMatch";
import { generateFollowUpsCore } from "@/services/ai/mock/followUps";
import { reviewInterviewCore } from "@/services/ai/mock/review";

function daysAgo(n: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

export function buildDemoDB(): DB {
  const t = (name: string) => uid(name);

  // ---------------- 简历（虚构） ----------------
  const resumeSkills: ResumeSkill[] = [
    { id: t("skill"), name: "信息流广告投放", level: "熟练", category: "投放" },
    { id: t("skill"), name: "巨量引擎", level: "熟练", category: "投放" },
    { id: t("skill"), name: "人群定向", level: "熟练", category: "投放" },
    { id: t("skill"), name: "素材策略", level: "熟练", category: "创意" },
    { id: t("skill"), name: "数据分析", level: "熟练", category: "数据" },
    { id: t("skill"), name: "SQL", level: "熟悉", category: "数据" },
    { id: t("skill"), name: "A/B 实验设计", level: "熟悉", category: "数据" },
    { id: t("skill"), name: "休闲游戏运营", level: "熟悉", category: "游戏" },
    { id: t("skill"), name: "游戏策划基础", level: "入门", category: "游戏" },
    { id: t("skill"), name: "达人营销", level: "熟悉", category: "营销" },
    { id: t("skill"), name: "Excel / BI 看板", level: "熟练", category: "数据" },
  ];

  const resume = {
    ...emptyResume(),
    name: "林一（演示）",
    headline: "游戏行业增长运营 · 商业化投放方向",
    city: "上海",
    email: "demo@example.com",
    summary:
      "3 年互联网增长与商业化投放经验，主攻信息流广告投放、素材策略与投放数据分析；" +
      "近一年聚焦短剧与休闲游戏买量，擅长从数据出发做人群定向与素材迭代。",
    experiences: [
      {
        id: t("exp"),
        company: "星光互娱（演示）",
        role: "高级投放运营",
        start: "2023-06",
        end: "至今",
        summary: "负责短剧/内容产品在巨量引擎的信息流投放，管理月消耗千万级账户。",
        highlights: ["人群定向优化", "素材 A/B 框架", "投放数据日报自动化"],
      },
      {
        id: t("exp"),
        company: "柠檬游戏（演示）",
        role: "发行运营（买量方向）",
        start: "2021-08",
        end: "2023-05",
        summary: "负责休闲游戏冷启动买量：投放、素材脚本、达人营销与回收模型。",
        highlights: ["休闲游戏 UA", "IAA 变现回收", "达人素材合作"],
      },
    ],
    skills: resumeSkills,
    targetRoles: ["商业化运营", "广告投放", "增长运营", "游戏运营", "游戏策划"],
    targetIndustries: ["互联网广告", "游戏", "短剧 / 内容"],
    targetCompanies: ["字节跳动", "腾讯", "快手", "点点互动", "米哈游"],
    education: [
      {
        id: t("edu"),
        school: "上海某大学（演示）",
        major: "市场营销",
        degree: "本科",
        start: "2016-09",
        end: "2020-06",
        note: "",
      },
    ],
  };

  // ---------------- 项目库（虚构） ----------------
  const makeProject = (partial: Partial<Project> & Pick<Project, "name">): Project => ({
    id: t("proj"),
    createdAt: daysAgo(60),
    updatedAt: daysAgo(2),
    company: "",
    type: "work",
    startDate: "2023-06",
    endDate: "",
    background: "",
    goal: "",
    responsibility: "",
    actions: [],
    result: "",
    data: "",
    challenges: "",
    decisions: "",
    reflection: "",
    skills: [],
    tools: [],
    tags: [],
    interviewQuestions: [],
    ...partial,
  });

  const pShortVideo = makeProject({
    name: "红果短剧投放增长优化（演示）",
    company: "星光互娱（演示）",
    type: "work",
    startDate: "2024-01",
    endDate: "2024-06",
    background:
      "红果短剧处于付费投放回收紧张期：成本上升、付费回收周期拉长。团队需要在不砍量的前提下优化回收。",
    goal: "把付费 ROI 从 0.92 提升到 1.05 以上，同时稳定放量规模。",
    responsibility:
      "负责整体投放策略与数据分析：搭建人群分层、制定素材实验节奏、输出周度复盘并向业务侧汇报。",
    actions: [
      "把大盘人群拆成拉新/召回/高价值三层，分别设定出价策略",
      "搭建素材 A/B 实验框架：同人群比素材、同素材比定向",
      "与内容团队共建『黄金 3 秒』脚本模板，批量生产测试素材",
    ],
    result:
      "付费 ROI 稳定在 1.06-1.12，投放量保持增长；素材测试周期从 14 天缩短到 9 天。",
    data: "消耗周环比 +23%；付费 ROI 0.92 → 1.06；DNU +5%；付费成本 -12%（口径：自然+付费混合，周维度）。",
    challenges:
      "短剧素材衰减快，单一素材生命周期只有 3-5 天；且付费数据回传延迟，实验结论经常滞后。",
    decisions:
      "选择先做人群分层而不是先扩素材量：因为成本结构恶化主要来自高价值人群被低价泛流量稀释；验证方式是同素材下对比定向 A/B。",
    reflection:
      "如果重做，会在第一天就把实验框架定好，并推动数据侧做实时回传，避免用滞后数据做快决策。",
    skills: ["信息流广告投放", "巨量引擎", "人群定向", "素材策略", "A/B 实验", "数据分析"],
    tools: ["巨量引擎后台", "Excel", "DataRangers", "内部 BI"],
    tags: ["短剧", "投放优化", "ROI", "人群定向", "素材实验"],
  });

  const pGameLaunch = makeProject({
    name: "休闲游戏《合成小岛》冷启动增长（演示）",
    company: "柠檬游戏（演示）",
    type: "work",
    startDate: "2022-03",
    endDate: "2022-10",
    background:
      "合成类休闲游戏上线 iOS + Android，需要以可控成本获得首波高价值玩家并验证 IAA/IAP 混合变现模型。",
    goal: "首月 DAU 达 30 万、次留 ≥ 32%，混合回收模型在 60 天内跑正。",
    responsibility:
      "负责买量投放与变现侧数据联动：拆解 LTV 曲线、制定分渠道出价、组织达人素材投放。",
    actions: [
      "分渠道建模 eCPI vs 首日/7 日 LTV，做买量预算的周级分配",
      "把达人口播+玩法展示素材按目标用户拆成两组脚本",
      "建立新用户 72 小时行为漏斗，定位留存断点",
    ],
    result:
      "首月 DAU 超目标 12%，次留 33.5%；60 天时 iOS 混合回收模型转正。",
    data: "eCPI 0.45 美元（iOS）；次留 33.5%；7 日 LTV 提升 18%；广告变现占总回收 62%。",
    challenges:
      "素材创意衰减快、达人供给不稳定；变现侧 IAA eCPM 波动导致短期回收测算失真。",
    decisions:
      "选择 iOS 先于 Android 放量：iOS 用户 LTV 更高且回收数据更干净，便于先验证模型再复制到 Android。",
    reflection:
      "早期只盯买量成本，忽略素材脚本和玩法卖点的匹配；后期补上『玩法钩子测试』后成本明显下降。",
    skills: ["休闲游戏运营", "游戏买量", "IAA 变现", "达人营销", "LTV 建模", "数据分析"],
    tools: ["AppLovin", "Adjust", "Excel", "内部 BI"],
    tags: ["休闲游戏", "冷启动", "UA", "混合变现", "达人素材"],
  });

  const pMaterialLab = makeProject({
    name: "投放素材 A/B 测试框架搭建（演示）",
    company: "星光互娱（演示）",
    type: "side_project",
    startDate: "2024-03",
    endDate: "2024-05",
    background:
      "多产品线投放共用一个素材团队，缺少统一的实验语言，结论无法跨项目复用。",
    goal: "用 6 周搭出一套可复用的素材测试 SOP 与结论库。",
    responsibility: "独立设计框架并推动投放、内容、设计三团队执行。",
    actions: [
      "定义素材变量字典（前 3 秒钩子 / 口播结构 / 利益点呈现方式）",
      "制定『变量级实验 + 结果登记』模板，沉淀到共享知识库",
    ],
    result: "结论库沉淀 40+ 条可复用素材结论，新素材命中率提升约 20%。",
    data: "结论复用后测试命中率提升约 20%（口径：素材进入放量阶段的比例，对照组为框架前 60 天）。",
    challenges: "三团队对『有效素材』定义不一致，前期回收数据格式混乱。",
    decisions:
      "先统一数据登记口径再谈方法论，避免在脏数据上建立结论。",
    reflection:
      "方法论本身不复杂，难的是组织协同；模板和评审节奏比文档更重要。",
    skills: ["素材策略", "A/B 实验", "跨团队协作", "知识沉淀"],
    tools: ["飞书文档", "Excel", "巨量引擎"],
    tags: ["素材方法论", "SOP", "A/B 测试", "知识沉淀"],
  });

  const projects = [pShortVideo, pGameLaunch, pMaterialLab];

  // 预生成部分项目的 AI 追问（演示：展示 Follow-up 功能）
  projects.forEach((p, i) => {
    const follow = generateFollowUpsCore(p);
    p.interviewQuestions = follow.questions.slice(0, i === 0 ? 6 : 5);
  });

  // ---------------- 知识库（虚构内容） ----------------
  const makeKnowledge = (partial: Partial<Knowledge> & Pick<Knowledge, "title" | "content">): Knowledge => ({
    id: t("know"),
    createdAt: daysAgo(30, 9),
    updatedAt: daysAgo(1),
    category: "platform",
    tags: [],
    source: "manual",
    sourceUrl: "",
    relatedCompany: "",
    relatedRole: "",
    relatedProjectIds: [],
    importance: 3,
    ...partial,
  });

  const knowledge: Knowledge[] = [
    makeKnowledge({
      title: "巨量引擎产品体系总览（演示）",
      content:
        "巨量引擎覆盖流量、广告产品与数据产品：核心投放端为巨量广告（原巨量引擎），数据端为巨量算数/DataRangers。" +
        "主力流量包括抖音、今日头条、番茄小说、穿山甲联盟。商业化模式以竞价广告为主。",
      category: "platform",
      tags: ["字节", "巨量引擎", "广告产品"],
      relatedCompany: "字节跳动",
      relatedRole: "商业化运营",
      importance: 5,
    }),
    makeKnowledge({
      title: "竞价广告与 eCPM 原理（演示）",
      content:
        "竞价广告按 eCPM 排序：eCPM ≈ 出价 × 预估点击率 × 预估转化率（不同目标有差异）。" +
        "广告主能优化的是素材点击率与转化率、出价与目标设定，不是平台底层排序。",
      category: "platform",
      tags: ["竞价", "eCPM", "算法"],
      relatedCompany: "字节跳动",
      relatedRole: "商业化运营",
      importance: 5,
    }),
    makeKnowledge({
      title: "常见计费方式：CPC / CPM / oCPM（演示）",
      content:
        "CPC 按点击计费，CPM 按千次展示计费；oCPM 按转化目标出价，平台自动优化，是效果广告主流。" +
        "投放运营的关键是选对转化目标与出价，而不是盯单次点击成本。",
      category: "role",
      tags: ["计费", "oCPM", "效果广告"],
      relatedRole: "广告投放",
      importance: 4,
    }),
    makeKnowledge({
      title: "投放指标：消耗 / ROI / 回传延迟（演示）",
      content:
        "消耗代表花费；ROI=收入/消耗（口径需统一自然与付费）；回传延迟会影响模型学习，衡量转化需要拉长观察窗口。" +
        "复盘时应区分『账户波动』与『真实策略生效』。",
      category: "platform",
      tags: ["指标", "ROI", "回传"],
      relatedRole: "广告投放",
      importance: 4,
    }),
    makeKnowledge({
      title: "素材『黄金 3 秒』脚本结构（演示）",
      content:
        "前 3 秒需要完成：场景冲突/悬念 → 利益点提示。短视频素材的完播率比精致度更影响 eCPM。" +
        "常见钩子：结果反差、过程演示、用户证言、价格锚点。",
      category: "marketing_case",
      tags: ["素材", "脚本", "短视频"],
      importance: 4,
    }),
    makeKnowledge({
      title: "短剧行业商业模式（演示）",
      content:
        "短剧链路：内容方制作 → 平台/投流方买量 → 用户免费看前几集后付费解锁。" +
        "核心指标是付费率、付费 ROI、次留；行业争议点包括投流成本占比与内容供给侧瓶颈。",
      category: "industry",
      tags: ["短剧", "商业模式"],
      relatedCompany: "字节跳动",
      importance: 4,
    }),
    makeKnowledge({
      title: "合成类休闲游戏核心循环（演示）",
      content:
        "合成玩法核心循环：收集物品 → 合成升级 → 解锁新场景/任务 → 获得更多物品。" +
        "长线靠活动与目标感（如花园建造、限时订单），变现以 IAA（激励视频）为主。",
      category: "game_design_case",
      tags: ["合成", "休闲游戏", "核心循环"],
      relatedRole: "游戏策划",
      importance: 4,
    }),
    makeKnowledge({
      title: "休闲游戏混合变现：IAA + IAP（演示）",
      content:
        "IAA 靠激励视频/插屏广告变现，IAP 卖去广告/道具/月卡。混合变现需要按用户分层设计：" +
        "付费用户减少广告打扰，免费用户用激励视频换资源。关键指标是 eCPM、付费率与 LTV 曲线。",
      category: "game_design_case",
      tags: ["混合变现", "IAA", "IAP"],
      importance: 4,
    }),
    makeKnowledge({
      title: "面试回答结构：B-G-A-R（演示）",
      content:
        "描述经历用四段式：Background（背景与矛盾）→ Goal（目标与约束）→ Action（我的行动，区分我/团队）→ Result（结果 + 数据口径）。" +
        "面试官追问决策时补 Challenge → Decision → Reflection。",
      category: "interview_experience",
      tags: ["面试方法", "STAR", "B-G-A-R"],
      importance: 5,
    }),
  ];

  // ---------------- 岗位库（虚构） ----------------
  const makeJob = (partial: Partial<Job> & Pick<Job, "company" | "position" | "jd">): Job => ({
    id: t("job"),
    createdAt: daysAgo(6),
    updatedAt: nowISO(),
    source: "BOSS直聘",
    location: "",
    salary: "",
    url: "",
    status: "to_apply",
    appliedAt: "",
    matchScore: null,
    matchAnalysis: null,
    interviewDate: "",
    notes: "",
    ...partial,
  });

  const jdByte = `
【字节跳动-商业化广告运营（巨量引擎方向）】
岗位职责：
1. 负责商业化广告产品的运营与投放策略支持，协同销售与产品推动客户增长；
2. 深入理解客户投放诉求，输出投放方案与素材优化建议；
3. 通过数据分析定位投放问题，形成方法论并规模化。
任职要求：
- 熟悉信息流广告投放与竞价逻辑（oCPM/ecPM、人群定向、素材实验）；
- 具备较强的数据分析能力，能独立完成投放复盘；
- 对抖音/巨量生态、短剧或内容行业有理解优先。
`.trim();

  const jdTencent = `
【腾讯广告-效果广告运营】
职责：
- 面向效果广告客户提供账户优化与行业运营支持；
- 结合行业玩法输出投放方法论，提升客户消耗与 ROI；
- 协同产品团队推动广告产品工具落地。
要求：
- 2 年以上效果广告/商业化运营经验；
- 熟悉投放后台、素材策略、转化优化；
- 数据敏感，会 SQL/Excel 分析优先；了解微信生态加分。
`.trim();

  const jdGame = `
【点点互动-创意游戏策划】
职责：
- 参与休闲/创意游戏从原型到上线玩法设计与调优；
- 负责核心循环、活动与商业化（IAA/IAP）设计；
- 用数据迭代玩法，输出设计文档。
要求：
- 热爱游戏，有休闲游戏策划或运营经验；
- 了解合成/消除/模拟类玩法的核心循环与变现逻辑；
- 具备数据分析意识，能与发行/投放团队协作。
`.trim();

  const jdKuaishou = `
【快手商业化-行业运营（短剧/内容）】
职责：负责短剧行业客户运营，推动客户投放增长与素材供给优化；跨团队协同产品、销售与内容方。
要求：熟悉短剧/内容行业投放；数据驱动；2 年以上效果广告行业运营经验。
`.trim();

  const jobs: Job[] = [
    makeJob({
      company: "字节跳动",
      position: "商业化广告运营（巨量引擎方向）",
      jd: jdByte,
      source: "官网内推",
      location: "北京 / 上海",
      salary: "25-40K·16薪",
      status: "interview_1",
      appliedAt: daysAgo(5),
      interviewDate: daysAgo(1, 14),
      notes: "一面已结束，等待反馈；重点准备竞价机制与素材方法论。",
      createdAt: daysAgo(8),
    }),
    makeJob({
      company: "腾讯",
      position: "效果广告运营（游戏行业向）",
      jd: jdTencent,
      source: "BOSS直聘",
      location: "深圳",
      salary: "20-35K·14薪",
      status: "to_apply",
      appliedAt: "",
      createdAt: daysAgo(3),
      notes: "待投递：简历需要按游戏行业版本微调。",
    }),
    makeJob({
      company: "点点互动",
      position: "创意游戏策划",
      jd: jdGame,
      source: "内推",
      location: "北京",
      salary: "22-38K",
      status: "applied",
      appliedAt: daysAgo(2),
      createdAt: daysAgo(5),
      notes: "已投递，等待笔试通知。",
    }),
    makeJob({
      company: "快手",
      position: "商业化行业运营（短剧）",
      jd: jdKuaishou,
      source: "猎头",
      location: "北京",
      salary: "24-40K·16薪",
      status: "to_apply",
      appliedAt: "",
      createdAt: daysAgo(2),
      notes: "与字节方向重合，优先准备字节。",
    }),
  ];

  // 为演示岗位预生成匹配报告（内容来自上面的分析引擎）
  jobs.forEach((job) => {
    const analysis = analyzeJobMatchCore({
      company: job.company,
      position: job.position,
      jd: job.jd,
      resume,
      projects,
      knowledge,
    });
    job.matchAnalysis = analysis;
    job.matchScore = analysis.score;
  });

  // ---------------- Todo（虚构） ----------------
  const makeTodo = (partial: Partial<Todo> & Pick<Todo, "title">): Todo => ({
    id: t("todo"),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    description: "",
    priority: "medium",
    deadline: "",
    completed: false,
    completedAt: "",
    source: "manual",
    relatedJobId: "",
    relatedInterviewId: "",
    gapType: null,
    ...partial,
  });

  const todos: Todo[] = [
    makeTodo({
      title: "把红果项目的素材归因结论整理成 1 页文档",
      description: "JD Match 复盘发现：素材变化与人群优化的归因解释还不够清楚。",
      priority: "high",
      source: "job_match",
      relatedJobId: jobs[0].id,
    }),
    makeTodo({
      title: "补充腾讯广告产品体系知识",
      description: "准备腾讯一面：重点梳理广告产品线、微信生态投放能力。",
      priority: "medium",
      source: "manual",
      deadline: daysAgo(0),
    }),
    makeTodo({
      title: "试讲 90 秒自我介绍（游戏策划版）",
      priority: "low",
      source: "manual",
    }),
    makeTodo({
      title: "完善《合成小岛》留存断点分析",
      description: "把 72 小时行为漏斗的结论补进项目记录。",
      priority: "medium",
      completed: true,
      completedAt: daysAgo(1, 20),
      source: "system",
    }),
  ];

  // ---------------- 自我介绍（虚构） ----------------
  const makeIntro = (partial: Partial<SelfIntroduction>): SelfIntroduction => ({
    id: t("intro"),
    createdAt: daysAgo(12),
    updatedAt: daysAgo(1),
    title: "商业化投放 / 广告运营 90 秒",
    role: "商业化运营",
    scene: "字节、腾讯等效果广告运营岗一面",
    version: "90s",
    content: `面试官好，我叫林一（演示），目前在做短剧与游戏方向的商业化投放。

过去三年我做了两件事：一是把红果短剧的投放从『看消耗』带向『看回收』——通过人群分层与素材 A/B 框架，把付费 ROI 从 0.92 做到 1.06，素材测试周期缩短 5 天；
二是在休闲游戏冷启动中打通买量与变现数据，用 LTV 模型决定渠道预算，60 天跑通混合回收模型。

我理解这个岗位的核心是：懂产品、懂客户、更懂数据。我可以把投放方法论和客户场景结合，也能用数据讲清楚每一笔消耗为什么值得。`,
    highlights: ["人群定向 + 素材 A/B 框架", "ROI 0.92 → 1.06", "休闲游戏混合变现 60 天跑正"],
    projectIds: [pShortVideo.id, pGameLaunch.id],
    lastUsedAt: daysAgo(1, 9),
  });

  const selfIntroductions = [
    makeIntro({}),
    makeIntro({
      title: "游戏策划 / 创意策划 60 秒",
      role: "游戏策划",
      scene: "点点互动等创意游戏策划岗",
      version: "60s",
      content: `面试官好，我是林一（演示），一名在游戏发行侧做了两年的运营，正在往策划方向沉淀。

我做过《合成小岛》的冷启动：从投放端反推玩法卖点，拆过次留、LTV 和广告变现结构，也参与过活动与核心循环讨论。我的优势是：懂玩家数据，能把『策划想法』翻译成『可验证的实验』。

我希望把发行侧的反馈能力带进策划流程，让每个玩法改动都有数据闭环。`,
      highlights: ["发行视角做策划", "数据闭环意识"],
      projectIds: [pGameLaunch.id],
      lastUsedAt: "",
    }),
  ];

  // ---------------- 面试记录（虚构） ----------------
  const seg = (
    start: number | null,
    speakerLabel: string,
    role: TranscriptSegment["role"],
    text: string
  ): TranscriptSegment => ({
    id: t("seg"),
    startSec: start,
    endSec: null,
    speakerLabel,
    role,
    text,
  });

  const demoInterview: Interview = {
    id: t("interview"),
    createdAt: daysAgo(1, 19),
    updatedAt: daysAgo(1, 19),
    company: "字节跳动",
    position: "商业化广告运营",
    round: "interview_1",
    date: daysAgo(1),
    interviewer: "王老师（演示）",
    notes: "一面复盘：整体还行，数据口径和穿山甲知识需要补。",
    audio: null,
    transcriptStatus: "transcribed",
    transcriptMode: "mock",
    transcript: [
      seg(0, "面试官", "interviewer", "先做一下自我介绍吧。"),
      seg(6, "候选人", "candidate",
        "好的。我做短剧和游戏投放三年，最近在红果短剧项目做投放优化：把人群拆成三层分别出价，搭了素材 A/B 框架，付费 ROI 从 0.92 提到 1.06，素材测试周期从 14 天缩短到 9 天。"),
      seg(52, "面试官", "interviewer", "你说 ROI 从 0.92 到 1.06，这个是怎么算的？口径是什么？"),
      seg(70, "候选人", "candidate",
        "我们按自然加付费混合口径，周维度统计收入除以消耗。这个数字是投放后台回传的收入，和财务对过账。"),
      seg(105, "面试官", "interviewer", "那你怎么证明提升是人群优化带来的，而不是素材或者大盘季节因素？"),
      seg(128, "候选人", "candidate",
        "这个其实是我们项目里最有争议的部分……我们做了同素材比定向的实验，但样本周期比较短，坦白说归因还做不到很干净。"),
      seg(185, "面试官", "interviewer", "穿山甲联盟目前的流量规模和分成模式你了解吗？对短剧投放意味着什么？"),
      seg(210, "候选人", "candidate",
        "穿山甲是字节的联盟广告平台，覆盖大量中长尾 App 流量。对短剧这种需要高转化素材的品类，联盟流量单价低但回传和素材适配要求高，我们目前主要用主站流量。"),
      seg(268, "面试官", "interviewer", "如果让你入职后第一个月推进商业化产品在游戏行业落地，你会怎么拆解这件事？"),
      seg(301, "候选人", "candidate",
        "我会先盘行业客户的消耗结构和增长瓶颈：是供给素材不够，还是产品工具没覆盖场景；然后选 2-3 个标杆客户做深，沉淀出案例和方法论再规模化。"),
    ],
    analysis: null,
    todoIds: [],
  };

  // 预生成面试复盘（与用户点击按钮得到的分析一致）
  const analysis = reviewInterviewCore({
    interview: demoInterview,
    resume,
    projects,
    knowledge,
  });
  demoInterview.analysis = analysis;

  return {
    schemaVersion: SCHEMA_VERSION,
    resume,
    projects,
    jobs,
    interviews: [demoInterview],
    knowledge,
    todos,
    selfIntroductions,
    settings: { dailyApplyTarget: 3 },
    meta: { demoLoadedAt: nowISO() },
  };
}
