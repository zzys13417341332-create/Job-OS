"use client";

import { useRef, useState } from "react";
import { Check, GraduationCap, Plus, Trash2, UserRound } from "lucide-react";
import type { EducationItem, ExperienceItem, ResumeSkill } from "@/lib/types";
import { newEducation, newExperience, newSkill } from "@/lib/factories";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/Button";
import {
  Badge,
  Field,
  Input,
  Panel,
  Select,
  Textarea,
} from "@/components/ui/Primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { TagsEditor } from "@/components/ui/TagsEditor";
import { cn } from "@/lib/utils";

export function ResumePage({ embedded = false }: { embedded?: boolean } = {}) {
  const { db, api } = useData();
  const { toast } = useToast();
  const resume = db.resume;
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = (patch: Parameters<typeof api.saveResume>[0], silent = false) => {
    setSaveState("saving");
    api.saveResume(patch);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveState("saved");
      if (!silent) toast("Resume Profile 已自动保存。");
      setTimeout(() => setSaveState("idle"), 1600);
    }, 240);
  };

  const updateExp = (id: string, patch: Partial<ExperienceItem>) => {
    save({
      experiences: resume.experiences.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  };
  const updateEdu = (id: string, patch: Partial<EducationItem>) => {
    save({ education: resume.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  };
  const updateSkill = (id: string, patch: Partial<ResumeSkill>) => {
    save({ skills: resume.skills.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  };

  return (
    <div className={embedded ? "" : "mx-auto max-w-3xl"}>
      {!embedded ? (
        <PageHeader
          eyebrow="个人资产"
          title="Resume Profile · 个人资料"
          description="JD 匹配、自我介绍与复盘缺口判断都以这里的资料为依据。所有改动自动保存到本机。"
          actions={
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                saveState === "saving" ? "text-amber" : "text-green-deep"
              )}
            >
              {saveState === "saving" ? (
                "保存中…"
              ) : saveState === "saved" ? (
                <>
                  <Check size={13} /> 已保存
                </>
              ) : null}
            </span>
          }
        />
      ) : (
        <p
          className={cn(
            "mb-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
            saveState === "saving"
              ? "border-amber-line bg-amber-soft text-amber"
              : "border-green-line bg-green-soft text-green-deep"
          )}
        >
          {saveState === "saving" ? (
            "保存中…"
          ) : saveState === "saved" ? (
            <>
              <Check size={12} /> 已自动保存
            </>
          ) : (
            "改动自动保存"
          )}
        </p>
      )}

      <Panel className="mb-5 p-5">
        <SectionTitle icon={<UserRound size={14} />} title="基本信息" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="姓名" hint="可留空，仅用于界面称呼">
            <Input value={resume.name} onChange={(e) => save({ name: e.target.value }, true)} placeholder="如：张三" />
          </Field>
          <Field label="一句话定位">
            <Input value={resume.headline} onChange={(e) => save({ headline: e.target.value }, true)} placeholder="如：游戏行业增长运营 · 商业化投放方向" />
          </Field>
          <Field label="城市">
            <Input value={resume.city} onChange={(e) => save({ city: e.target.value }, true)} />
          </Field>
          <Field label="邮箱">
            <Input value={resume.email} onChange={(e) => save({ email: e.target.value }, true)} />
          </Field>
          <Field label="电话">
            <Input value={resume.phone} onChange={(e) => save({ phone: e.target.value }, true)} />
          </Field>
          <Field label="作品集 / 个人主页">
            <Input value={resume.portfolioUrl} onChange={(e) => save({ portfolioUrl: e.target.value }, true)} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="个人简介" hint="AI 匹配会把它当作文本依据">
            <Textarea rows={3} value={resume.summary} onChange={(e) => save({ summary: e.target.value }, true)} />
          </Field>
        </div>
      </Panel>

      <Panel className="mb-5 p-5">
        <SectionTitle title="求职目标" />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="目标岗位" hint="与 JD 匹配相关">
            <TagsEditor value={resume.targetRoles} onChange={(v) => save({ targetRoles: v })} suggestions={["商业化运营", "广告投放", "游戏策划", "游戏运营", "增长运营"]} />
          </Field>
          <Field label="目标行业">
            <TagsEditor value={resume.targetIndustries} onChange={(v) => save({ targetIndustries: v })} suggestions={["互联网广告", "游戏", "短剧 / 内容"]} />
          </Field>
          <Field label="目标公司">
            <TagsEditor value={resume.targetCompanies} onChange={(v) => save({ targetCompanies: v })} suggestions={["字节跳动", "腾讯", "快手", "点点互动", "米哈游"]} />
          </Field>
        </div>
      </Panel>

      {/* 经历 */}
      <Panel className="mb-5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle title="工作 / 实习经历" inline />
          <Button
            size="xs"
            variant="soft"
            icon={<Plus size={12} />}
            onClick={() => save({ experiences: [...resume.experiences, newExperience()] })}
          >
            添加经历
          </Button>
        </div>
        {resume.experiences.length === 0 ? (
          <EmptyState compact title="还没有经历" description="添加后，JD 匹配会把你的经历描述与岗位 JD 做重叠分析。" />
        ) : (
          <div className="space-y-4">
            {resume.experiences.map((exp) => (
              <div key={exp.id} className="rounded-xl border border-line bg-canvas/40 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="公司">
                    <Input value={exp.company} onChange={(e) => updateExp(exp.id, { company: e.target.value })} />
                  </Field>
                  <Field label="岗位 / 角色">
                    <Input value={exp.role} onChange={(e) => updateExp(exp.id, { role: e.target.value })} />
                  </Field>
                  <Field label="开始时间">
                    <Input type="month" value={exp.start} onChange={(e) => updateExp(exp.id, { start: e.target.value })} />
                  </Field>
                  <Field label="结束时间">
                    <Input type="month" value={exp.end} onChange={(e) => updateExp(exp.id, { end: e.target.value })} />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="经历概述">
                    <Textarea rows={2} value={exp.summary} onChange={(e) => updateExp(exp.id, { summary: e.target.value })} />
                  </Field>
                </div>
                <div className="mt-2">
                  <Field label="亮点关键词" hint="如：人群定向、素材 A/B、日报自动化">
                    <TagsEditor value={exp.highlights} onChange={(v) => updateExp(exp.id, { highlights: v })} />
                  </Field>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    size="xs"
                    variant="ghost"
                    icon={<Trash2 size={12} />}
                    onClick={() => {
                      if (window.confirm(`删除经历「${exp.company || exp.role || "未命名"}」？`)) {
                        save({ experiences: resume.experiences.filter((x) => x.id !== exp.id) });
                      }
                    }}
                  >
                    删除这段经历
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* 技能 */}
      <Panel className="mb-5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle title="技能清单" inline />
          <Button
            size="xs"
            variant="soft"
            icon={<Plus size={12} />}
            onClick={() => save({ skills: [...resume.skills, newSkill()] })}
          >
            添加技能
          </Button>
        </div>
        {resume.skills.length === 0 ? (
          <EmptyState compact title="还没有技能" description="技能名称会直接参与 JD 关键词匹配。" />
        ) : (
          <div className="divide-y divide-line">
            {resume.skills.map((skill) => (
              <div key={skill.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <Input
                  className="h-8 flex-1 min-w-[120px]"
                  value={skill.name}
                  onChange={(e) => updateSkill(skill.id, { name: e.target.value })}
                  placeholder="技能名称，如：信息流广告投放"
                />
                <Select
                  className="h-8 w-auto"
                  value={skill.level}
                  onChange={(e) => updateSkill(skill.id, { level: e.target.value as ResumeSkill["level"] })}
                >
                  <option value="入门">入门</option>
                  <option value="熟悉">熟悉</option>
                  <option value="熟练">熟练</option>
                  <option value="精通">精通</option>
                </Select>
                <Input
                  className="h-8 w-24"
                  value={skill.category}
                  onChange={(e) => updateSkill(skill.id, { category: e.target.value })}
                  placeholder="分类"
                />
                <button
                  onClick={() => {
                    if (window.confirm(`删除技能「${skill.name || "未命名"}」？`)) {
                      save({ skills: resume.skills.filter((s) => s.id !== skill.id) });
                    }
                  }}
                  className="rounded-md p-1.5 text-faint hover:bg-red-soft hover:text-red"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-[11px] text-faint">
          技能名建议与 JD 常见词一致（如「信息流投放 / 人群定向 / 数据分析」），能显著提升 Mock 匹配命中率。
        </p>
      </Panel>

      {/* 教育 */}
      <Panel className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle icon={<GraduationCap size={14} />} title="教育经历" inline />
          <Button
            size="xs"
            variant="soft"
            icon={<Plus size={12} />}
            onClick={() => save({ education: [...resume.education, newEducation()] })}
          >
            添加教育
          </Button>
        </div>
        {resume.education.length === 0 ? (
          <EmptyState compact title="暂无教育经历" />
        ) : (
          <div className="space-y-3">
            {resume.education.map((edu) => (
              <div key={edu.id} className="rounded-xl border border-line bg-canvas/40 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="学校">
                    <Input value={edu.school} onChange={(e) => updateEdu(edu.id, { school: e.target.value })} />
                  </Field>
                  <Field label="专业">
                    <Input value={edu.major} onChange={(e) => updateEdu(edu.id, { major: e.target.value })} />
                  </Field>
                  <Field label="学历">
                    <Input value={edu.degree} onChange={(e) => updateEdu(edu.id, { degree: e.target.value })} placeholder="本科 / 硕士" />
                  </Field>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Field label="起止">
                        <Input value={edu.start} onChange={(e) => updateEdu(edu.id, { start: e.target.value })} placeholder="2016-09" />
                      </Field>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`删除「${edu.school || "该条教育经历"}」？`)) {
                          save({ education: resume.education.filter((e) => e.id !== edu.id) });
                        }
                      }}
                      className="mb-1 rounded-md p-1.5 text-faint hover:bg-red-soft hover:text-red"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function SectionTitle({
  title,
  icon,
  inline = false,
}: {
  title: string;
  icon?: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <h2 className={cn("flex items-center gap-2 text-[15px] font-semibold text-ink", !inline && "mb-3")}>
      {icon ? <span className="text-violet">{icon}</span> : null}
      {title}
    </h2>
  );
}
