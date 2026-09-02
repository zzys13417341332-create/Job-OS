"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Database,
  Download,
  HardDrive,
  RefreshCcw,
  Sparkles,
  Upload,
} from "lucide-react";
import { Badge, Field, Input } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useData } from "@/providers/data-context";
import { useToast } from "@/components/ui/Toast";
import { downloadJSON, readFileAsText } from "@/lib/utils";
import { createAIProvider, AI_MODE_LABEL } from "@/services/ai/provider";

/** 数据/偏好设置（不再是独立页面，作为 Dashboard 弹窗使用） */
export function DataSettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { db, api } = useData();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [targetDraft, setTargetDraft] = useState(String(db.settings.dailyApplyTarget));
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const aiMode = createAIProvider().mode as "mock" | "server";
  const dbSize = new Blob([JSON.stringify(db)]).size;

  const exportData = () => {
    downloadJSON(`job-os-backup-${new Date().toISOString().slice(0, 10)}.json`, db);
    toast("已导出 JSON 备份。");
  };

  const importData = async (file: File) => {
    try {
      const text = await readFileAsText(file);
      const result = api.importJSON(text);
      if (result.ok) toast(result.message);
      else toast(result.message, "error");
    } catch {
      toast("文件读取失败。", "error");
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        title="设置与数据"
        description="单机个人系统：无账号、无云同步，数据保存在当前浏览器。"
      >
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line p-4">
              <Field label="每日投递目标" hint="理解为高质量候选池上限，而非必须投满">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="w-28"
                    value={targetDraft}
                    onChange={(e) => setTargetDraft(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() => {
                      const n = Math.max(0, Math.min(100, Number.parseInt(targetDraft, 10) || 0));
                      api.updateSettings({ dailyApplyTarget: n });
                      toast(`每日投递目标已设为 ${n}。`);
                    }}
                  >
                    保存
                  </Button>
                </div>
              </Field>
            </div>
            <div className="rounded-xl border border-line p-4">
              <p className="text-[13px] font-medium text-ink">AI 模式</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone={aiMode === "mock" ? "amber" : "green"}>
                  {AI_MODE_LABEL[aiMode]}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-faint">
                Mock 只在本机分析，不发送任何数据；真实 AI 需在服务端配置 AI_API_KEY。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3">
            <HardDrive size={16} className="text-faint" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink">本地数据占用</p>
              <p className="text-xs text-faint">
                {dbSize > 1024 * 1024
                  ? `${(dbSize / 1024 / 1024).toFixed(2)} MB`
                  : `${Math.max(1, Math.round(dbSize / 1024))} KB`}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={exportData}
              className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition-colors hover:border-lineStrong"
            >
              <Download size={16} className="text-violet" />
              <span>
                <span className="block text-[13px] font-medium text-ink">导出 JSON 备份</span>
                <span className="text-xs text-faint">换设备 / 清缓存前使用</span>
              </span>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition-colors hover:border-lineStrong"
            >
              <Upload size={16} className="text-violet" />
              <span>
                <span className="block text-[13px] font-medium text-ink">导入 JSON 备份</span>
                <span className="text-xs text-faint">导入会覆盖当前数据</span>
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importData(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => setConfirmDemo(true)}
              className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition-colors hover:border-lineStrong"
            >
              <Sparkles size={16} className="text-violet" />
              <span>
                <span className="block text-[13px] font-medium text-ink">载入演示数据</span>
                <span className="text-xs text-faint">虚构人物「林一」，体验完整流程</span>
              </span>
            </button>
            <button
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-3 rounded-xl border border-red-line bg-red-soft/30 px-4 py-3 text-left transition-colors hover:border-red"
            >
              <AlertTriangle size={16} className="text-red" />
              <span>
                <span className="block text-[13px] font-medium text-red">清空全部数据</span>
                <span className="text-xs text-faint">回到初始状态，不可恢复</span>
              </span>
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDemo}
        onClose={() => setConfirmDemo(false)}
        onConfirm={() => {
          api.loadDemo();
          setConfirmDemo(false);
          toast("演示数据已载入。");
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
    </>
  );
}
