"use client";

import { PageHeader } from "./PageHeader";
import { MatchWorkbench } from "@/components/match/MatchWorkbench";

export function MatchPage() {
  return (
    <div>
      <PageHeader
        eyebrow="AI 工作台"
        title="AI JD Match"
        description="粘贴一个完整 JD，系统结合简历、项目库与知识库判断：匹配度多少、值不值得投、重点突出哪些项目、还缺什么。"
      />
      <MatchWorkbench />
    </div>
  );
}
