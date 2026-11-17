'use client';

import React from 'react';
import {
  FolderArchive,
  BarChart3,
  DownloadCloud,
  MonitorDown,
  Award,
  X,
} from 'lucide-react';
import { ActiveView, AwardRecord } from '@/lib/types';

interface SidebarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  awards: AwardRecord[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  activeView,
  onSelectView,
  awards,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    {
      id: 'list',
      label: '材料台账列表',
      icon: <FolderArchive className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'stats',
      label: '年份与类型统计',
      icon: <BarChart3 className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'backup',
      label: '导出与备份恢复',
      icon: <DownloadCloud className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'desktop',
      label: '桌面版源码 (.exe)',
      icon: <MonitorDown className="h-4 w-4 shrink-0" />,
    },
  ];

  const categoryCounts = awards.reduce<Record<string, number>>((acc, item) => {
    const key = item.category || '其他';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const missingCount = awards.filter((a) =>
    a.files.some((f) => f.status === 'missing')
  ).length;

  const content = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200 px-4 py-5">
      <div className="space-y-6">
        {/* 品牌标识 */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
              <Award className="h-4 w-4" />
            </div>
            <span className="truncate text-base font-bold tracking-tight text-slate-900">
              教研获奖档案库
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="关闭导航菜单"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 主导航 */}
        <nav aria-label="主导航" className="space-y-1">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 简洁分类概览（纯文本分隔，无药丸标签） */}
        <div className="border-t border-slate-200 pt-5 px-2">
          <p className="mb-3 text-xs font-semibold text-slate-500">
            材料分类概览
          </p>
          <dl className="space-y-2 text-sm">
            {Object.entries(categoryCounts).length === 0 ? (
              <p className="text-xs text-slate-400">暂无材料记录</p>
            ) : (
              Object.entries(categoryCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between text-slate-600"
                  >
                    <dt className="truncate pr-2">{cat}</dt>
                    <dd className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                      {count} 份
                    </dd>
                  </div>
                ))
            )}
          </dl>
        </div>
      </div>

      {/* 底部本地状态摘要 */}
      <div className="border-t border-slate-200 pt-4 px-2 space-y-1.5 text-xs text-slate-500">
        <div className="flex items-center justify-between">
          <span>台账总数</span>
          <span className="font-mono font-medium text-slate-900 tabular-nums">
            {awards.length} 条
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>失效路径</span>
          <span
            className={`font-mono font-medium tabular-nums ${
              missingCount > 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {missingCount} 条
          </span>
        </div>
        <p className="pt-1 text-[11px] leading-relaxed text-slate-400">
          离线本地存储于浏览器数据库，无需联网与注册账号。
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* 桌面端固定侧边栏 */}
      <aside className="hidden lg:block w-60 shrink-0">{content}</aside>

      {/* 移动端抽屉 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw]">{content}</aside>
        </div>
      )}
    </>
  );
}
