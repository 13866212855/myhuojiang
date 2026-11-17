# 教师获奖材料管理系统

一款专为教师打造的本地离线「获奖材料管理」台账工具，支持快速登记荣誉证书、教研论文、教学案例与课题结题等材料的电脑存放位置，解决文件散落难找的痛点。

## 主要功能

1. **材料登记与多文件关联**：记录材料名称、类型（支持自定义）、获奖等级、获奖日期、颁发单位、文件存放路径、标签与备注；支持拖拽或浏览选取文件，单条材料可关联多个附件（如证书扫描件 + 论文原稿）。
2. **多维检索与排序**：支持按关键词、材料类型、获奖年份、奖项等级及路径状态筛选，并支持按日期、类型、名称排序。
3. **一键打开与路径复制**：双击表格记录直接打开/预览文件，支持一键复制所在文件夹路径。
4. **失效检测**：一键检查已关联的本地文件句柄与路径状态，标出失效或缺失的记录。
5. **统计概览与备份导出**：自动按年份、材料类型和获奖等级统计数量；支持导出带 UTF-8 BOM 的 CSV 表格（Excel/WPS 双击直接打开不乱码），支持 JSON 全量备份与恢复。
6. **内置 Windows 桌面版源码与 `.exe` 打包脚本**：可在左侧导航「桌面版源码 (.exe)」直接下载 Python + Tkinter + SQLite 桌面版源码及一键打包脚本。

## 本地开发运行

```bash
npm install --legacy-peer-deps
npm run dev
```

访问 `http://localhost:3000` 即可使用。

## Docker 容器化与一键部署说明

本项目采用 **多阶段 Dockerfile**（基于 `node:22-bookworm-slim` 与 Next.js `standalone` 产物），构建阶段严格按照 `package-lock.json` 执行 `npm ci --legacy-peer-deps` 精确安装依赖。

### 重要提示：依赖锁文件

- 仓库中已生成 `package-lock.json`。如果后续修改了 `package.json` 或删除过锁文件，**务必先在本地执行以下命令重新生成锁文件（必须带 `--legacy-peer-deps`）**，再运行部署脚本：

```bash
npm install --legacy-peer-deps --package-lock-only
```

### 1. 本地 Windows 一键部署（`redeploy.bat`）

- 镜像名 / 容器名：`myhuojiang`
- 宿主机访问端口：`7900`（容器内部端口 `3000`）
- 数据持久化目录：`D:\docker\myhuojiang\data`

确保 Windows 上已启动 **Docker Desktop**，然后直接双击根目录的 **`redeploy.bat`**，等待构建与健康检查完成后访问 `http://localhost:7900`。

### 2. 远程 Linux 服务器一键部署（`upload2remote.bat`）

- 目标服务器：`172.29.173.42`（端口 `7900`）
- 数据持久化目录：`/bak/docker/myhuojiang/data`

直接双击 **`upload2remote.bat`**，脚本会自动完成本地构建、导出镜像包、`scp` 上传及远程容器重建，完成后访问 `http://172.29.173.42:7900`。
