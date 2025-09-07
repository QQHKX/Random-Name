import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * 稀有度类型（CSGO 风格）
 */
export type Rarity = 'blue' | 'purple' | 'pink' | 'red' | 'gold';

/**
 * 动画速度设置
 */
export type Speed = 'slow' | 'normal' | 'fast';

/**
 * 学生实体
 */
export interface Student {
  id: string;
  name: string;
  avatarUrl?: string;
  starred?: boolean; // Star Student™ 标记
}

/**
 * 设置项
 */
export interface AppSettings {
  className: string;
  noRepeat: boolean;
  speed: Speed;
  bgmVolume: number; // 0..1
  sfxVolume: number; // 0..1
}

/**
 * 抽取结果
 */
export interface RollResult {
  studentId: string;
  rarity: Rarity;
  timestamp: number;
}

/**
 * Store 状态与方法定义
 */
interface AppState {
  // 数据
  roster: Student[];
  pool: string[]; // 当前抽奖池 studentId 列表（用于不重复模式）
  settings: AppSettings;
  history: RollResult[];
  lastResult?: RollResult;

  // 选择器（派生）
  selectedStudent?: Student;

  // 方法
  /** 新增学生 */
  addStudent: (name: string, avatarUrl?: string) => Student;
  /** 删除学生 */
  removeStudent: (id: string) => void;
  /** 切换星标 */
  toggleStar: (id: string) => void;
  /** 从纯文本导入（一行一个姓名），返回导入数量 */
  importFromText: (text: string) => number;
  /** 覆盖式导入：用传入文本替换现有 roster，返回导入数量 */
  replaceRosterFromText: (text: string) => number;
  /** 导出为纯文本（每行一个姓名） */
  exportToText: () => string;
  /** 重置抽奖池（用于不重复模式） */
  resetPool: () => void;
  /** 设置班级名称 */
  setClassName: (name: string) => void;
  /** 设置动画速度 */
  setSpeed: (speed: Speed) => void;
  /** 设置音量（0..1） */
  setVolumes: (bgm: number, sfx: number) => void;
  /** 切换/设置不重复模式 */
  toggleNoRepeat: (value?: boolean) => void;
  /** 抽取下一个学生，返回结果 */
  drawNext: () => RollResult | undefined;
  /** 清空历史记录 */
  clearHistory: () => void;
}

/**
 * 生成唯一 ID（基于时间戳+随机数）
 */
