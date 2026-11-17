'use client';

import React from 'react';
import { AwardRecord } from '@/lib/types';

interface StatsViewProps {
  awards: AwardRecord[];
}

export default function StatsView({ awards }: StatsViewProps) {
  const totalFiles = awards.reduce((sum, a) => sum + a.files.length, 0);
  const missingRecords = awards.filter((a) =>
    a.files.some((f) => f.status === 'missing')
  ).length;

  // 按年份统计
  const yearMap = awards.reduce<Record<string, number>>((acc, a) => {
    const y = a.awardDate && a.awardDate.length >= 4 ? a.awardDate.slice(0, 4) : '未填年份';
    acc[y] = (acc[y] || 0) + 1;
    return acc;
  }, {});
  const yearStats = Object.entries(yearMap).sort((a, b) => b[0].localeCompare(a[0]));
  const maxYearCount = Math.max(1, ...yearStats.map(([, c]) => c));

  // 按类型统计
  const catMap = awards.reduce<Record<string, number>>((acc, a) => {
    const c = a.category || '其他';
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const catStats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxCatCount = Math.max(1, ...catStats.map(([, c]) => c));

  // 按获奖等级统计
  const levelMap = awards.reduce<Record<string, number>>((acc, a) => {
    const lvl = a.awardLevel.trim() || '未标注等级';
    acc[lvl] = (acc[lvl] || 0) + 1;
    return acc;
  }, {});
  const levelStats = Object.entries(levelMap).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* 顶部汇总数字条 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium text-slate-500">已登记材料总数</p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {awards.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium text-slate-500">关联本地文件数</p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {totalFiles}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium text-slate-500">覆盖获奖年份</p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {yearStats.filter(([y]) => y !== '未填年份').length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-medium text-slate-500">路径失效待处理</p>
          <p
            className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${
              missingRecords > 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {missingRecords}
          </p>
        </div>
      </div>

      {/* 年份与类型分布 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 按年份 */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              按获奖年份分布
            </h3>
            <span className="text-xs text-slate-500 tabular-nums">
              共 {yearStats.length} 个年度
            </span>
          </div>
          {yearStats.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">暂无统计数据</p>
          ) : (
            <div className="space-y-3.5">
              {yearStats.map(([year, count]) => {
                const pct = Math.round((count / maxYearCount) * 100);
                return (
                  <div key={year} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800 tabular-nums">
                        {year === '未填年份' ? year : `${year} 年`}
                      </span>
                      <span className="font-mono text-xs text-slate-600 tabular-nums">
                        {count} 份（{awards.length > 0 ? Math.round((count / awards.length) * 100) : 0}%）
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-700 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 按材料类型 */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              按材料类型分布
            </h3>
            <span className="text-xs text-slate-500 tabular-nums">
              共 {catStats.length} 类
            </span>
          </div>
          {catStats.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">暂无统计数据</p>
          ) : (
            <div className="space-y-3.5">
              {catStats.map(([cat, count]) => {
                const pct = Math.round((count / maxCatCount) * 100);
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{cat}</span>
                      <span className="font-mono text-xs text-slate-600 tabular-nums">
                        {count} 份（{awards.length > 0 ? Math.round((count / awards.length) * 100) : 0}%）
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-800 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 按获奖等级明细表 */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            按获奖等级汇总明细
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-2.5 pl-6 pr-4">获奖名称 / 等级</th>
                <th className="px-4 py-2.5 text-right">材料数量</th>
                <th className="py-2.5 pl-4 pr-6 text-right">占比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {levelStats.map(([lvl, count]) => (
                <tr key={lvl} className="hover:bg-slate-50">
                  <td className="py-2.5 pl-6 pr-4 font-medium text-slate-800">
                    {lvl}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-700 tabular-nums">
                    {count} 份
                  </td>
                  <td className="py-2.5 pl-4 pr-6 text-right font-mono text-slate-500 tabular-nums">
                    {awards.length > 0
                      ? ((count / awards.length) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
