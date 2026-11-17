'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Menu,
  Plus,
  Search,
  ShieldAlert,
  RotateCcw,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ActiveView,
  AwardRecord,
  DEFAULT_CATEGORIES,
  FilterState,
  SortDirection,
  SortField,
} from '@/lib/types';
import {
  loadAllAwards,
  saveAwardRecord,
  saveAllAwards,
  deleteAwardRecord,
  verifySingleFile,
  getRecordOverallStatus,
  loadCustomCategories,
  exportAwardsToCSV,
} from '@/lib/storage';
import Sidebar from '@/components/Sidebar';
import AwardTable from '@/components/AwardTable';
import AwardModal from '@/components/AwardModal';
import FilePreviewModal from '@/components/FilePreviewModal';
import StatsView from '@/components/StatsView';
import BackupView from '@/components/BackupView';
import DesktopGuideView from '@/components/DesktopGuideView';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';

const VIEW_META: Record<ActiveView, { title: string; subtitle: string }> = {
  list: {
    title: '材料台账列表',
    subtitle: '记录每份荣誉证书、教研论文与教学案例的电脑存放位置，双击记录即可快速打开',
  },
  stats: {
    title: '年份与类型统计',
    subtitle: '按年度、材料分类与获奖等级自动汇总，方便学期考核与职称汇报',
  },
  backup: {
    title: '导出与备份恢复',
    subtitle: '支持导出 Excel (CSV) 表格，以及全量台账 JSON 备份与恢复',
  },
  desktop: {
    title: 'Windows 桌面版源码与打包教程',
    subtitle: '零编程基础三步生成离线 .exe 程序，直接读取电脑 D 盘并调用系统资源管理器',
  },
};

