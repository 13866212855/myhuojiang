import { AwardRecord, AttachedFile, FileValidityStatus } from './types';

const DB_NAME = 'teacher_award_archive_db';
const DB_VERSION = 1;
const STORE_RECORDS = 'awards';
const STORE_HANDLES = 'file_handles';
const STORE_BLOBS = 'file_blobs';
const SEED_FLAG_KEY = 'teacher_award_archive_seeded_v1';
const CUSTOM_CATS_KEY = 'teacher_award_archive_custom_cats_v1';

// 仅在首次打开时预置示例数据，方便教师直观体验
export function getSampleAwards(): AwardRecord[] {
  return [
    {
      id: 'sample-1',
      title: '2025年全市中小学教师教学能力大赛教学设计一等奖',
      category: '证书',
      awardLevel: '市级一等奖',
      awardDate: '2025-11-18',
      issuer: '市教育局教学研究室',
      files: [
        {
          id: 'sf-1a',
          name: '教学能力大赛一等奖证书扫描件.pdf',
          path: 'D:\\教学档案\\2025获奖证书\\市级教学能力大赛一等奖.pdf',
          status: 'path_only',
          statusMessage: '已登记本地路径（桌面版可直接打开；网页版可关联本地文件）',
        },
        {
          id: 'sf-1b',
          name: '参赛教学设计定稿.docx',
          path: 'D:\\教学档案\\2025参赛材料\\教学设计定稿.docx',
          status: 'path_only',
          statusMessage: '已登记本地路径',
        },
      ],
      tags: ['教学比赛', '职称评审', '骨干教师'],
      notes: '年度考核与高级职称评审核心佐证材料，含比赛获奖证书及参赛教案原稿。',
      createdAt: '2025-11-20T09:00:00.000Z',
      updatedAt: '2025-11-20T09:00:00.000Z',
    },
    {
      id: 'sample-2',
      title: '核心素养导向下的初中数学大单元教学实践探索',
      category: '论文',
      awardLevel: '省级期刊发表',
      awardDate: '2025-06-15',
      issuer: '《中学数学教学参考》编辑部',
      files: [
        {
          id: 'sf-2a',
          name: '大单元教学实践论文终稿.pdf',
          path: 'D:\\教研论文\\2025发表\\大单元教学实践探索_录用版.pdf',
          status: 'path_only',
          statusMessage: '已登记本地路径',
        },
        {
          id: 'sf-2b',
          name: '期刊封面及目录扫描件.jpg',
          path: 'D:\\教研论文\\2025发表\\期刊封面目录.jpg',
          status: 'path_only',
          statusMessage: '已登记本地路径',
        },
      ],
      tags: ['教研论文', '大单元教学'],
      notes: '独立作者发表，CN刊号已收录，期刊封面与正文分开扫描存档。',
      createdAt: '2025-06-20T10:30:00.000Z',
      updatedAt: '2025-06-20T10:30:00.000Z',
    },
    {
      id: 'sample-3',
      title: '跨学科融合课程《生活中的几何对称》精品教学案例',
      category: '教学案例',
      awardLevel: '省级二等奖',
      awardDate: '2024-12-05',
      issuer: '省教育科学研究院',
      files: [
        {
          id: 'sf-3a',
          name: '省级精品教学案例获奖证书.jpg',
          path: 'E:\\备份资料\\2024教学案例\\省级二等奖证书.jpg',
          status: 'missing',
          statusMessage: '示例失效状态：原路径文件可能已被移动至新硬盘或重命名',
        },
      ],
      tags: ['跨学科', '精品案例'],
      notes: '此前保存在移动硬盘 E 盘，建议重新关联位置或更新路径。',
      createdAt: '2024-12-10T14:20:00.000Z',
      updatedAt: '2024-12-10T14:20:00.000Z',
    },
    {
      id: 'sample-4',
      title: '“双减”背景下分层作业设计与有效反馈机制研究结题证书',
      category: '课题研究',
      awardLevel: '市级二等奖',
      awardDate: '2024-09-22',
      issuer: '市教育科学规划领导小组',
      files: [
        {
          id: 'sf-4a',
          name: '市级规划课题结题证书.pdf',
          path: 'D:\\课题研究\\2024分层作业课题\\结题证书扫描.pdf',
          status: 'path_only',
          statusMessage: '已登记本地路径',
        },
      ],
      tags: ['课题结题', '分层作业'],
      notes: '主持市级规划课题，排名第一。',
      createdAt: '2024-09-25T16:00:00.000Z',
      updatedAt: '2024-09-25T16:00:00.000Z',
    },
    {
      id: 'sample-5',
      title: '2023学年校级优秀班主任荣誉证书',
      category: '证书',
      awardLevel: '校级荣誉',
      awardDate: '2024-01-18',
      issuer: '实验中学',
      files: [
        {
          id: 'sf-5a',
          name: '优秀班主任证书.jpg',
          path: 'D:\\教学档案\\2023年度荣誉\\优秀班主任.jpg',
          status: 'path_only',
          statusMessage: '已登记本地路径',
        },
      ],
      tags: ['班主任', '年度考核'],
      notes: '年度考核优秀配套证书。',
      createdAt: '2024-01-20T08:45:00.000Z',
      updatedAt: '2024-01-20T08:45:00.000Z',
    },
    {
      id: 'sample-6',
      title: '国家级“一师一优课”部级优课教学实录与反思',
      category: '公开课/录像',
      awardLevel: '国家级二等奖',
      awardDate: '2023-10-12',
      issuer: '教育部基础教育司',
      files: [
        {
          id: 'sf-6a',
          name: '部级优课证书电子版.pdf',
          path: 'D:\\教学档案\\2023部级优课\\电子证书.pdf',
          status: 'path_only',
          statusMessage: '已登记本地路径',
        },
      ],
      tags: ['优课', '示范课'],
      notes: '含课堂实录配套PPT和教学反思。',
      createdAt: '2023-10-15T11:10:00.000Z',
      updatedAt: '2023-10-15T11:10:00.000Z',
    },
  ];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB 不可用'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_HANDLES)) {
        db.createObjectStore(STORE_HANDLES);
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('打开本地数据库失败'));
  });
}

