import React from 'react';
import { VERSION_DISPLAY } from '../config/version';

/**
 * 页脚组件接口定义
 */
interface FooterProps {
  className?: string;
}

/**
 * 页脚组件 - 包含版本信息、作者信息、友情链接和备案号
 * @param props - 组件属性
 * @returns JSX.Element
 */
const Footer: React.FC<FooterProps> = ({ className = '' }) => {

  return (
    <footer className={`bg-[var(--csgo-panel)]/90 backdrop-blur-xl border-t border-white/10 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-white/60 text-sm">
            © {new Date().getFullYear()} <a href="https://qqhkx.com" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white/80 transition-colors">QQHKX</a>. 保留所有权利。
          </div>
          <div className="flex items-center gap-4 text-white/40 text-sm">
             <span>{VERSION_DISPLAY}</span>
             <span>•</span>
             <span>Made by <a href="https://qqhkx.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/60 transition-colors">QQHKX</a></span>
           </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;