export default function HomePage() {
  const prefersReducedMotion = useReducedMotion();
  const [awards, setAwards] = useState<AwardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    category: '全部',
    year: '全部',
    awardLevel: '全部',
    status: 'all',
  });

  const [sortField, setSortField] = useState<SortField>('awardDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AwardRecord | null>(null);
  const [previewRecord, setPreviewRecord] = useState<AwardRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AwardRecord | null>(null);

  // 失效检测状态
  const [checking, setChecking] = useState(false);
  const [checkReport, setCheckReport] = useState<{
    total: number;
    valid: number;
    pathOnly: number;
    missing: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    async function init() {
      setLoading(true);
      const [loaded, cats] = await Promise.all([
        loadAllAwards(),
        Promise.resolve(loadCustomCategories()),
      ]);
      if (active) {
        setAwards(loaded);
        setCustomCategories(cats);
        setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  // 动态选项列表
  const allCategories = useMemo(() => {
    const fromRecords = awards.map((a) => a.category).filter(Boolean);
    return Array.from(
      new Set([...DEFAULT_CATEGORIES, ...customCategories, ...fromRecords])
    );
  }, [awards, customCategories]);

  const availableYears = useMemo(() => {
    const years = awards
      .map((a) => (a.awardDate && a.awardDate.length >= 4 ? a.awardDate.slice(0, 4) : ''))
      .filter(Boolean);
    return Array.from(new Set(years)).sort((a, b) => b.localeCompare(a));
  }, [awards]);

  const availableLevels = useMemo(() => {
    const levels = awards.map((a) => a.awardLevel.trim()).filter(Boolean);
    return Array.from(new Set(levels)).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [awards]);

  // 搜索筛选与排序后的列表
  const filteredAwards = useMemo(() => {
    const kw = filters.keyword.trim().toLowerCase();

    const list = awards.filter((item) => {
      if (kw) {
        const haystack = [
          item.title,
          item.category,
          item.awardLevel,
          item.issuer,
          item.notes,
          item.tags.join(' '),
          item.files.map((f) => `${f.name} ${f.path}`).join(' '),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(kw)) return false;
      }

      if (filters.category !== '全部' && item.category !== filters.category) {
        return false;
      }

      if (filters.year !== '全部') {
        const itemYear = item.awardDate ? item.awardDate.slice(0, 4) : '';
        if (itemYear !== filters.year) return false;
      }

      if (
        filters.awardLevel !== '全部' &&
        item.awardLevel.trim() !== filters.awardLevel
      ) {
        return false;
      }

      if (filters.status !== 'all') {
        const st = getRecordOverallStatus(item);
        if (st !== filters.status) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'awardDate') {
        cmp = (a.awardDate || '').localeCompare(b.awardDate || '');
      } else if (sortField === 'category') {
        cmp = (a.category || '').localeCompare(b.category || '', 'zh-CN');
      } else if (sortField === 'title') {
        cmp = (a.title || '').localeCompare(b.title || '', 'zh-CN');
      } else {
        cmp = (a.updatedAt || '').localeCompare(b.updatedAt || '');
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [awards, filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSaveRecord = async (
    record: AwardRecord,
    updatedCats: string[]
  ) => {
    await saveAwardRecord(record);
    setCustomCategories(updatedCats);
    setAwards((prev) => {
      const idx = prev.findIndex((item) => item.id === record.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [record, ...prev];
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const fileIds = deleteTarget.files.map((f) => f.id);
    await deleteAwardRecord(deleteTarget.id, fileIds);
    setAwards((prev) => prev.filter((item) => item.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleRunBrokenCheck = async () => {
    setChecking(true);
    try {
      const updatedList: AwardRecord[] = [];
      let valid = 0;
      let pathOnly = 0;
      let missing = 0;

      for (const rec of awards) {
        const checkedFiles = await Promise.all(
          rec.files.map((f) => verifySingleFile(f))
        );
        const updatedRec: AwardRecord = { ...rec, files: checkedFiles };
        updatedList.push(updatedRec);
        const status = getRecordOverallStatus(updatedRec);
        if (status === 'valid') valid++;
        else if (status === 'missing') missing++;
        else pathOnly++;
      }

      await saveAllAwards(updatedList);
      setAwards(updatedList);
      setCheckReport({
        total: updatedList.length,
        valid,
        pathOnly,
        missing,
      });
    } finally {
      setChecking(false);
    }
  };

  const handleReplaceAll = async (records: AwardRecord[]) => {
    await saveAllAwards(records);
    setAwards(records);
    setCheckReport(null);
  };

  const handleMergeRecords = async (incoming: AwardRecord[]) => {
    const map = new Map<string, AwardRecord>();
    for (const r of awards) map.set(r.id, r);
    for (const r of incoming) map.set(r.id, r);
    const merged = Array.from(map.values());
    await saveAllAwards(merged);
    setAwards(merged);
    setCheckReport(null);
  };

  const resetFilters = () => {
    setFilters({
      keyword: '',
      category: '全部',
      year: '全部',
      awardLevel: '全部',
      status: 'all',
    });
  };

  const hasActiveFilter =
    filters.keyword !== '' ||
    filters.category !== '全部' ||
    filters.year !== '全部' ||
    filters.awardLevel !== '全部' ||
    filters.status !== 'all';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* 左侧导航栏 */}
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        awards={awards}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* 右侧工作区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶部栏（严格三区布局：导航触发 + 标题路径 / 主操作按钮） */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3.5 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="打开导航菜单"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>教师获奖材料管理</span>
                <span aria-hidden="true">/</span>
                <span className="font-medium text-slate-800">
                  {VIEW_META[activeView].title}
                </span>
              </div>
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">
                {VIEW_META[activeView].title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingRecord(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>新增材料</span>
            </button>
          </div>
        </header>

        {/* 主内容区 */}
        <main className="flex-1 p-5 lg:p-8">
          <motion.div
            key={activeView}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-[1280px] space-y-5"
          >
            <p className="text-sm text-slate-600">
              {VIEW_META[activeView].subtitle}
            </p>

            {activeView === 'list' && (
              <>
                {/* 搜索与筛选工具栏 */}
                <section
                  aria-label="搜索与筛选"
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    {/* 关键词检索 */}
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={filters.keyword}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, keyword: e.target.value }))
                        }
                        placeholder="搜索材料名称、颁发单位、路径、标签或备注..."
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      />
                    </div>

                    {/* 下拉筛选项 */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        aria-label="按材料类型筛选"
                        value={filters.category}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, category: e.target.value }))
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
                      >
                        <option value="全部">全部类型</option>
                        {allCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="按获奖年份筛选"
                        value={filters.year}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, year: e.target.value }))
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 tabular-nums focus:border-blue-600 focus:outline-none"
                      >
                        <option value="全部">全部年份</option>
                        {availableYears.map((y) => (
                          <option key={y} value={y}>
                            {y} 年
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="按奖项等级筛选"
                        value={filters.awardLevel}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            awardLevel: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
                      >
                        <option value="全部">全部等级</option>
                        {availableLevels.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>

                      {hasActiveFilter && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>重置</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 第二行：状态分段筛选 + 一键失效检测 + 导出 CSV */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center rounded-lg bg-slate-100 p-1">
                        {[
                          { id: 'all', label: '全部状态' },
                          { id: 'valid', label: '文件有效' },
                          { id: 'path_only', label: '仅路径' },
                          { id: 'missing', label: '已失效' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() =>
                              setFilters((f) => ({
                                ...f,
                                status: tab.id as FilterState['status'],
                              }))
                            }
                            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                              filters.status === tab.id
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <span className="text-xs text-slate-500 tabular-nums">
                        当前显示 {filteredAwards.length} / {awards.length} 条记录
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRunBrokenCheck}
                        disabled={checking || awards.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
                        <span>{checking ? '检测中...' : '一键失效检测'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => exportAwardsToCSV(filteredAwards)}
                        disabled={filteredAwards.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-blue-700" />
                        <span>导出当前列表 CSV</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* 失效检测结果反馈条 */}
                {checkReport && (
                  <div
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                      checkReport.missing > 0
                        ? 'border-red-200 bg-red-50 text-red-900'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {checkReport.missing > 0 ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                      )}
                      <span className="tabular-nums">
                        检测完成（共 {checkReport.total} 条）：文件有效{' '}
                        {checkReport.valid} 条 · 仅路径登记{' '}
                        {checkReport.pathOnly} 条 · 失效或缺失{' '}
                        <strong>{checkReport.missing}</strong> 条
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {checkReport.missing > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setFilters((f) => ({ ...f, status: 'missing' }))
                          }
                          className="text-xs font-semibold underline hover:no-underline whitespace-nowrap shrink-0"
                        >
                          仅查看失效记录
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setCheckReport(null)}
                        className="text-xs text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0"
                      >
                        收起提示
                      </button>
                    </div>
                  </div>
                )}

                {/* 材料台账表格 */}
                <AwardTable
                  records={filteredAwards}
                  loading={loading}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  onOpenRecord={(rec) => setPreviewRecord(rec)}
                  onEditRecord={(rec) => {
                    setEditingRecord(rec);
                    setModalOpen(true);
                  }}
                  onDeleteRecord={(rec) => setDeleteTarget(rec)}
                  onAddNew={() => {
                    setEditingRecord(null);
                    setModalOpen(true);
                  }}
                />
              </>
            )}

            {activeView === 'stats' && <StatsView awards={awards} />}

            {activeView === 'backup' && (
              <BackupView
                awards={awards}
                onReplaceAll={handleReplaceAll}
                onMergeRecords={handleMergeRecords}
              />
            )}

            {activeView === 'desktop' && <DesktopGuideView />}
          </motion.div>
        </main>
      </div>

      {/* 新增 / 编辑弹窗 */}
      {modalOpen && (
        <AwardModal
          key={editingRecord?.id ?? 'new'}
          isOpen={modalOpen}
          editingRecord={editingRecord}
          categories={allCategories}
          onClose={() => {
            setModalOpen(false);
            setEditingRecord(null);
          }}
          onSave={handleSaveRecord}
        />
      )}

      {/* 打开 / 预览文件弹窗 */}
      {previewRecord && (
        <FilePreviewModal
          key={previewRecord.id}
          record={previewRecord}
          onClose={() => setPreviewRecord(null)}
          onEditRecord={(rec) => {
            setEditingRecord(rec);
            setModalOpen(true);
          }}
        />
      )}

      {/* 删除确认弹窗 */}
      <DeleteConfirmModal
        record={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
