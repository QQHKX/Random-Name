import packageJson from '../../package.json';

/**
 * 版本信息配置
 * 自动从 package.json 读取版本号并格式化
 */
export interface VersionInfo {
  /** 版本号 */
  version: string;
  /** 格式化的版本显示文本 */
  displayText: string;
  /** 构建时间 */
  buildTime: string;
}

/**
 * 获取当前应用版本信息
 * @returns 版本信息对象
 */
export const getVersionInfo = (): VersionInfo => {
  const version = packageJson.version || '1.0.0';
  const buildTime = new Date().toLocaleDateString('zh-CN');
  
  return {
    version,
    displayText: `V${version}`,
    buildTime
  };
};

/**
 * 当前版本信息
 */
export const versionInfo = getVersionInfo();

/**
 * 版本号（简化访问）
 */
export const VERSION = versionInfo.version;

/**
 * 显示文本（简化访问）
 */
export const VERSION_DISPLAY = versionInfo.displayText;