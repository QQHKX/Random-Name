/**
 * 存储配置文件
 * 管理应用的存储相关设置
 */

/**
 * 历史记录存储配置
 */
export const STORAGE_CONFIG = {
  /** 历史记录最大存储条数 - 默认2000条（从200条增加） */
  MAX_HISTORY_RECORDS: 2000,
  
  /** 本地存储键名前缀 */
  STORAGE_KEY_PREFIX: 'csgo-roll-call-app',
  
  /** 存储版本号 */
  STORAGE_VERSION: 1,
} as const;

/**
 * 获取历史记录存储限制
 * @returns 最大存储条数
 */
export function getMaxHistoryRecords(): number {
  return STORAGE_CONFIG.MAX_HISTORY_RECORDS;
}

/**
 * 验证存储限制是否合理
 * @param limit 存储限制数量
 * @returns 是否合理
 */
export function isValidStorageLimit(limit: number): boolean {
  return limit > 0 && limit <= 10000 && Number.isInteger(limit);
}

/**
 * 格式化存储大小显示
 * @param recordCount 记录数量
 * @returns 格式化的存储大小描述
 */
export function formatStorageSize(recordCount: number): string {
  if (recordCount < 1000) {
    return `${recordCount} 条记录`;
  } else if (recordCount < 10000) {
    return `${(recordCount / 1000).toFixed(1)}K 条记录`;
  } else {
    return `${(recordCount / 10000).toFixed(1)}W 条记录`;
  }
}