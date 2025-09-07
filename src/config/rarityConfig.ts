/**
 * 稀有度概率配置文件
 * 统一管理所有稀有度相关的概率设置
 */

/**
 * 稀有度概率配置
 * 调低了稀有度概率，使高稀有度更加稀有
 */
export const RARITY_PROBABILITIES = {
  /** 蓝色（军规级）概率 - 从60%调整为70% */
  BLUE: 0.70,
  /** 紫色（受限级）概率 - 从20%调整为18% */
  PURPLE: 0.18,
  /** 粉色（保密级）概率 - 从12%调整为8% */
  PINK: 0.08,
  /** 红色（隐秘级）概率 - 从7%调整为3.5% */
  RED: 0.035,
  /** 金色（极其罕见特殊物品）概率 - 从1%调整为0.5% */
  GOLD: 0.005
} as const;

/**
 * 累积概率配置（用于随机抽取）
 * 基于RARITY_PROBABILITIES自动计算
 */
export const CUMULATIVE_PROBABILITIES = {
  BLUE: RARITY_PROBABILITIES.BLUE,
  PURPLE: RARITY_PROBABILITIES.BLUE + RARITY_PROBABILITIES.PURPLE,
  PINK: RARITY_PROBABILITIES.BLUE + RARITY_PROBABILITIES.PURPLE + RARITY_PROBABILITIES.PINK,
  RED: RARITY_PROBABILITIES.BLUE + RARITY_PROBABILITIES.PURPLE + RARITY_PROBABILITIES.PINK + RARITY_PROBABILITIES.RED,
  GOLD: 1.0 // 总概率为100%
} as const;

/**
 * 验证概率配置的有效性
 * 确保所有概率之和等于1
 */
function validateProbabilities(): boolean {
  const total = Object.values(RARITY_PROBABILITIES).reduce((sum, prob) => sum + prob, 0);
  const tolerance = 0.001; // 允许的误差范围
  return Math.abs(total - 1.0) < tolerance;
}

// 在模块加载时验证概率配置
if (!validateProbabilities()) {
  console.warn('警告：稀有度概率配置不正确，总和不等于1.0');
  console.log('当前概率配置：', RARITY_PROBABILITIES);
  console.log('概率总和：', Object.values(RARITY_PROBABILITIES).reduce((sum, prob) => sum + prob, 0));
}

/**
 * 稀有度类型定义（重新导出以保持一致性）
 */
export type Rarity = 'blue' | 'purple' | 'pink' | 'red' | 'gold';

/**
 * 根据配置的概率生成随机稀有度
 * 使用累积概率分布进行抽取
 * @returns {Rarity} 随机生成的稀有度
 */
export function drawRarity(): Rarity {
  const random = Math.random();
  
  if (random < CUMULATIVE_PROBABILITIES.BLUE) return 'blue';
  if (random < CUMULATIVE_PROBABILITIES.PURPLE) return 'purple';
  if (random < CUMULATIVE_PROBABILITIES.PINK) return 'pink';
  if (random < CUMULATIVE_PROBABILITIES.RED) return 'red';
  return 'gold';
}

/**
 * 获取稀有度的概率值
 * @param rarity 稀有度类型
 * @returns 对应的概率值（0-1之间）
 */
export function getRarityProbability(rarity: Rarity): number {
  switch (rarity) {
    case 'blue': return RARITY_PROBABILITIES.BLUE;
    case 'purple': return RARITY_PROBABILITIES.PURPLE;
    case 'pink': return RARITY_PROBABILITIES.PINK;
    case 'red': return RARITY_PROBABILITIES.RED;
    case 'gold': return RARITY_PROBABILITIES.GOLD;
    default: return 0;
  }
}

/**
 * 获取稀有度的百分比字符串
 * @param rarity 稀有度类型
 * @returns 格式化的百分比字符串
 */
export function getRarityPercentage(rarity: Rarity): string {
  const probability = getRarityProbability(rarity);
  return `${(probability * 100).toFixed(1)}%`;
}

/**
 * 磨损等级定义
 */
export type WearLevel = 'factory-new' | 'minimal-wear' | 'field-tested' | 'well-worn' | 'battle-scarred';

/**
 * 磨损等级配置
 */
export const WEAR_LEVELS = {
  'factory-new': { min: 0.00, max: 0.07, label: '崭新出厂', color: '#00FF00' },
  'minimal-wear': { min: 0.07, max: 0.15, label: '略有磨损', color: '#7FFF00' },
  'field-tested': { min: 0.15, max: 0.38, label: '久经沙场', color: '#FFFF00' },
  'well-worn': { min: 0.38, max: 0.45, label: '破损不堪', color: '#FF7F00' },
  'battle-scarred': { min: 0.45, max: 1.00, label: '战痕累累', color: '#FF0000' }
} as const;

/**
 * 磨损等级概率配置
 */
export const WEAR_PROBABILITIES = {
  'factory-new': 0.15,    // 15%
  'minimal-wear': 0.25,   // 25%
  'field-tested': 0.35,   // 35%
  'well-worn': 0.20,      // 20%
  'battle-scarred': 0.05  // 5%
} as const;

/**
 * 磨损等级累积概率
 */
export const WEAR_CUMULATIVE_PROBABILITIES = {
  'factory-new': WEAR_PROBABILITIES['factory-new'],
  'minimal-wear': WEAR_PROBABILITIES['factory-new'] + WEAR_PROBABILITIES['minimal-wear'],
  'field-tested': WEAR_PROBABILITIES['factory-new'] + WEAR_PROBABILITIES['minimal-wear'] + WEAR_PROBABILITIES['field-tested'],
  'well-worn': WEAR_PROBABILITIES['factory-new'] + WEAR_PROBABILITIES['minimal-wear'] + WEAR_PROBABILITIES['field-tested'] + WEAR_PROBABILITIES['well-worn'],
  'battle-scarred': 1.0
} as const;

/**
 * 生成随机磨损等级
 * @returns {WearLevel} 随机磨损等级
 */
export function drawWearLevel(): WearLevel {
  const random = Math.random();
  
  if (random < WEAR_CUMULATIVE_PROBABILITIES['factory-new']) return 'factory-new';
  if (random < WEAR_CUMULATIVE_PROBABILITIES['minimal-wear']) return 'minimal-wear';
  if (random < WEAR_CUMULATIVE_PROBABILITIES['field-tested']) return 'field-tested';
  if (random < WEAR_CUMULATIVE_PROBABILITIES['well-worn']) return 'well-worn';
  return 'battle-scarred';
}

/**
 * 生成随机磨损值
 * @param wearLevel 磨损等级
 * @returns {number} 磨损值（0-1之间）
 */
export function generateWearValue(wearLevel: WearLevel): number {
  const config = WEAR_LEVELS[wearLevel];
  return Math.random() * (config.max - config.min) + config.min;
}

/**
 * 根据磨损值获取磨损等级
 * @param wearValue 磨损值
 * @returns {WearLevel} 对应的磨损等级
 */
export function getWearLevelFromValue(wearValue: number): WearLevel {
  for (const [level, config] of Object.entries(WEAR_LEVELS)) {
    if (wearValue >= config.min && wearValue < config.max) {
      return level as WearLevel;
    }
  }
  return 'battle-scarred'; // 默认返回最高磨损
}

/**
 * 获取磨损等级的显示信息
 * @param wearLevel 磨损等级
 * @returns 磨损等级的配置信息
 */
export function getWearLevelInfo(wearLevel: WearLevel) {
  return WEAR_LEVELS[wearLevel];
}