function uid(prefix = 'stu'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 按默认概率生成稀有度
 * 概率：blue 60%, purple 20%, pink 12%, red 7%, gold 1%
 */
function drawRarity(): Rarity {
  const r = Math.random();
  if (r < 0.60) return 'blue';
  if (r < 0.80) return 'purple';
  if (r < 0.92) return 'pink';
  if (r < 0.99) return 'red';
  return 'gold';
}

/**
 * 规范化音量（0..1）
 */
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * 持久化状态类型（仅包含需要持久化的字段）
 */
type PersistedState = {
  roster: Student[];
  settings: AppSettings;
  history: RollResult[];
  pool: string[];
};

/**
 * 创建持久化存储（localStorage）
 */
const storage = createJSONStorage<PersistedState>(() => localStorage);

/**
 * 创建全局 Store（Zustand + persist）
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      roster: [],
      pool: [],
      settings: {
        className: 'CLASS A',
        noRepeat: true,
        speed: 'normal',
        bgmVolume: 0.2,
        sfxVolume: 0.6,
      },
      history: [],
      lastResult: undefined,
      selectedStudent: undefined,

      /**
       * 新增学生
       */
      addStudent: (name, avatarUrl) => {
        const student: Student = { id: uid(), name: name.trim(), avatarUrl, starred: false };
        set((state) => {
          const roster = [...state.roster, student];
          // 如果不重复模式，新增学生也加入池
          const pool = state.settings.noRepeat ? [...state.pool, student.id] : state.pool;
          return { roster, pool } as Partial<AppState>;
        });
        return student;
      },

      /**
       * 删除学生
       */
      removeStudent: (id) => {
        set((state) => {
          const roster = state.roster.filter((s) => s.id !== id);
          const pool = state.pool.filter((sid) => sid !== id);
          // 如果删除的是选中学生，清空选择
          let updates: Partial<AppState> = { roster, pool };
          if (state.lastResult?.studentId === id) {
            updates = { ...updates, lastResult: undefined, selectedStudent: undefined };
          }
          return updates;
        });
      },

      /**
       * 切换星标
       */
      toggleStar: (id) => {
        set((state) => ({
          roster: state.roster.map((s) => (s.id === id ? { ...s, starred: !s.starred } : s)),
        }));
      },

      /**
       * 从纯文本导入（一行一个姓名）
       */
      importFromText: (text) => {
        const names = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        let count = 0;
        names.forEach((n) => {
          const student: Student = { id: uid(), name: n, starred: false };
          set((state) => ({
            roster: [...state.roster, student],
            pool: state.settings.noRepeat ? [...state.pool, student.id] : state.pool,
          }));
          count += 1;
        });
        return count;
      },

      /**
       * 覆盖式导入：将传入文本解析为名单并替换现有 roster
       * - 每行一个姓名，跳过空行
       * - 替换后重置 pool 为新名单（与是否开启不重复无关，保持一致起点）
       * - 清空 lastResult 与 selectedStudent
       * @param text 文本，每行一个姓名
       * @returns 导入的条目数量
       */
      replaceRosterFromText: (text) => {
        const names = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        const newRoster: Student[] = names.map((n) => ({ id: uid(), name: n, starred: false }));
        const noRepeat = get().settings.noRepeat;
        const newPool = noRepeat ? newRoster.map((s) => s.id) : [];
        set(() => ({
          roster: newRoster,
          pool: newPool,
          lastResult: undefined,
          selectedStudent: undefined,
        }));
        return newRoster.length;
      },

      /**
       * 导出到纯文本（每行一个姓名）
       */
      exportToText: () => {
        const { roster } = get();
        return roster.map((s) => s.name).join('\n');
      },

      /**
       * 重置抽奖池
       */
      resetPool: () => {
        set((state) => ({ pool: state.roster.map((s) => s.id) }));
      },

      /**
       * 设置班级名称
       */
      setClassName: (name) => {
        set((state) => ({ settings: { ...state.settings, className: name.trim() || 'CLASS A' } }));
      },

      /**
       * 设置动画速度
       */
      setSpeed: (speed) => {
        set((state) => ({ settings: { ...state.settings, speed } }));
      },

      /**
       * 设置音量（0..1）
       */
      setVolumes: (bgm, sfx) => {
        set((state) => ({
          settings: { ...state.settings, bgmVolume: clamp01(bgm), sfxVolume: clamp01(sfx) },
        }));
      },

      /**
       * 切换/设置不重复模式
       */
      toggleNoRepeat: (value) => {
        set((state) => {
          const noRepeat = typeof value === 'boolean' ? value : !state.settings.noRepeat;
          const updates: Partial<AppState> = { settings: { ...state.settings, noRepeat } };
          // 开启时构建池，关闭时清空池
          if (noRepeat) {
            updates.pool = state.roster.map((s) => s.id);
          } else {
            updates.pool = [];
          }
          return updates;
        });
      },

      /**
       * 抽取下一个学生
       */
      drawNext: () => {
        const state = get();
        const sourceIds = state.settings.noRepeat
          ? (state.pool.length ? state.pool : state.roster.map((s) => s.id))
          : state.roster.map((s) => s.id);

        if (sourceIds.length === 0) return undefined;

        const idx = Math.floor(Math.random() * sourceIds.length);
        const studentId = sourceIds[idx];
        const student = state.roster.find((s) => s.id === studentId);
        if (!student) return undefined;

        const rarity = drawRarity();
        const result: RollResult = { studentId, rarity, timestamp: Date.now() };

        set((s) => {
          // 更新池（不重复模式下移除选中者）
          const nextPool = s.settings.noRepeat
            ? (s.pool.length ? s.pool : s.roster.map((it) => it.id)).filter((id) => id !== studentId)
            : s.pool;
          return {
            pool: nextPool,
            lastResult: result,
            selectedStudent: student,
            history: [...s.history, result].slice(-200),
          } as Partial<AppState>;
        });

        return result;
      },

      /**
       * 清空历史记录
       */
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'csgo-roll-call-app-v1',
      version: 1,
      storage,
      partialize: (state) => ({
        roster: state.roster,
        settings: state.settings,
        history: state.history,
        pool: state.pool,
      }),
      onRehydrateStorage: () => (_, error) => {
        if (error) {
          console.warn('[persist] Rehydrate error:', error);
        } else {
          // 确保池与设置一致（例如用户开启了不重复但池为空）
          const s = useAppStore.getState();
          if (s.settings.noRepeat && s.pool.length === 0 && s.roster.length > 0) {
            s.resetPool();
          }
        }
      },
    },
  ),
);