export async function loadAllAwards(): Promise<AwardRecord[]> {
  try {
    const db = await openDatabase();
    const records = await new Promise<AwardRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readonly');
      const store = tx.objectStore(STORE_RECORDS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as AwardRecord[]) || []);
      req.onerror = () => reject(req.error);
    });

    const hasSeeded = localStorage.getItem(SEED_FLAG_KEY);
    if (records.length === 0 && !hasSeeded) {
      const samples = getSampleAwards();
      await saveAllAwards(samples);
      localStorage.setItem(SEED_FLAG_KEY, '1');
      return samples;
    }
    return records;
  } catch {
    const fallback = localStorage.getItem('teacher_award_archive_fallback_v1');
    if (fallback) {
      return JSON.parse(fallback) as AwardRecord[];
    }
    const samples = getSampleAwards();
    localStorage.setItem('teacher_award_archive_fallback_v1', JSON.stringify(samples));
    return samples;
  }
}

export async function saveAwardRecord(record: AwardRecord): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readwrite');
      tx.objectStore(STORE_RECORDS).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    localStorage.setItem(SEED_FLAG_KEY, '1');
  } catch {
    const current = await loadAllAwards();
    const idx = current.findIndex((r) => r.id === record.id);
    if (idx >= 0) current[idx] = record;
    else current.unshift(record);
    localStorage.setItem('teacher_award_archive_fallback_v1', JSON.stringify(current));
  }
}

export async function saveAllAwards(records: AwardRecord[]): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_RECORDS, 'readwrite');
      const store = tx.objectStore(STORE_RECORDS);
      store.clear();
      for (const rec of records) {
        store.put(rec);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    localStorage.setItem(SEED_FLAG_KEY, '1');
  } catch {
    localStorage.setItem('teacher_award_archive_fallback_v1', JSON.stringify(records));
  }
}

export async function deleteAwardRecord(id: string, fileIds: string[]): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_RECORDS, STORE_HANDLES, STORE_BLOBS], 'readwrite');
      tx.objectStore(STORE_RECORDS).delete(id);
      for (const fid of fileIds) {
        tx.objectStore(STORE_HANDLES).delete(fid);
        tx.objectStore(STORE_BLOBS).delete(fid);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const current = await loadAllAwards();
    const filtered = current.filter((r) => r.id !== id);
    localStorage.setItem('teacher_award_archive_fallback_v1', JSON.stringify(filtered));
  }
}

export async function saveFileHandle(fileId: string, handle: FileSystemFileHandle): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_HANDLES, 'readwrite');
      tx.objectStore(STORE_HANDLES).put(handle, fileId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 部分浏览器隐私模式下可能不支持持久化文件句柄
  }
}

