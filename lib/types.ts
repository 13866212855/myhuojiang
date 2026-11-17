export type FileValidityStatus = 'unchecked' | 'valid' | 'missing' | 'path_only';

export interface AttachedFile {
  id: string;
  name: string;
  path: string;
  size?: number;
  mimeType?: string;
  hasLocalHandle?: boolean;
  hasLocalBlob?: boolean;
  status: FileValidityStatus;
  lastCheckedAt?: string;
  statusMessage?: string;
}

export interface AwardRecord {
  id: string;
  title: string; // 材料名称（必填）
  category: string; // 材料类型（证书 / 论文 / 教学案例 / 其他，可自定义）
  awardLevel: string; // 获奖名称/等级（如：市级一等奖）
  awardDate: string; // 获奖日期 YYYY-MM-DD
  issuer: string; // 颁发单位
  files: AttachedFile[]; // 关联文件列表（至少一个路径/文件）
  tags: string[]; // 标签
  notes: string; // 备注
  createdAt: string;
  updatedAt: string;
}

export type SortField = 'awardDate' | 'category' | 'title' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  keyword: string;
  category: string;
  year: string;
  awardLevel: string;
  status: 'all' | 'valid' | 'missing' | 'path_only';
}

export type ActiveView = 'list' | 'stats' | 'backup' | 'desktop';

export const DEFAULT_CATEGORIES = ['证书', '论文', '教学案例', '课题研究', '公开课/录像', '其他'];

export const COMMON_AWARD_LEVELS = [
  '国家级一等奖',
  '国家级二等奖',
  '省级一等奖',
  '省级二等奖',
  '省级三等奖',
  '市级一等奖',
  '市级二等奖',
  '市级三等奖',
  '区县级一等奖',
  '校级荣誉',
  '核心期刊发表',
  '省级期刊发表',
];
