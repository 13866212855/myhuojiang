'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  FolderOpen,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { AwardRecord, AttachedFile } from '@/lib/types';
import { getFileBlob, getFileHandle, getFolderPath } from '@/lib/storage';

interface FilePreviewModalProps {
  record: AwardRecord | null;
  onClose: () => void;
  onEditRecord: (record: AwardRecord) => void;
}

interface FileSystemFileHandleWithPermission extends FileSystemFileHandle {
  queryPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
}

interface PreviewState {
  url: string | null;
  type: 'image' | 'pdf' | 'other' | 'none';
  message: string;
}

export default function FilePreviewModal({
  record,
  onClose,
  onEditRecord,
}: FilePreviewModalProps) {
  const [selectedFileId, setSelectedFileId] = useState<string>(
    record?.files[0]?.id ?? ''
  );
  const [preview, setPreview] = useState<PreviewState>({
    url: null,
    type: 'none',
    message: '',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeFile: AttachedFile | undefined =
    record?.files.find((f) => f.id === selectedFileId) || record?.files[0];

  const activeFileId = activeFile?.id ?? '';
  const activeFileHasHandle = Boolean(activeFile?.hasLocalHandle);
  const activeFileHasBlob = Boolean(activeFile?.hasLocalBlob);
  const activeFileName = activeFile?.name ?? '';
  const activeFileMime = activeFile?.mimeType ?? '';
  const activeFileStatus = activeFile?.status ?? 'unchecked';

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadFilePreview() {
      if (!activeFileId) {
        if (!cancelled) {
          setPreview({ url: null, type: 'none', message: '' });
        }
        return;
      }

      let fileData: File | Blob | null = null;
      let errMessage = '';

      if (activeFileHasHandle) {
        const handle = (await getFileHandle(activeFileId)) as FileSystemFileHandleWithPermission | null;
        if (handle) {
          try {
            if (typeof handle.queryPermission === 'function') {
              const perm = await handle.queryPermission({ mode: 'read' });
              if (perm !== 'granted' && typeof handle.requestPermission === 'function') {
                await handle.requestPermission({ mode: 'read' });
              }
            }
            fileData = await handle.getFile();
          } catch {
            errMessage = '未能获取本地文件读取权限，或原文件已被移动/删除。';
          }
        }
      }

      if (!fileData && activeFileHasBlob) {
        fileData = await getFileBlob(activeFileId);
      }

      if (cancelled) return;

      if (fileData) {
        objectUrl = URL.createObjectURL(fileData);
        const lowerName = activeFileName.toLowerCase();
        const mime = fileData.type || activeFileMime;
        let nextType: PreviewState['type'] = 'other';
        if (mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/.test(lowerName)) {
          nextType = 'image';
        } else if (mime === 'application/pdf' || lowerName.endsWith('.pdf')) {
          nextType = 'pdf';
        }
        setPreview({ url: objectUrl, type: nextType, message: '' });
      } else {
        setPreview({
          url: null,
          type: 'none',
          message:
            errMessage ||
            (activeFileStatus === 'missing'
              ? '检测到该文件当前处于“缺失/失效”状态，原文件可能已被移动或重命名。'
              : '该记录为电脑本地路径登记。受浏览器安全沙箱限制，网页端无法直接静默读取您电脑 D 盘文件；您可以复制路径在资源管理器打开，或点击“编辑”通过“浏览选择文件”重新绑定本地文件。'),
        });
      }
    }

    loadFilePreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [
    activeFileId,
    activeFileHasHandle,
    activeFileHasBlob,
    activeFileName,
    activeFileMime,
    activeFileStatus,
  ]);

  if (!record) return null;

  const handleCopy = async (text: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(tag);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // 忽略剪贴板权限拒绝
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* 顶部栏 */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="preview-modal-title"
              className="truncate text-lg font-semibold text-slate-900"
            >
              {record.title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{record.category}</span>
              {record.awardLevel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-slate-700">{record.awardLevel}</span>
                </>
              )}
              {record.awardDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{record.awardDate}</span>
                </>
              )}
              {record.issuer && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{record.issuer}</span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭文件详情"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 多文件切换条 */}
        {record.files.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-6 py-2.5">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
              关联文件 ({record.files.length})：
            </span>
            {record.files.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFileId(f.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeFile?.id === f.id
                    ? 'bg-blue-700 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}

        {/* 主体内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeFile && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-blue-700 shrink-0" />
                  <span className="truncate text-sm font-medium text-slate-900">
                    {activeFile.name}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(activeFile.path, 'file')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                  >
                    {copiedId === 'file' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedId === 'file' ? '已复制文件路径' : '复制文件路径'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(getFolderPath(activeFile.path), 'folder')
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                  >
                    {copiedId === 'folder' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                    ) : (
                      <FolderOpen className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {copiedId === 'folder' ? '已复制文件夹路径' : '复制所在文件夹路径'}
                    </span>
                  </button>
                  {preview.url && (
                    <a
                      href={preview.url}
                      download={activeFile.name}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>下载 / 系统打开</span>
                    </a>
                  )}
                </div>
              </div>
              <p className="break-all font-mono text-xs text-slate-600">
                存放路径：{activeFile.path}
              </p>
            </div>
          )}

          {/* 预览区域 */}
          {preview.url && preview.type === 'image' && (
            <div className="flex justify-center rounded-lg border border-slate-200 bg-slate-100 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt={activeFile?.name || record.title}
                referrerPolicy="no-referrer"
                className="max-h-[420px] w-auto rounded object-contain"
              />
            </div>
          )}

          {preview.url && preview.type === 'pdf' && (
            <div className="h-[420px] w-full overflow-hidden rounded-lg border border-slate-200">
              <iframe
                src={preview.url}
                title={activeFile?.name || record.title}
                className="h-full w-full"
              />
            </div>
          )}

          {preview.url && preview.type === 'other' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
              该文件格式（如 Word / 压缩包）暂不支持网页内嵌预览，请点击上方“下载 / 系统打开”使用本机软件查看。
            </div>
          )}

          {!preview.url && preview.message && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="space-y-2">
                <p>{preview.message}</p>
                <p className="text-xs text-amber-800">
                  提示：在 Windows 上使用本系统附带的“桌面版工具 (.exe)”时，双击表格记录即可直接调用系统程序打开 D 盘/E 盘文件并定位所在文件夹。
                </p>
              </div>
            </div>
          )}

          {/* 备注与标签 */}
          {(record.tags.length > 0 || record.notes) && (
            <div className="space-y-2 border-t border-slate-200 pt-4 text-sm">
              {record.tags.length > 0 && (
                <p className="text-slate-600">
                  <span className="font-medium text-slate-800">标签：</span>
                  {record.tags.join(' · ')}
                </p>
              )}
              {record.notes && (
                <p className="text-slate-600 leading-relaxed">
                  <span className="font-medium text-slate-800">备注：</span>
                  {record.notes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEditRecord(record);
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            编辑或重新关联文件
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