export async function getFileHandle(fileId: string): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDatabase();
    return await new Promise<FileSystemFileHandle | null>((resolve) => {
      const tx = db.transaction(STORE_HANDLES, 'readonly');
      const req = tx.objectStore(STORE_HANDLES).get(fileId);
      req.onsuccess = () => resolve((req.result as FileSystemFileHandle) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveFileBlob(fileId: string, file: File): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readwrite');
      tx.objectStore(STORE_BLOBS).put(file, fileId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 忽略存储超限错误
  }
}

export async function getFileBlob(fileId: string): Promise<File | Blob | null> {
  try {
    const db = await openDatabase();
    return await new Promise<File | Blob | null>((resolve) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const req = tx.objectStore(STORE_BLOBS).get(fileId);
      req.onsuccess = () => resolve((req.result as File | Blob) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function verifySingleFile(file: AttachedFile): Promise<AttachedFile> {
  const now = new Date().toISOString();

  // 1. 优先检查本地 FileSystemFileHandle（直接关联电脑磁盘真实文件）
  if (file.hasLocalHandle) {
    const handle = await getFileHandle(file.id);
    if (!handle) {
      return {
        ...file,
        status: 'missing',
        lastCheckedAt: now,
        statusMessage: '本地文件句柄已丢失，请重新关联文件',
      };
    }
    try {
      const f = await handle.getFile();
      return {
        ...file,
        size: f.size,
        mimeType: f.type,
        status: 'valid',
        lastCheckedAt: now,
        statusMessage: '本地磁盘文件验证通过，可直接打开',
      };
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError') {
        return {
          ...file,
          status: 'path_only',
          lastCheckedAt: now,
          statusMessage: '需要点击打开以重新授权访问本地文件',
        };
      }
      return {
        ...file,
        status: 'missing',
        lastCheckedAt: now,
        statusMessage: '文件已被移动、重命名或删除',
      };
    }
  }

  // 2. 检查浏览器本地缓存文件（拖拽或常规选取的文件）
  if (file.hasLocalBlob) {
    const blob = await getFileBlob(file.id);
    if (blob) {
      return {
        ...file,
        status: 'valid',
        lastCheckedAt: now,
        statusMessage: '本地离线缓存文件有效，可直接预览打开',
      };
    }
    return {
      ...file,
      status: 'missing',
      lastCheckedAt: now,
      statusMessage: '本地缓存文件缺失，请重新添加',
    };
  }

  // 3. 保留手写标记为 missing 的状态或路径检查
  if (file.status === 'missing') {
    return {
      ...file,
      lastCheckedAt: now,
      statusMessage: file.statusMessage || '文件缺失或路径已变更，请核实',
    };
  }

  // 4. 仅记录文本路径（浏览器安全限制无法静默读取盘符绝对路径，需通过“浏览”或桌面版检查）
  const looksValidPath = /^([a-zA-Z]:\\|\/|\\\\)/.test(file.path.trim());
  if (!looksValidPath && file.path.trim().length < 2) {
    return {
      ...file,
      status: 'missing',
      lastCheckedAt: now,
      statusMessage: '文件路径格式不完整',
    };
  }

  return {
    ...file,
    status: 'path_only',
    lastCheckedAt: now,
    statusMessage: '已记录磁盘路径（受浏览器安全限制，文本路径需在 Windows 桌面版中实时校验磁盘文件）',
  };
}

export function getRecordOverallStatus(record: AwardRecord): FileValidityStatus {
  if (!record.files || record.files.length === 0) return 'missing';
  if (record.files.some((f) => f.status === 'missing')) return 'missing';
  if (record.files.every((f) => f.status === 'valid')) return 'valid';
  if (record.files.some((f) => f.status === 'path_only')) return 'path_only';
  return 'unchecked';
}

export function loadCustomCategories(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CATS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomCategory(category: string): string[] {
  const clean = category.trim();
  if (!clean) return loadCustomCategories();
  const current = loadCustomCategories();
  if (!current.includes(clean)) {
    const next = [...current, clean];
    localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(next));
    return next;
  }
  return current;
}

export function exportAwardsToCSV(records: AwardRecord[]): void {
  const headers = [
    '材料名称',
    '材料类型',
    '获奖名称/等级',
    '获奖日期',
    '颁发单位',
    '关联文件数量',
    '文件存放路径',
    '标签',
    '备注',
    '路径状态',
  ];

  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const statusTextMap: Record<FileValidityStatus, string> = {
    valid: '有效',
    missing: '失效/缺失',
    path_only: '仅路径记录',
    unchecked: '未检测',
  };

  const rows = records.map((r) => {
    const paths = r.files.map((f) => f.path || f.name).join(' ; ');
    const status = statusTextMap[getRecordOverallStatus(r)];
    return [
      r.title,
      r.category,
      r.awardLevel,
      r.awardDate,
      r.issuer,
      r.files.length,
      paths,
      r.tags.join('、'),
      r.notes,
      status,
    ]
      .map(escapeCell)
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCell).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `教师获奖材料台账_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAwardsToJSON(records: AwardRecord[]): void {
  const payload = {
    app: '教师获奖材料管理系统',
    exportedAt: new Date().toISOString(),
    count: records.length,
    records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `获奖材料备份_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getFolderPath(fullPath: string): string {
  const trimmed = fullPath.trim();
  const lastBackslash = trimmed.lastIndexOf('\\');
  const lastSlash = trimmed.lastIndexOf('/');
  const idx = Math.max(lastBackslash, lastSlash);
  if (idx <= 0) return trimmed;
  return trimmed.slice(0, idx);
}
