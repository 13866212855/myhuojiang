'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  FolderOpen,
  Upload,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  AwardRecord,
  AttachedFile,
  DEFAULT_CATEGORIES,
  COMMON_AWARD_LEVELS,
} from '@/lib/types';
import {
  saveFileHandle,
  saveFileBlob,
  saveCustomCategory,
} from '@/lib/storage';

interface AwardModalProps {
  isOpen: boolean;
  editingRecord: AwardRecord | null;
  categories: string[];
  onClose: () => void;
  onSave: (record: AwardRecord, updatedCategories: string[]) => Promise<void>;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function AwardModal({
  isOpen,
  editingRecord,
  categories,
  onClose,
  onSave,
}: AwardModalProps) {
  const [title, setTitle] = useState(editingRecord?.title ?? '');
  const [category, setCategory] = useState(
    editingRecord?.category ?? categories[0] ?? '证书'
  );
  const [customCategory, setCustomCategory] = useState('');
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [awardLevel, setAwardLevel] = useState(editingRecord?.awardLevel ?? '');
  const [awardDate, setAwardDate] = useState(
    editingRecord?.awardDate ?? new Date().toISOString().slice(0, 10)
  );
  const [issuer, setIssuer] = useState(editingRecord?.issuer ?? '');
  const [tagsInput, setTagsInput] = useState(
    editingRecord?.tags.join('、') ?? ''
  );
  const [notes, setNotes] = useState(editingRecord?.notes ?? '');
  const [files, setFiles] = useState<AttachedFile[]>(
    editingRecord?.files ?? []
  );
  const [manualPath, setManualPath] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const fallbackFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const allCategoryOptions = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...categories])
  );

  // 使用现代浏览器 File System Access API 选择本地磁盘文件并保留可校验句柄
  const handleBrowseFiles = async () => {
    setErrorMsg('');
    const win = window as unknown as {
      showOpenFilePicker?: (options?: {
        multiple?: boolean;
      }) => Promise<FileSystemFileHandle[]>;
    };

    if (typeof win.showOpenFilePicker === 'function') {
      try {
        const handles = await win.showOpenFilePicker({ multiple: true });
        const added: AttachedFile[] = [];
        for (const handle of handles) {
          const file = await handle.getFile();
          const fileId = generateId('file');
          await saveFileHandle(fileId, handle);
          await saveFileBlob(fileId, file);
          added.push({
            id: fileId,
            name: file.name,
            path: manualPath.trim()
              ? `${manualPath.trim().replace(/[\\/]+$/, '')}\\${file.name}`
              : file.name,
            size: file.size,
            mimeType: file.type,
            hasLocalHandle: true,
            hasLocalBlob: true,
            status: 'valid',
            lastCheckedAt: new Date().toISOString(),
            statusMessage: '已关联本地文件句柄，可直接双击打开或失效检测',
          });
          if (!title.trim()) {
            setTitle(file.name.replace(/\.[^/.]+$/, ''));
          }
        }
        setFiles((prev) => [...prev, ...added]);
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    fallbackFileInputRef.current?.click();
  };

  const handleFallbackFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const added: AttachedFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const fileId = generateId('file');
      await saveFileBlob(fileId, f);
      // Electron/部分环境有 file.path，标准浏览器仅有 file.name
      const nativePath = (f as File & { path?: string }).path || f.name;
      added.push({
        id: fileId,
        name: f.name,
        path: nativePath,
        size: f.size,
        mimeType: f.type,
        hasLocalBlob: true,
        status: 'valid',
        lastCheckedAt: new Date().toISOString(),
        statusMessage: '已缓存本地文件，可直接双击预览打开',
      });
      if (!title.trim() && i === 0) {
        setTitle(f.name.replace(/\.[^/.]+$/, ''));
      }
    }
    setFiles((prev) => [...prev, ...added]);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setErrorMsg('');

    // 优先尝试获取 FileSystemFileHandle（支持后续真实失效检测）
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const added: AttachedFile[] = [];
      let handledViaApi = false;

      for (let i = 0; i < items.length; i++) {
        const item = items[i] as DataTransferItem & {
          getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
        };
        if (typeof item.getAsFileSystemHandle === 'function') {
          try {
            const handle = await item.getAsFileSystemHandle();
            if (handle && handle.kind === 'file') {
              handledViaApi = true;
              const fileHandle = handle as FileSystemFileHandle;
              const f = await fileHandle.getFile();
              const fileId = generateId('file');
              await saveFileHandle(fileId, fileHandle);
              await saveFileBlob(fileId, f);
              added.push({
                id: fileId,
                name: f.name,
                path: f.name,
                size: f.size,
                mimeType: f.type,
                hasLocalHandle: true,
                hasLocalBlob: true,
                status: 'valid',
                lastCheckedAt: new Date().toISOString(),
                statusMessage: '拖拽关联成功，可直接打开与检测',
              });
              if (!title.trim() && i === 0) {
                setTitle(f.name.replace(/\.[^/.]+$/, ''));
              }
            }
          } catch {
            // 降级到普通 FileList
          }
        }
      }

      if (handledViaApi && added.length > 0) {
        setFiles((prev) => [...prev, ...added]);
        return;
      }
    }

    await handleFallbackFiles(e.dataTransfer.files);
  };

  const handleAddManualPath = () => {
    const clean = manualPath.trim();
    if (!clean) return;
    const parts = clean.split(/[\\/]/);
    const fileName = parts[parts.length - 1] || clean;
    const fileId = generateId('path');
    setFiles((prev) => [
      ...prev,
      {
        id: fileId,
        name: fileName,
        path: clean,
        status: 'path_only',
        statusMessage: '已手动记录电脑磁盘路径',
      },
    ]);
    if (!title.trim()) {
      setTitle(fileName.replace(/\.[^/.]+$/, ''));
    }
    setManualPath('');
  };

  const handleUpdateFilePath = (id: string, nextPath: string) => {
    const parts = nextPath.split(/[\\/]/);
    const nextName = parts[parts.length - 1] || nextPath;
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              path: nextPath,
              name: nextName || f.name,
            }
          : f
      )
    );
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanTitle = title.trim();
    const finalCategory = useCustomCategory
      ? customCategory.trim()
      : category.trim();

    if (!cleanTitle) {
      setErrorMsg('请填写“材料名称”（必填项）。');
      return;
    }
    if (!finalCategory) {
      setErrorMsg('请选择或输入“材料类型”。');
      return;
    }

    // 如果用户在路径输入框中写了内容但忘了点“添加路径”，自动帮其加入
    const finalFiles = [...files];
    if (manualPath.trim()) {
      const clean = manualPath.trim();
      const parts = clean.split(/[\\/]/);
      const fileName = parts[parts.length - 1] || clean;
      finalFiles.push({
        id: generateId('path'),
        name: fileName,
        path: clean,
        status: 'path_only',
        statusMessage: '已记录电脑磁盘路径',
      });
    }

    if (finalFiles.length === 0) {
      setErrorMsg('请至少通过“浏览选择”、“拖拽文件”或手动填写关联一个文件路径。');
      return;
    }

    setSaving(true);
    try {
      const updatedCategories = saveCustomCategory(finalCategory);
      const now = new Date().toISOString();
      const tags = tagsInput
        .split(/[,，、\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const record: AwardRecord = {
        id: editingRecord?.id ?? generateId('award'),
        title: cleanTitle,
        category: finalCategory,
        awardLevel: awardLevel.trim(),
        awardDate: awardDate.trim(),
        issuer: issuer.trim(),
        files: finalFiles,
        tags,
        notes: notes.trim(),
        createdAt: editingRecord?.createdAt ?? now,
        updatedAt: now,
      };
      await onSave(record, updatedCategories);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="award-modal-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden my-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2
            id="award-modal-title"
            className="text-lg font-semibold text-slate-900"
          >
            {editingRecord ? '编辑获奖材料记录' : '新增获奖材料'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭窗口"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 材料名称 */}
          <div>
            <label
              htmlFor="field-title"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              材料名称 <span className="text-red-600">*</span>
            </label>
            <input
              id="field-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：2025年市级中小学教师教学能力大赛一等奖证书"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {/* 类型与日期 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="field-category"
                  className="block text-sm font-medium text-slate-800"
                >
                  材料类型 <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setUseCustomCategory(!useCustomCategory)}
                  className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
                >
                  {useCustomCategory ? '返回列表选择' : '+ 自定义类型'}
                </button>
              </div>
              {useCustomCategory ? (
                <input
                  id="field-category"
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="输入新类型名称，如：发明专利"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              ) : (
                <select
                  id="field-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                >
                  {allCategoryOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label
                htmlFor="field-date"
                className="block text-sm font-medium text-slate-800 mb-1.5"
              >
                获奖日期
              </label>
              <input
                id="field-date"
                type="date"
                value={awardDate}
                onChange={(e) => setAwardDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          {/* 获奖等级与颁发单位 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="field-level"
                className="block text-sm font-medium text-slate-800 mb-1.5"
              >
                获奖名称 / 等级
              </label>
              <input
                id="field-level"
                type="text"
                list="common-award-levels"
                value={awardLevel}
                onChange={(e) => setAwardLevel(e.target.value)}
                placeholder="如：市级一等奖、核心期刊发表"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              <datalist id="common-award-levels">
                {COMMON_AWARD_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="field-issuer"
                className="block text-sm font-medium text-slate-800 mb-1.5"
              >
                颁发单位
              </label>
              <input
                id="field-issuer"
                type="text"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="如：市教育局、省教育科学研究院"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          {/* 文件选择、拖拽与路径记录区（支持多文件） */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-800">
                文件存放路径与关联文件 <span className="text-red-600">*</span>
              </label>
              <span className="text-xs text-slate-500">
                支持关联多个文件（如证书扫描件 + 论文原稿）
              </span>
            </div>

            {/* 拖拽与浏览区域 */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`rounded-lg border border-dashed p-4 text-center transition-colors ${
                isDragging
                  ? 'border-blue-600 bg-blue-50/70'
                  : 'border-slate-300 bg-slate-50/60'
              }`}
            >
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:text-left">
                <div className="flex items-center gap-3">
                  <Upload className="h-5 w-5 text-slate-400 shrink-0" />
                  <div className="text-xs text-slate-600">
                    <p className="font-medium text-slate-800">
                      将证书或论文文件直接拖拽到这里
                    </p>
                    <p className="text-slate-500">
                      仅在本地记录文件路径与关联，不会移动或修改原文件
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBrowseFiles}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-blue-700" />
                  <span>浏览选择文件</span>
                </button>
              </div>
              <input
                ref={fallbackFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFallbackFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>

            {/* 手动补充本地磁盘绝对路径 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddManualPath();
                  }
                }}
                placeholder="也可直接粘贴电脑路径，如：D:\教学档案\2025\市级一等奖证书.pdf"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              <button
                type="button"
                onClick={handleAddManualPath}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>添加路径</span>
              </button>
            </div>

            {/* 已关联文件列表 */}
            {files.length > 0 && (
              <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {files.map((f, index) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 px-3 py-2.5 text-xs"
                  >
                    <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-slate-700">
                        <span className="font-medium truncate">
                          文件 {index + 1}：{f.name}
                        </span>
                        {f.size !== undefined && (
                          <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                            {(f.size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={f.path}
                        onChange={(e) =>
                          handleUpdateFilePath(f.id, e.target.value)
                        }
                        aria-label={`修改文件 ${f.name} 的记录路径`}
                        placeholder="补充完整磁盘路径（如 D:\教学档案\...）"
                        className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(f.id)}
                      aria-label={`移除文件 ${f.name}`}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 标签与备注 */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label
                htmlFor="field-tags"
                className="block text-sm font-medium text-slate-800 mb-1.5"
              >
                标签（多个标签用顿号或逗号隔开）
              </label>
              <input
                id="field-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="例如：职称评审、骨干教师、数学教研"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label
                htmlFor="field-notes"
                className="block text-sm font-medium text-slate-800 mb-1.5"
              >
                备注说明
              </label>
              <textarea
                id="field-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="记录文件用途、原件存放抽屉位置、合作作者等信息..."
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          {/* 底部提交栏 */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {saving ? '保存中...' : editingRecord ? '保存修改' : '保存材料'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
