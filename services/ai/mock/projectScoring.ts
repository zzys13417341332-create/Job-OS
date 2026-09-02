import type { Project } from "@/lib/types";
import { joinText, matchedScore, matchedTerms, tokenize } from "./engine";

/** 项目的可检索全文（用于与 JD/问题匹配） */
export function projectSearchText(p: Project): string {
  return joinText(
    [
      p.name,
      p.company,
      p.background,
      p.goal,
      p.responsibility,
      p.actions.join(" "),
      p.result,
      p.data,
      p.challenges,
      p.decisions,
      p.reflection,
      p.skills.join(" "),
      p.tools.join(" "),
      p.tags.join(" "),
    ],
    " "
  );
}

export interface ScoredProject {
  project: Project;
  score: number; // 0-100
  matched: string[];
}

/** 计算项目与 JD 的匹配得分（重叠 + 关键字段加权） */
export function scoreProjects(jd: string, projects: Project[]): ScoredProject[] {
  if (!jd.trim() || projects.length === 0) return [];
  const jdTokens = tokenize(jd);
  const results = projects.map((project) => {
    const text = projectSearchText(project);
    if (!text) return { project, score: 0, matched: [] as string[] };
    // 短查询（面试问题）与长文本（项目记录）匹配时，
    // 对称 Jaccard 会被长文本稀释；改用"查询词覆盖率"兜底。
    const jaccard = matchedScore(jd, text);
    const coverage = queryCoverage(jd, text);
    const base = Math.max(jaccard, Math.round(coverage * 0.42));
    // 名称与标签命中给予额外权重，模拟"更相关字段优先"
    const head = joinText([project.name, project.company, project.tags.join(" ")], " ");
    const headScore = matchedScore(jd, head);
    let weighted = base * 0.72 + headScore * 0.28;
    const skillHits = matchedTerms(text, jd).length;
    if (skillHits >= 3) weighted += 4;
    if (jdTokens.has("数据") && project.data) weighted += 3;
    if (jdTokens.has("决策") && project.decisions) weighted += 2;
    return {
      project,
      score: Math.min(98, Math.round(weighted)),
      matched: matchedTerms(text, jd).slice(0, 6),
    };
  });
  return results.sort((a, b) => b.score - a.score);
}

/** 查询词在语料中的覆盖率（0-100） */
export function queryCoverage(query: string, corpus: string): number {
  const qTokens = tokenize(query);
  if (qTokens.size === 0) return 0;
  const corpusTokens = tokenize(corpus);
  let hit = 0;
  for (const t of qTokens) {
    if (corpusTokens.has(t)) hit++;
  }
  return Math.min(100, Math.round((hit / qTokens.size) * 1000));
}

export function topProjects(jd: string, projects: Project[], n = 3): ScoredProject[] {
  return scoreProjects(jd, projects)
    .filter((s) => s.score >= 25)
    .slice(0, n);
}
