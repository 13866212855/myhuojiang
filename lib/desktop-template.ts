export const PYTHON_DESKTOP_SOURCE = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
教师获奖材料管理系统（Windows 离线桌面版）
技术栈：Python 3 + Tkinter (ttk) + SQLite3
特点：纯本地离线运行，不复制/移动原文件，仅记录文件路径与基本信息；
     支持拖拽文件（安装 tkinterdnd2 后自动启用）、多文件关联、一键打开、
     打开所在文件夹、失效路径检测、CSV 导出与数据备份恢复。
"""

import os
import sys
import csv
import shutil
import sqlite3
import subprocess
from datetime import datetime
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

# 尝试加载拖拽扩展库 tkinterdnd2（未安装也可正常运行，自动降级为点击浏览）
try:
    from tkinterdnd2 import DND_FILES, TkinterDnD
    HAS_DND = True
except ImportError:
    HAS_DND = False

# 数据库放在程序同级目录，方便老师连同文件夹一起拷贝到 U 盘备份
if getattr(sys, "frozen", False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.path.join(BASE_DIR, "awards_archive.db")

DEFAULT_CATEGORIES = ["证书", "论文", "教学案例", "课题研究", "公开课/录像", "其他"]


class DatabaseManager:
    """SQLite 本地数据库管理类"""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.init_db()

    def get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def init_db(self):
        """初始化数据表：awards（主表）与 award_files（关联多文件表）"""
        with self.get_conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS awards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,              -- 材料名称（必填）
                    category TEXT NOT NULL,           -- 材料类型
                    award_level TEXT DEFAULT '',      -- 获奖名称/等级
                    award_date TEXT DEFAULT '',       -- 获奖日期 YYYY-MM-DD
                    issuer TEXT DEFAULT '',           -- 颁发单位
                    tags TEXT DEFAULT '',             -- 标签（逗号分隔）
                    notes TEXT DEFAULT '',            -- 备注
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS award_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    award_id INTEGER NOT NULL,
                    file_path TEXT NOT NULL,          -- 文件绝对路径（必填）
                    file_name TEXT NOT NULL,          -- 文件名
                    sort_order INTEGER DEFAULT 0,
                    FOREIGN KEY (award_id) REFERENCES awards(id) ON DELETE CASCADE
                );
                """
            )

    def fetch_awards(self, keyword="", category="全部", year="全部", level="全部", sort_by="award_date", sort_desc=True):
        """按条件检索并排序获奖材料"""
        with self.get_conn() as conn:
            sql = """
                SELECT a.*,
                       GROUP_CONCAT(f.file_path, ' || ') AS file_paths,
                       COUNT(f.id) AS file_count
                FROM awards a
                LEFT JOIN award_files f ON a.id = f.award_id
                WHERE 1=1
            """
            params = []

            if keyword.strip():
                kw = f"%{keyword.strip()}%"
                sql += " AND (a.title LIKE ? OR a.award_level LIKE ? OR a.issuer LIKE ? OR a.tags LIKE ? OR a.notes LIKE ? OR f.file_path LIKE ?)"
                params.extend([kw, kw, kw, kw, kw, kw])

            if category and category != "全部":
                sql += " AND a.category = ?"
                params.append(category)

            if year and year != "全部":
                sql += " AND substr(a.award_date, 1, 4) = ?"
                params.append(year)

            if level and level != "全部":
                sql += " AND a.award_level LIKE ?"
                params.append(f"%{level}%")

            sql += " GROUP BY a.id"

            allowed_sort = {"award_date": "a.award_date", "category": "a.category", "title": "a.title"}
            order_col = allowed_sort.get(sort_by, "a.award_date")
            direction = "DESC" if sort_desc else "ASC"
            sql += f" ORDER BY {order_col} {direction}, a.id DESC"

            rows = conn.execute(sql, params).fetchall()
            return [dict(row) for row in rows]

    def get_award_detail(self, award_id: int):
        with self.get_conn() as conn:
            award = conn.execute("SELECT * FROM awards WHERE id = ?", (award_id,)).fetchone()
            if not award:
                return None
            files = conn.execute(
                "SELECT * FROM award_files WHERE award_id = ? ORDER BY sort_order ASC, id ASC",
                (award_id,),
            ).fetchall()
            result = dict(award)
            result["files"] = [dict(f) for f in files]
            return result

    def save_award(self, data: dict, file_paths: list, award_id: int = None):
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self.get_conn() as conn:
            if award_id is None:
                cur = conn.execute(
                    """
                    INSERT INTO awards (title, category, award_level, award_date, issuer, tags, notes, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        data["title"],
                        data["category"],
                        data["award_level"],
                        data["award_date"],
                        data["issuer"],
                        data["tags"],
                        data["notes"],
                        now,
                        now,
                    ),
                )
                award_id = cur.lastrowid
            else:
                conn.execute(
                    """
                    UPDATE awards
                    SET title=?, category=?, award_level=?, award_date=?, issuer=?, tags=?, notes=?, updated_at=?
                    WHERE id=?
                    """,
                    (
                        data["title"],
                        data["category"],
                        data["award_level"],
                        data["award_date"],
                        data["issuer"],
                        data["tags"],
                        data["notes"],
                        now,
                        award_id,
                    ),
                )
                conn.execute("DELETE FROM award_files WHERE award_id = ?", (award_id,))

            for idx, path in enumerate(file_paths):
                clean_path = path.strip()
                if clean_path:
                    conn.execute(
                        "INSERT INTO award_files (award_id, file_path, file_name, sort_order) VALUES (?, ?, ?, ?)",
                        (award_id, clean_path, os.path.basename(clean_path), idx),
                    )
        return award_id

    def delete_award(self, award_id: int):
        with self.get_conn() as conn:
            conn.execute("DELETE FROM awards WHERE id = ?", (award_id,))

    def get_distinct_values(self):
        with self.get_conn() as conn:
            cats = [r[0] for r in conn.execute("SELECT DISTINCT category FROM awards WHERE category != ''").fetchall()]
            years = [
                r[0]
                for r in conn.execute(
                    "SELECT DISTINCT substr(award_date, 1, 4) AS y FROM awards WHERE length(award_date) >= 4 ORDER BY y DESC"
                ).fetchall()
                if r[0]
            ]
            levels = [r[0] for r in conn.execute("SELECT DISTINCT award_level FROM awards WHERE award_level != ''").fetchall()]
            return cats, years, levels

    def get_stats(self):
        with self.get_conn() as conn:
            by_cat = conn.execute("SELECT category, COUNT(*) AS cnt FROM awards GROUP BY category ORDER BY cnt DESC").fetchall()
            by_year = conn.execute(
                "SELECT COALESCE(NULLIF(substr(award_date, 1, 4), ''), '未填年份') AS yr, COUNT(*) AS cnt FROM awards GROUP BY yr ORDER BY yr DESC"
            ).fetchall()
            return [dict(r) for r in by_cat], [dict(r) for r in by_year]


def open_local_file(file_path: str):
    """使用系统默认程序直接打开文件"""
    if not os.path.exists(file_path):
        messagebox.showerror("文件不存在", f"找不到指定文件：\\n{file_path}\\n\\n文件可能已被移动、重命名或删除。")
        return
    try:
        if sys.platform.startswith("win"):
            os.startfile(file_path)
        elif sys.platform == "darwin":
            subprocess.Popen(["open", file_path])
        else:
            subprocess.Popen(["xdg-open", file_path])
    except Exception as e:
        messagebox.showerror("打开失败", f"无法打开文件：\\n{e}")


def open_containing_folder(file_path: str):
    """在文件管理器中定位并选中该文件"""
    folder = os.path.dirname(file_path)
    if sys.platform.startswith("win"):
        if os.path.exists(file_path):
            subprocess.Popen(["explorer", "/select,", os.path.normpath(file_path)])
        elif os.path.exists(folder):
            os.startfile(folder)
        else:
            messagebox.showerror("路径不存在", f"原文件夹也不存在：\\n{folder}")
    elif sys.platform == "darwin":
        if os.path.exists(file_path):
            subprocess.Popen(["open", "-R", file_path])
        elif os.path.exists(folder):
            subprocess.Popen(["open", folder])
    else:
        if os.path.exists(folder):
            subprocess.Popen(["xdg-open", folder])


class AwardFormDialog(tk.Toplevel):
    """新增 / 编辑获奖材料弹窗"""

    def __init__(self, parent, db: DatabaseManager, categories: list, award_id=None, on_saved=None):
        super().__init__(parent)
        self.db = db
        self.award_id = award_id
        self.on_saved = on_saved
        self.file_paths = []

        self.title("编辑获奖材料" if award_id else "新增获奖材料")
        self.geometry("660x560")
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()

        self._build_ui(categories)
        if award_id:
            self._load_existing()

    def _build_ui(self, categories):
        frame = ttk.Frame(self, padding=16)
        frame.pack(fill=tk.BOTH, expand=True)

        # 材料名称
        ttk.Label(frame, text="材料名称 *").grid(row=0, column=0, sticky=tk.W, pady=6)
        self.title_var = tk.StringVar()
        ttk.Entry(frame, textvariable=self.title_var, width=56).grid(row=0, column=1, columnspan=2, sticky=tk.EW, pady=6)

        # 材料类型（支持下拉或直接输入自定义类型）
        ttk.Label(frame, text="材料类型 *").grid(row=1, column=0, sticky=tk.W, pady=6)
        self.cat_var = tk.StringVar(value=categories[0] if categories else "证书")
        cat_combo = ttk.Combobox(frame, textvariable=self.cat_var, values=categories, width=24)
        cat_combo.grid(row=1, column=1, sticky=tk.W, pady=6)
        ttk.Label(frame, text="（可直接输入自定义类型）", foreground="#64748B").grid(row=1, column=2, sticky=tk.W, padx=6)

        # 获奖名称/等级
        ttk.Label(frame, text="获奖名称/等级").grid(row=2, column=0, sticky=tk.W, pady=6)
        self.level_var = tk.StringVar()
        ttk.Entry(frame, textvariable=self.level_var, width=56).grid(row=2, column=1, columnspan=2, sticky=tk.EW, pady=6)

        # 获奖日期
        ttk.Label(frame, text="获奖日期").grid(row=3, column=0, sticky=tk.W, pady=6)
        self.date_var = tk.StringVar(value=datetime.now().strftime("%Y-%m-%d"))
        ttk.Entry(frame, textvariable=self.date_var, width=26).grid(row=3, column=1, sticky=tk.W, pady=6)
        ttk.Label(frame, text="格式如：2025-11-18", foreground="#64748B").grid(row=3, column=2, sticky=tk.W, padx=6)

        # 颁发单位
        ttk.Label(frame, text="颁发单位").grid(row=4, column=0, sticky=tk.W, pady=6)
        self.issuer_var = tk.StringVar()
        ttk.Entry(frame, textvariable=self.issuer_var, width=56).grid(row=4, column=1, columnspan=2, sticky=tk.EW, pady=6)

        # 文件存放路径（支持多文件与拖拽）
        ttk.Label(frame, text="关联文件/路径 *").grid(row=5, column=0, sticky=tk.NW, pady=6)
        file_box = ttk.Frame(frame)
        file_box.grid(row=5, column=1, columnspan=2, sticky=tk.EW, pady=6)

        btn_row = ttk.Frame(file_box)
        btn_row.pack(fill=tk.X, pady=(0, 6))
        ttk.Button(btn_row, text="浏览选择文件（可多选）", command=self._browse_files).pack(side=tk.LEFT)
        ttk.Button(btn_row, text="移除选中", command=self._remove_selected_file).pack(side=tk.LEFT, padx=8)
        dnd_hint = "提示：可直接把电脑里的文件拖拽到下方列表框" if HAS_DND else "提示：点击“浏览选择文件”自动填入完整路径"
        ttk.Label(btn_row, text=dnd_hint, foreground="#475569").pack(side=tk.LEFT)

        self.file_listbox = tk.Listbox(file_box, height=5, selectmode=tk.SINGLE)
        self.file_listbox.pack(fill=tk.X)

        if HAS_DND:
            self.file_listbox.drop_target_register(DND_FILES)
            self.file_listbox.dnd_bind("<<Drop>>", self._on_drop_files)

        # 标签
        ttk.Label(frame, text="标签").grid(row=6, column=0, sticky=tk.W, pady=6)
        self.tags_var = tk.StringVar()
        ttk.Entry(frame, textvariable=self.tags_var, width=56).grid(row=6, column=1, columnspan=2, sticky=tk.EW, pady=6)

        # 备注
        ttk.Label(frame, text="备注说明").grid(row=7, column=0, sticky=tk.NW, pady=6)
        self.notes_text = tk.Text(frame, height=4, width=56, font=("Microsoft YaHei UI", 9))
        self.notes_text.grid(row=7, column=1, columnspan=2, sticky=tk.EW, pady=6)

        # 底部按钮
        footer = ttk.Frame(frame)
        footer.grid(row=8, column=0, columnspan=3, sticky=tk.E, pady=(14, 0))
        ttk.Button(footer, text="取消", command=self.destroy).pack(side=tk.RIGHT, padx=(8, 0))
        ttk.Button(footer, text="保存记录", command=self._submit).pack(side=tk.RIGHT)

        frame.columnconfigure(1, weight=1)

    def _browse_files(self):
        paths = filedialog.askopenfilenames(title="选择获奖材料文件（支持按住 Ctrl 多选）")
        for p in paths:
            norm = os.path.normpath(p)
            if norm not in self.file_paths:
                self.file_paths.append(norm)
                self.file_listbox.insert(tk.END, norm)
                if not self.title_var.get().strip():
                    self.title_var.set(os.path.splitext(os.path.basename(norm))[0])

    def _on_drop_files(self, event):
        raw = event.data
        # 解析 tkinterdnd2 返回的带花括号路径列表
        items = self.tk.splitlist(raw)
        for p in items:
            norm = os.path.normpath(p)
            if os.path.isfile(norm) and norm not in self.file_paths:
                self.file_paths.append(norm)
                self.file_listbox.insert(tk.END, norm)
                if not self.title_var.get().strip():
                    self.title_var.set(os.path.splitext(os.path.basename(norm))[0])

    def _remove_selected_file(self):
        sel = self.file_listbox.curselection()
        if not sel:
            return
        idx = sel[0]
        self.file_listbox.delete(idx)
        del self.file_paths[idx]

    def _load_existing(self):
        detail = self.db.get_award_detail(self.award_id)
        if not detail:
            return
        self.title_var.set(detail["title"])
        self.cat_var.set(detail["category"])
        self.level_var.set(detail["award_level"])
        self.date_var.set(detail["award_date"])
        self.issuer_var.set(detail["issuer"])
        self.tags_var.set(detail["tags"])
        self.notes_text.insert("1.0", detail["notes"])
        for f in detail["files"]:
            self.file_paths.append(f["file_path"])
            self.file_listbox.insert(tk.END, f["file_path"])

    def _submit(self):
        title = self.title_var.get().strip()
        cat = self.cat_var.get().strip() or "其他"
        if not title:
            messagebox.showwarning("缺少必填项", "请填写“材料名称”。")
            return
        if not self.file_paths:
            messagebox.showwarning("缺少文件路径", "请至少关联一个本地文件。")
            return

        data = {
            "title": title,
            "category": cat,
            "award_level": self.level_var.get().strip(),
            "award_date": self.date_var.get().strip(),
            "issuer": self.issuer_var.get().strip(),
            "tags": self.tags_var.get().strip(),
            "notes": self.notes_text.get("1.0", tk.END).strip(),
        }
        self.db.save_award(data, self.file_paths, self.award_id)
        if self.on_saved:
            self.on_saved()
        self.destroy()


class AwardManagerApp:
    """主界面窗口"""

    def __init__(self, root):
        self.root = root
        self.root.title("教师获奖材料管理系统（本地离线版）")
        self.root.geometry("1180x720")
        self.root.minsize(980, 600)

        self.db = DatabaseManager(DB_PATH)
        self.sort_by = "award_date"
        self.sort_desc = True
        self.check_executed = False

        self._setup_style()
        self._build_layout()
        self.refresh_filters()
        self.load_table()

    def _setup_style(self):
        style = ttk.Style()
        try:
            style.theme_use("vista" if sys.platform.startswith("win") else "clam")
        except Exception:
            pass
        default_font = ("Microsoft YaHei UI", 10)
        self.root.option_add("*Font", default_font)
        style.configure("Treeview", rowheight=32, font=("Microsoft YaHei UI", 10))
        style.configure("Treeview.Heading", font=("Microsoft YaHei UI", 10, "bold"))

    def _build_layout(self):
        # 顶部工具栏
        top_bar = ttk.Frame(self.root, padding=(14, 12, 14, 8))
        top_bar.pack(fill=tk.X)

        ttk.Label(top_bar, text="教师获奖材料管理台账", font=("Microsoft YaHei UI", 15, "bold")).pack(side=tk.LEFT)

        ttk.Button(top_bar, text="+ 新增材料", command=self.add_award).pack(side=tk.RIGHT)
        ttk.Button(top_bar, text="失效检测", command=self.check_broken_paths).pack(side=tk.RIGHT, padx=8)
        ttk.Button(top_bar, text="导出 CSV", command=self.export_csv).pack(side=tk.RIGHT)
        ttk.Button(top_bar, text="统计概览", command=self.show_stats).pack(side=tk.RIGHT, padx=8)
        ttk.Button(top_bar, text="备份/恢复", command=self.backup_restore_menu).pack(side=tk.RIGHT)

        # 搜索与筛选区
        filter_bar = ttk.Frame(self.root, padding=(14, 4, 14, 10))
        filter_bar.pack(fill=tk.X)

        ttk.Label(filter_bar, text="关键词：").pack(side=tk.LEFT)
        self.kw_var = tk.StringVar()
        kw_entry = ttk.Entry(filter_bar, textvariable=self.kw_var, width=26)
        kw_entry.pack(side=tk.LEFT, padx=(0, 12))
        kw_entry.bind("<KeyRelease>", lambda e: self.load_table())

        ttk.Label(filter_bar, text="类型：").pack(side=tk.LEFT)
        self.cat_filter = tk.StringVar(value="全部")
        self.cat_combo = ttk.Combobox(filter_bar, textvariable=self.cat_filter, state="readonly", width=12)
        self.cat_combo.pack(side=tk.LEFT, padx=(0, 12))
        self.cat_combo.bind("<<ComboboxSelected>>", lambda e: self.load_table())

        ttk.Label(filter_bar, text="年份：").pack(side=tk.LEFT)
        self.year_filter = tk.StringVar(value="全部")
        self.year_combo = ttk.Combobox(filter_bar, textvariable=self.year_filter, state="readonly", width=10)
        self.year_combo.pack(side=tk.LEFT, padx=(0, 12))
        self.year_combo.bind("<<ComboboxSelected>>", lambda e: self.load_table())

        ttk.Label(filter_bar, text="奖项等级：").pack(side=tk.LEFT)
        self.level_filter = tk.StringVar(value="全部")
        self.level_combo = ttk.Combobox(filter_bar, textvariable=self.level_filter, state="readonly", width=14)
        self.level_combo.pack(side=tk.LEFT, padx=(0, 12))
        self.level_combo.bind("<<ComboboxSelected>>", lambda e: self.load_table())

        ttk.Button(filter_bar, text="重置筛选", command=self.reset_filters).pack(side=tk.LEFT)

        # 中间表格区
        table_frame = ttk.Frame(self.root, padding=(14, 0, 14, 8))
        table_frame.pack(fill=tk.BOTH, expand=True)

        columns = ("title", "category", "award_level", "award_date", "issuer", "file_path", "status")
        self.tree = ttk.Treeview(table_frame, columns=columns, show="headings", selectmode="browse")

        self.tree.heading("title", text="材料名称（双击行直接打开）", command=lambda: self.toggle_sort("title"))
        self.tree.heading("category", text="类型 ⇅", command=lambda: self.toggle_sort("category"))
        self.tree.heading("award_level", text="获奖等级")
        self.tree.heading("award_date", text="获奖日期 ⇅", command=lambda: self.toggle_sort("award_date"))
        self.tree.heading("issuer", text="颁发单位")
        self.tree.heading("file_path", text="文件存放路径")
        self.tree.heading("status", text="状态")

        self.tree.column("title", width=260)
        self.tree.column("category", width=95, anchor=tk.CENTER)
        self.tree.column("award_level", width=120)
        self.tree.column("award_date", width=105, anchor=tk.CENTER)
        self.tree.column("issuer", width=150)
        self.tree.column("file_path", width=290)
        self.tree.column("status", width=85, anchor=tk.CENTER)

        self.tree.tag_configure("missing", foreground="#B91C1C", background="#FEF2F2")
        self.tree.tag_configure("valid", foreground="#15803D")

        vsb = ttk.Scrollbar(table_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        vsb.pack(side=tk.RIGHT, fill=tk.Y)

        self.tree.bind("<Double-1>", lambda e: self.open_selected_file())

        # 底部操作栏
        bottom_bar = ttk.Frame(self.root, padding=(14, 6, 14, 12))
        bottom_bar.pack(fill=tk.X)

        ttk.Button(bottom_bar, text="打开文件", command=self.open_selected_file).pack(side=tk.LEFT)
        ttk.Button(bottom_bar, text="打开所在文件夹", command=self.open_selected_folder).pack(side=tk.LEFT, padx=8)
        ttk.Button(bottom_bar, text="编辑记录", command=self.edit_selected).pack(side=tk.LEFT)
        ttk.Button(bottom_bar, text="删除记录", command=self.delete_selected).pack(side=tk.LEFT, padx=8)

        self.status_label = ttk.Label(bottom_bar, text="共 0 条记录", foreground="#475569")
        self.status_label.pack(side=tk.RIGHT)

    def refresh_filters(self):
        cats, years, levels = self.db.get_distinct_values()
        all_cats = list(dict.fromkeys(DEFAULT_CATEGORIES + cats))
        self.cat_combo["values"] = ["全部"] + all_cats
        self.year_combo["values"] = ["全部"] + years
        self.level_combo["values"] = ["全部"] + levels
        self.all_categories = all_cats

    def reset_filters(self):
        self.kw_var.set("")
        self.cat_filter.set("全部")
        self.year_filter.set("全部")
        self.level_filter.set("全部")
        self.load_table()

    def toggle_sort(self, col):
        if self.sort_by == col:
            self.sort_desc = not self.sort_desc
        else:
            self.sort_by = col
            self.sort_desc = True
        self.load_table()

    def load_table(self, run_check=False):
        for item in self.tree.get_children():
            self.tree.delete(item)

        rows = self.db.fetch_awards(
            keyword=self.kw_var.get(),
            category=self.cat_filter.get(),
            year=self.year_filter.get(),
            level=self.level_filter.get(),
            sort_by=self.sort_by,
            sort_desc=self.sort_desc,
        )

        missing_count = 0
        for r in rows:
            paths = [p for p in (r.get("file_paths") or "").split(" || ") if p]
            first_path = paths[0] if paths else ""
            display_path = first_path if len(paths) <= 1 else f"{first_path}（共{len(paths)}个文件）"

            status_text = "未检测"
            tag = ""
            if run_check or self.check_executed:
                all_ok = bool(paths) and all(os.path.exists(p) for p in paths)
                if all_ok:
                    status_text = "有效"
                    tag = "valid"
                else:
                    status_text = "文件失效"
                    tag = "missing"
                    missing_count += 1

            self.tree.insert(
                "",
                tk.END,
                iid=str(r["id"]),
                values=(
                    r["title"],
                    r["category"],
                    r["award_level"],
                    r["award_date"],
                    r["issuer"],
                    display_path,
                    status_text,
                ),
                tags=(tag,) if tag else (),
            )

        summary = f"共 {len(rows)} 条记录 | 数据库位置：{os.path.basename(DB_PATH)}"
        if run_check:
            summary = f"检测完成：共 {len(rows)} 条，失效 {missing_count} 条"
        self.status_label.config(text=summary)

    def _get_selected_id(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showinfo("提示", "请先在表格中点击选中一条记录。")
            return None
        return int(sel[0])

    def add_award(self):
        AwardFormDialog(self.root, self.db, self.all_categories, on_saved=self._after_change)

    def edit_selected(self):
        aid = self._get_selected_id()
        if aid is not None:
            AwardFormDialog(self.root, self.db, self.all_categories, award_id=aid, on_saved=self._after_change)

    def delete_selected(self):
        aid = self._get_selected_id()
        if aid is None:
            return
        if messagebox.askyesno("确认删除", "确定要删除这条获奖记录吗？（不会删除电脑里的原文件）"):
            self.db.delete_award(aid)
            self._after_change()

    def _after_change(self):
        self.refresh_filters()
        self.load_table()

    def open_selected_file(self):
        aid = self._get_selected_id()
        if aid is None:
            return
        detail = self.db.get_award_detail(aid)
        if not detail or not detail["files"]:
            messagebox.showwarning("无文件", "该记录尚未关联任何文件路径。")
            return
        if len(detail["files"]) == 1:
            open_local_file(detail["files"][0]["file_path"])
        else:
            # 多文件时让老师选择打开哪一个
            win = tk.Toplevel(self.root)
            win.title("选择要打开的关联文件")
            win.geometry("540x260")
            win.transient(self.root)
            win.grab_set()
            ttk.Label(win, text="该材料关联了多个文件，双击或选中后点击打开：", padding=12).pack(anchor=tk.W)
            lb = tk.Listbox(win, height=7)
            lb.pack(fill=tk.BOTH, expand=True, padx=12)
            for f in detail["files"]:
                lb.insert(tk.END, f["file_path"])
            lb.select_set(0)

            def do_open():
                s = lb.curselection()
                if s:
                    open_local_file(detail["files"][s[0]]["file_path"])

            lb.bind("<Double-1>", lambda e: do_open())
            ttk.Button(win, text="打开选中文件", command=do_open).pack(pady=10)

    def open_selected_folder(self):
        aid = self._get_selected_id()
        if aid is None:
            return
        detail = self.db.get_award_detail(aid)
        if detail and detail["files"]:
            open_containing_folder(detail["files"][0]["file_path"])

    def check_broken_paths(self):
        self.check_executed = True
        self.load_table(run_check=True)
        messagebox.showinfo("失效检测完成", "已完成全部路径检查！标红显示“文件失效”的记录表示原文件已被移动或删除。")

    def export_csv(self):
        save_path = filedialog.asksaveasfilename(
            title="导出获奖材料台账为 CSV（可用 Excel 直接打开）",
            defaultextension=".csv",
            initialfile=f"教师获奖材料台账_{datetime.now().strftime('%Y%m%d')}.csv",
            filetypes=[("CSV 表格文件", "*.csv")],
        )
        if not save_path:
            return
        rows = self.db.fetch_awards()
        with open(save_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["材料名称", "材料类型", "获奖等级", "获奖日期", "颁发单位", "关联文件路径", "标签", "备注"])
            for r in rows:
                writer.writerow([
                    r["title"],
                    r["category"],
                    r["award_level"],
                    r["award_date"],
                    r["issuer"],
                    (r.get("file_paths") or "").replace(" || ", " ; "),
                    r["tags"],
                    r["notes"],
                ])
        messagebox.showinfo("导出成功", f"已导出 {len(rows)} 条记录到：\\n{save_path}")

    def show_stats(self):
        by_cat, by_year = self.db.get_stats()
        win = tk.Toplevel(self.root)
        win.title("获奖材料统计概览")
        win.geometry("460x380")
        win.transient(self.root)

        text = tk.Text(win, padding=12) if False else tk.Text(win, padx=14, pady=12, font=("Microsoft YaHei UI", 10))
        text.pack(fill=tk.BOTH, expand=True)
        text.insert(tk.END, "【按材料类型统计】\\n")
        for row in by_cat:
            text.insert(tk.END, f"  • {row['category']}：{row['cnt']} 份\\n")
        text.insert(tk.END, "\\n【按获奖年份统计】\\n")
        for row in by_year:
            text.insert(tk.END, f"  • {row['yr']} 年：{row['cnt']} 份\\n")
        text.config(state=tk.DISABLED)

    def backup_restore_menu(self):
        win = tk.Toplevel(self.root)
        win.title("数据库备份与恢复")
        win.geometry("420x200")
        win.transient(self.root)
        win.grab_set()

        frame = ttk.Frame(win, padding=20)
        frame.pack(fill=tk.BOTH, expand=True)
        ttk.Label(frame, text=f"当前数据文件：{DB_PATH}", wraplength=370).pack(anchor=tk.W, pady=(0, 14))

        def do_backup():
            dst = filedialog.asksaveasfilename(
                title="保存数据备份",
                defaultextension=".db",
                initialfile=f"获奖材料备份_{datetime.now().strftime('%Y%m%d')}.db",
                filetypes=[("SQLite 数据库备份", "*.db")],
            )
            if dst:
                shutil.copy2(DB_PATH, dst)
                messagebox.showinfo("备份成功", f"已将全部记录备份至：\\n{dst}")

        def do_restore():
            src = filedialog.askopenfilename(title="选择要恢复的备份文件", filetypes=[("SQLite 数据库备份", "*.db")])
            if src and messagebox.askyesno("确认恢复", "恢复备份将覆盖当前全部记录，确定继续吗？"):
                shutil.copy2(src, DB_PATH)
                self._after_change()
                messagebox.showinfo("恢复成功", "数据已从备份文件恢复。")
                win.destroy()

        ttk.Button(frame, text="立即备份全部数据 (.db)", command=do_backup).pack(fill=tk.X, pady=6)
        ttk.Button(frame, text="从备份文件恢复数据", command=do_restore).pack(fill=tk.X, pady=6)


if __name__ == "__main__":
    root = TkinterDnD.Tk() if HAS_DND else tk.Tk()
    app = AwardManagerApp(root)
    root.mainloop()
`;

export const BUILD_BAT_SCRIPT = `@echo off
chcp 65001 > nul
echo ==========================================
echo 正在安装打包工具与可选拖拽支持库...
echo ==========================================
pip install pyinstaller tkinterdnd2

echo ==========================================
echo 正在打包为单个可双击运行的 .exe 文件...
echo ==========================================
pyinstaller --noconsole --onefile --name "教师获奖材料管理" award_manager.py

echo.
echo 打包完成！请打开当前目录下的 dist 文件夹，
echo 双击【教师获奖材料管理.exe】即可离线使用。
pause
`;
