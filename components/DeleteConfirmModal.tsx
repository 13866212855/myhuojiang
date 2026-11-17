'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { AwardRecord } from '@/lib/types';

interface DeleteConfirmModalProps {
  record: AwardRecord | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({
  record,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!record) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3
              id="delete-modal-title"
              className="text-base font-semibold text-slate-900"
            >
              确认删除这条材料记录？
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              即将从台账中删除「{record.title}」。此操作仅移除台账记录，不会删除您电脑硬盘中的原始文件。
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 whitespace-nowrap shrink-0"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}
