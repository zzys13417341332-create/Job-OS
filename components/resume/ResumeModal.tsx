"use client";

import { Modal } from "@/components/ui/Modal";
import { ResumePage } from "@/components/pages/ResumePage";

/** 个人资料编辑器（不再是一级页面，Interview Prep 内弹窗打开） */
export function ResumeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Resume Profile · 个人资料"
      description="JD 匹配、自我介绍与复盘缺口判断都以这里的资料为依据，改动自动保存。"
    >
      <ResumePage embedded />
    </Modal>
  );
}
