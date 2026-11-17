'use client';

import React, { useRef, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AwardRecord } from '@/lib/types';
import {
  exportAwardsToCSV,
  exportAwardsToJSON,
  getSampleAwards,
} from '@/lib/storage';

interface BackupViewProps {
  awards: AwardRecord[];
  onReplaceAll: (records: AwardRecord[]) => Promise<void>;
  onMergeRecords: (records: AwardRecord[]) => Promise<void>;
}

export default function BackupView({
  awards,
  onReplaceAll,
  onMergeRecords,
}: BackupViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list: AwardRecord[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.records)
        ? parsed.records
        : [];

      if (list.length === 0) {
        setFeedback({
          type: 'error',
          text: '备份文件中未检测到有效的获奖材料记录。',
        });
        return;
      }

      if (importMode === 'replace') {
        await onReplaceAll(list);
        setFeedback({
          type: 'success',
          text: `已从备份文件完整恢复 ${list.length} 条材料记录（覆盖模式）。`,
        });
      } else {
        await onMergeRecords(list);
        setFeedback({
          type: 'success',
          text: `已从备份文件合并导入 ${list.length} 条材料记录。`,
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        text: '无法解析所选文件，请确认这是由本系统导出的 .json 备份文件。',
      });
    }
  };

  const handleResetSamples = async () => {
    const samples = getSampleAwards();
    await onReplaceAll(samples);
    setFeedback({
      type: 'success',
      text: `已重新加载 ${samples.length} 条教师示范记录。`,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {feedback && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* 导出为 Excel / CSV */}
        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900">
              <FileSpreadsheet className="h-5 w-5 text-blue-700" />
              <h3 className="text-base font-semibold">导出为 Excel 表格 (CSV)</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              将全部 {awards.length} 条获奖材料导出为带 UTF-8 编码头的 CSV 文件，可直接用 Microsoft Excel 或 WPS 表格双击打开，方便职称评审、年度述职打印与汇报。
            </p>
          </div>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                exportAwardsToCSV(awards);
                setFeedback({
                  type: 'success',
                  text: `已导出 ${awards.length} 条记录到 CSV 表格文件。`,
                });
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              <span>立即导出 CSV 表格</span>
            </button>
          </div>
        </section>

        {/* 全量数据备份 */}
        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900">
              <Download className="h-5 w-5 text-slate-700" />
              <h3 className="text-base font-semibold">完整台账本地备份 (JSON)</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              将所有记录、文件路径清单、标签与备注打包为一个便携备份文件。建议每次学期末或更换新电脑前备份到 U 盘或网盘。
            </p>
          </div>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                exportAwardsToJSON(awards);
                setFeedback({
                  type: 'success',
                  text: '已生成完整 JSON 备份文件。',
                });
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              <span>下载全量备份文件</span>
            </button>
          </div>
        </section>
      </div>

      {/* 从备份恢复 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2 text-slate-900">
          <Upload className="h-5 w-5 text-blue-700" />
          <h3 className="text-base font-semibold">从备份文件恢复数据</h3>
        </div>
        <p className="text-sm text-slate-600">
          选择之前导出的 <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">.json</code> 备份文件即可导入记录。您可以选择“合并追加”或“完全覆盖”。
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setImportMode('merge')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                importMode === 'merge'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              合并追加（保留现有）
            </button>
            <button
              type="button"
              onClick={() => setImportMode('replace')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                importMode === 'replace'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              完全覆盖当前台账
            </button>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Upload className="h-4 w-4" />
            <span>选择备份文件导入</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </section>

      {/* 重置示例数据 */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            恢复初始演示示例数据
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            如果您希望重新查看系统自带的 6 条教师示范记录，可点击右侧按钮（会重置当前表格）。
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetSamples}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>恢复示范数据</span>
        </button>
      </section>
    </div>
  );
}
