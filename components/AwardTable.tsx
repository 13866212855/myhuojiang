'use client';

import React, { useState } from 'react';
import {
  ArrowUpDown,
  ExternalLink,
  FolderOpen,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Check,
  Plus,
} from 'lucide-react';
import {
  AwardRecord,
  SortField,
  SortDirection,
  FileValidityStatus,
} from '@/lib/types';
import { getRecordOverallStatus, getFolderPath } from '@/lib/storage';

interface AwardTableProps {
  records: AwardRecord[];
  loading: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onOpenRecord: (record: AwardRecord) => void;
  onEditRecord: (record: AwardRecord) => void;
  onDeleteRecord: (record: AwardRecord) => void;
  onAddNew: () => void;
}

export default function AwardTable({
  records,
  loading,
  sortField,
  sortDirection,
  onSort,
  onOpenRecord,
  onEditRecord,
  onDeleteRecord,
  onAddNew,
}: AwardTableProps) {
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  const handleCopyFolder = async (
    e: React.MouseEvent,
    record: AwardRecord
  ) => {
    e.stopPropagation();
    const firstPath = record.files[0]?.path;
    if (!firstPath) return;
    const folder = getFolderPath(firstPath);
    try {
      await navigator.clipboard.writeText(folder);
      setCopiedRowId(record.id);
      setTimeout(() => setCopiedRowId(null), 1800);
    } catch {
      onOpenRecord(record);
    }
  };

  const renderStatus = (status: FileValidityStatus) => {
    switch (status) {
      case 'valid':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>文件有效</span>
          </span>
        );
      case 'missing':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>文件失效</span>
          </span>
        );
      case 'path_only':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
            <HardDrive className="h-3.5 w-3.5 shrink-0" />
            <span>仅路径记录</span>
          </span>
        );
      default:
        return (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            待检测
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="divide-y divide-slate-200">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="h-4 w-20 rounded bg-slate-100" />
              <div className="h-4 w-24 rounded bg-slate-100" />
              <div className="h-4 flex-1 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <FolderOpen className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          暂无匹配的获奖材料记录
        </h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          您可以调整上方的关键词或筛选条件，也可以点击下方按钮登记您的第一份获奖证书、教研论文或教学案例。
        </p>
        <button
          type="button"
          onClick={onAddNew}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>新增第一份材料</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
              <th className="py-3 pl-5 pr-3">
                <button
                  type="button"
                  onClick={() => onSort('title')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 whitespace-nowrap"
                >
                  <span>材料名称（双击行直接打开）</span>
                  <ArrowUpDown
                    className={`h-3.5 w-3.5 ${
                      sortField === 'title' ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  />
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onSort('category')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 whitespace-nowrap"
                >
                  <span>类型</span>
                  <ArrowUpDown
                    className={`h-3.5 w-3.5 ${
                      sortField === 'category' ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  />
                </button>
              </th>
              <th className="px-3 py-3 whitespace-nowrap">获奖名称/等级</th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onSort('awardDate')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 whitespace-nowrap"
                >
                  <span>获奖日期</span>
                  <ArrowUpDown
                    className={`h-3.5 w-3.5 ${
                      sortField === 'awardDate' ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  />
                  {sortField === 'awardDate' && (
                    <span className="text-[11px] font-normal text-blue-700">
                      {sortDirection === 'desc' ? '降序' : '升序'}
                    </span>
                  )}
                </button>
              </th>
              <th className="px-3 py-3 whitespace-nowrap">颁发单位</th>
              <th className="px-3 py-3 whitespace-nowrap">文件存放路径</th>
              <th className="px-3 py-3 whitespace-nowrap">状态</th>
              <th className="py-3 pl-3 pr-5 text-right whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {records.map((record) => {
              const overallStatus = getRecordOverallStatus(record);
              const firstFile = record.files[0];
              const isMissing = overallStatus === 'missing';

              return (
                <tr
                  key={record.id}
                  onDoubleClick={() => onOpenRecord(record)}
                  title="双击可直接打开或预览文件"
                  className={`cursor-pointer transition-colors ${
                    isMissing
                      ? 'bg-red-50/40 hover:bg-red-50/70'
                      : 'hover:bg-slate-50/90'
                  }`}
                >
                  {/* 材料名称与标签纯文本 */}
                  <td className="py-3 pl-5 pr-3 max-w-[280px]">
                    <div className="font-medium text-slate-900 truncate">
                      {record.title}
                    </div>
                    {record.tags.length > 0 && (
                      <div className="mt-0.5 truncate text-xs text-slate-500">
                        {record.tags.join(' · ')}
                      </div>
                    )}
                  </td>

                  {/* 类型（无药丸边框，纯文本） */}
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                    {record.category}
                  </td>

                  {/* 获奖等级 */}
                  <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">
                    {record.awardLevel || '—'}
                  </td>

                  {/* 日期（等宽数字） */}
                  <td className="px-3 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                    {record.awardDate || '—'}
                  </td>

                  {/* 颁发单位 */}
                  <td className="px-3 py-3 text-slate-600 max-w-[160px] truncate">
                    {record.issuer || '—'}
                  </td>

                  {/* 存放路径 */}
                  <td className="px-3 py-3 max-w-[260px]">
                    {firstFile ? (
                      <div className="space-y-0.5">
                        <div className="truncate font-mono text-xs text-slate-700">
                          {firstFile.path}
                        </div>
                        {record.files.length > 1 && (
                          <div className="text-[11px] text-blue-700 tabular-nums">
                            共关联 {record.files.length} 个文件
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-red-700">未关联文件</span>
                    )}
                  </td>

                  {/* 状态 */}
                  <td className="px-3 py-3">{renderStatus(overallStatus)}</td>

                  {/* 操作按钮 */}
                  <td
                    className="py-3 pl-3 pr-5 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenRecord(record)}
                        title="打开或预览文件"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>打开</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleCopyFolder(e, record)}
                        title="复制所在文件夹路径"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                      >
                        {copiedRowId === record.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-700" />
                        ) : (
                          <FolderOpen className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {copiedRowId === record.id ? '已复制' : '所在文件夹'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditRecord(record)}
                        title="编辑记录"
                        aria-label={`编辑 ${record.title}`}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRecord(record)}
                        title="删除记录"
                        aria-label={`删除 ${record.title}`}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
