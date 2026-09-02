"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Database,
  Download,
  HardDrive,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, Field, Input, Panel, type Tone } from "@/components/ui/Primitives";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { downloadJSON, readFileAsText } from "@/lib/utils";
import { createAIProvider, AI_MODE_LABEL } from "@/services/ai/provider";

export function SettingsPage() {
  const { db, api } = useData();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [targetDraft, setTargetDraft] = useState(String(db.settings.dailyApplyTarget));
  const [importing, setImporting] = useState(false);

  const aiMode = createAIProvider().mode as "mock" | "server";
  const dbSize = new Blob([JSON.stringify(db)]).size;

  const exportData = () => {
    downloadJSON(`job-os-backup-${new Date().toISOString().slice(0, 10)}.json`, db);
    toast("已导出 JSON 备份。");
  };

  const importData = async (file: File) => {
    setImporting(true);
    try {
      const text = await readFileAsText(file);
      const result = api.importJSON(text);
      if (result.ok) toast(result.message);
      else toast(result.message, "error");
    } catch {
      toast("文件读取失败。", "error");
    } finally {
      setImporting(false);
    }
  };

  const saveTarget = () => {
    const n = Math.max(0, Math.min(100, Number.parseInt(targetDraft, 10) || 0));
    api.updateSettings({ dailyApplyTarget: n });
    toast(`每日投递目标已设为 ${n}。`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="系统"
        title="Settings"
        description="本工具是单机个人系统：无账号、无云同步，所有数据保存在当前浏览器的本地存储中。"
      />

      <Panel className="mb-5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
          <HardDrive size={15} className="text-violet" />
          <h2 className="text-[15px] font-semibold text-ink">本地数据</h2>
          <span className="ml-auto text-xs text-faint">
            占用约 {dbSize > 1024 * 1024 ? `${(dbSize / 1024 / 1024).toFixed(2)} MB` : `${Math.max(1, Math.round(dbSize / 1024))} KB`}
          </span>
        </div>
        <div className="divide-y divide-line">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4">
            <Database size={18} className="text-faint" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink">导出备份</p>
              <p className="text-xs leading-5 text-faint">
                推荐每周导出一次 JSON；刷新浏览器或换设备前务必备份。
              </p>
            </div>
            <Button size="sm" variant="outline" icon={<Download size={13} />} onClick={exportData}>
              导出 JSON
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-5 py-4">
            <Upload size={18} className="text-faint" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink">导入备份</p>
              <p className="text-xs leading-5 text-faint">导入会覆盖当前数据（含简历/项目/面试/知识/Todo）。</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await importData(f);
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="outline" loading={importing} icon={<Upload size={13} />} onClick={() => fileRef.current?.click()}>
              选择文件
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-5 py-4">
            <Sparkles size={18} className="text-faint" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink">载入演示数据</p>
              <p className="text-xs leading-5 text-faint">
                使用虚构人物「林一」填充简历、项目、知识、岗位与一次完整面试复盘，便于体验所有流程。
              </p>
            </div>
            <Button size="sm" variant="soft" icon={<Sparkles size={13} />} onClick={() => setConfirmDemo(true)}>
              载入演示数据
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-5 py-4">
            <AlertTriangle size={18} className="text-red" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink">清空全部数据</p>
              <p className="text-xs leading-5 text-faint">删除本地数据库并回到初始状态，不可恢复。</p>
            </div>
            <Button size="sm" variant="danger" icon={<RefreshCcw size={13} />} onClick={() => setConfirmReset(true)}>
              清空
            </Button>
          </div>
        </div>
      </Panel>

      <Panel className="mb-5 overflow-hidden">
        <div className="border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-ink">求职目标设置</h2>
        </div>
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <Field label="每日投递目标" hint="理解为高质量候选池上限，而非必须投满">
            <Input
              type="number"
              min={0}
              max={100}
              className="w-28"
              value={targetDraft}
              onChange={(e) => setTargetDraft(e.target.value)}
            />
          </Field>
          <Button size="sm" variant="soft" onClick={saveTarget}>
            保存目标
          </Button>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
          <ShieldCheck size={15} className="text-green" />
          <h2 className="text-[15px] font-semibold text-ink">AI 与隐私说明</h2>
        </div>
        <div className="space-y-3 px-5 py-4 text-[13px] leading-6 text-inkSoft">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">当前 AI 模式：</span>
            <Badge tone={aiMode === "mock" ? "amber" : "green"}>
              <Sparkles size={10} /> {AI_MODE_LABEL[aiMode]}
            </Badge>
          </div>
          <ul className="list-inside list-disc space-y-1.5 text-muted">
            <li>简历、项目、面试录音与转写均不出本机（除非你未来显式接入真实 AI/云服务并确认）。</li>
            <li>Mock AI 只在浏览器内做启发式分析，不会发送任何个人数据。</li>
            <li>真实 AI 接入路径：在服务端配置 AI_API_KEY 后，前端仍不会持有密钥。</li>
            <li>Mock Transcript 与演示数据均为虚构内容，请勿当作真实面试记录。</li>
          </ul>
        </div>
      </Panel>

      <ConfirmDialog
        open={confirmDemo}
        onClose={() => setConfirmDemo(false)}
        onConfirm={() => {
          api.loadDemo();
          setConfirmDemo(false);
          toast("演示数据已载入：虚构人物「林一」的求职资产。");
        }}
        title="载入演示数据？"
        confirmText="载入"
        description="这会覆盖当前所有数据。演示数据为虚构内容，仅供体验流程。建议先导出当前数据备份。"
      />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          api.resetAll();
          setConfirmReset(false);
          toast("本地数据已清空。");
        }}
        title="清空全部数据？"
        confirmText="清空"
        description="将删除本机保存的简历、项目、岗位、面试、知识与 Todo，不可恢复。"
      />
    </div>
  );
}
