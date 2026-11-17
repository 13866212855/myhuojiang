'use client';

import React, { useState } from 'react';
import { Download, Copy, Check, Database, Terminal, Layers } from 'lucide-react';
import { PYTHON_DESKTOP_SOURCE, BUILD_BAT_SCRIPT } from '@/lib/desktop-template';

export default function DesktopGuideView() {
  const [copiedCode, setCopiedCode] = useState(false);

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(PYTHON_DESKTOP_SOURCE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // 忽略剪贴板权限拒绝
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 顶部方案说明与一键下载 */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Windows 离线桌面版方案：Python + Tkinter + SQLite
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              如果您希望在 Windows 10/11 电脑上双击独立软件图标运行、直接读取 D 盘/E 盘文件并调用系统资源管理器“打开所在文件夹”，可以直接下载下方打包好的完整源代码，按照零基础三步指引生成 <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">.exe</code> 可执行程序。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                downloadTextFile('award_manager.py', PYTHON_DESKTOP_SOURCE)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              <span>下载源码 award_manager.py</span>
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTextFile('一键打包成exe.bat', BUILD_BAT_SCRIPT)
              }
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Terminal className="h-4 w-4" />
              <span>下载一键打包脚本 (.bat)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 零基础安装与打包步骤 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Layers className="h-5 w-5 text-blue-700" />
            <h3 className="text-base font-semibold">零基础安装与打包 .exe 三步走</h3>
          </div>
          <ol className="space-y-3 text-sm text-slate-700 leading-relaxed list-decimal list-inside">
            <li>
              <span className="font-semibold text-slate-900">安装 Python 环境：</span>
              前往官网下载 Python 3.11+ 安装包，安装时务必勾选底部的{' '}
              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                Add python.exe to PATH
              </span>
              ，其余一直点下一步即可。
            </li>
            <li>
              <span className="font-semibold text-slate-900">准备文件：</span>
              在桌面新建一个文件夹（如“获奖管理程序”），将上方下载的{' '}
              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                award_manager.py
              </span>{' '}
              和{' '}
              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                一键打包成exe.bat
              </span>{' '}
              放进去。
            </li>
            <li>
              <span className="font-semibold text-slate-900">双击生成 .exe：</span>
              直接双击运行{' '}
              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                一键打包成exe.bat
              </span>
              ，等待约 1 分钟自动完成。完成后打开文件夹内的{' '}
              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                dist
              </span>{' '}
              目录，即可看到独立运行的{' '}
              <span className="font-semibold text-slate-900">
                教师获奖材料管理.exe
              </span>
              ！
            </li>
          </ol>
        </section>

        {/* SQLite 数据表结构设计 */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Database className="h-5 w-5 text-slate-700" />
            <h3 className="text-base font-semibold">本地数据库表设计 (SQLite)</h3>
          </div>
          <p className="text-sm text-slate-600">
            采用“主表 + 关联文件子表”双表结构，天然支持一份获奖材料关联多份文件（如证书扫描件 + 论文原稿）：
          </p>
          <div className="space-y-3 font-mono text-xs text-slate-700">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 mb-1">
                1. awards（材料主表）
              </p>
              <p className="leading-relaxed">
                id (主键) · title (材料名称) · category (材料类型) · award_level (获奖等级) · award_date (获奖日期) · issuer (颁发单位) · tags (标签) · notes (备注)
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900 mb-1">
                2. award_files（关联文件子表）
              </p>
              <p className="leading-relaxed">
                id (主键) · award_id (外键关联主表) · file_path (电脑绝对路径) · file_name (文件名) · sort_order (排序)
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* 源代码在线预览与复制 */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5">
          <span className="font-mono text-xs font-semibold text-slate-700">
            award_manager.py（完整桌面版源码，含中文注释）
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            {copiedCode ? (
              <Check className="h-3.5 w-3.5 text-emerald-700" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedCode ? '已复制全部代码' : '复制完整代码'}</span>
          </button>
        </div>
        <pre className="max-h-[420px] overflow-auto bg-slate-900 p-5 font-mono text-xs leading-relaxed text-slate-100">
          <code>{PYTHON_DESKTOP_SOURCE}</code>
        </pre>
      </section>
    </div>
  );
}
