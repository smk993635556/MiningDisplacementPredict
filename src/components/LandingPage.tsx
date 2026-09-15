import React from 'react';
import {
  ArrowRight,
  Layers,
  Cpu,
  Compass,
  FileSpreadsheet,
  TrendingDown,
  Calculator,
  Sliders,
  CheckCircle2,
  FileText,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface LandingPageProps {
  onEnterWorkbench: () => void;
  onLoadExampleAndEnter: () => void;
  onOpenHelp: () => void;
  onOpenAdvanced: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterWorkbench,
  onLoadExampleAndEnter,
  onOpenHelp,
  onOpenAdvanced,
}) => {
  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* 1. Clean, minimalist hero banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>通用矿井覆岩与地表沉陷预计系统</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            采动覆岩运移与地表沉陷耦合预计平台
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            面向不同矿井、不同地质采矿条件的通用数值预计平台。建立主关键层破断位移场与双介质（覆岩与松散层）二重积分传递函数耦合关系，实现地表下沉全盆地高效精确求解。
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onEnterWorkbench}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 group"
            >
              <span>进入计算工作台</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onLoadExampleAndEnter}
              className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
            >
              <span>载入标准算例并开始</span>
            </button>

            <button
              type="button"
              onClick={onOpenHelp}
              className="px-3.5 py-2.5 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors flex items-center gap-1.5"
            >
              <span>算法原理说明</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Subtle decorative background shape */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-80 h-80 rounded-full bg-blue-50/50 pointer-events-none -z-0" />
      </div>

      {/* 2. "10-Second Quick Orientation": 3 core pillars */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-4.5 h-4.5 text-blue-600" />
            <span>三步极简预计工作流</span>
          </h2>
          <span className="text-xs text-slate-400">10 秒快速上手</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: What to input */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 hover:border-blue-300 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">需要输入什么？</h3>
              <p className="text-xs text-slate-500 mt-1">三类必要工程数据：</p>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li><strong className="text-slate-800">开采尺寸：</strong>走向跨度 d、倾向跨度 m、煤层采高 M</li>
              <li><strong className="text-slate-800">覆岩结构：</strong>松散层厚度 H_l、主关键层上下基岩厚度</li>
              <li><strong className="text-slate-800">模型参数：</strong>断块长 L_PKS、碎胀系数 Kp_res 及主要影响角</li>
            </ul>
            <div className="pt-1 text-[11px] text-blue-600 font-medium">
              支持网页表单直接填写或一键导入 Excel
            </div>
          </div>

          {/* Card 2: Where to calculate */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 hover:border-blue-300 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">在哪里开始计算？</h3>
              <p className="text-xs text-slate-500 mt-1">左侧工作区一键启动：</p>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li><strong className="text-slate-800">智能校验：</strong>系统实时检查参数完整性与取值合法性</li>
              <li><strong className="text-slate-800">自动网格：</strong>根据开采尺寸与影响半径自适应设定网格</li>
              <li><strong className="text-slate-800">毫秒求解：</strong>基于复合 Simpson 1/3 积分分离等价算法</li>
            </ul>
            <div className="pt-1 text-[11px] text-indigo-600 font-medium">
              纯浏览器前端完成，无需后台排队等待
            </div>
          </div>

          {/* Card 3: What to see */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3 hover:border-blue-300 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">计算后能看到什么？</h3>
              <p className="text-xs text-slate-500 mt-1">右侧多维可视化交互：</p>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li><strong className="text-slate-800">核心指标：</strong>最大沉降量 W_max、极值坐标、10mm影响边界</li>
              <li><strong className="text-slate-800">图形展示：</strong>沉降等值线云图、走向/倾向断面、3D曲面</li>
              <li><strong className="text-slate-800">实测对比：</strong>实测点误差统计 (MAE/RMSE) 与残差柱状图</li>
            </ul>
            <div className="pt-1 text-[11px] text-emerald-600 font-medium">
              支持导出工程 Excel、网格数据 CSV 与预计报告
            </div>
          </div>
        </div>
      </div>

      {/* 3. Algorithmic Highlights (Clean & academic-distilled, no formula walls) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-4.5 h-4.5 text-blue-600" />
            <span>核心算法与理论特色</span>
          </h2>
          <button
            type="button"
            onClick={onOpenHelp}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <span>完整理论推导</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-blue-600 rounded-xs"></span>
              <span>主关键层非充分破断位移场</span>
            </div>
            <p className="leading-relaxed">
              根据主关键层下沉极限破断特征步距 L_PKS 与下伏垮落碎胀系数 Kp_res，构建沿走向与倾向对称渐变的破断沉陷场 W_PKS(η, ξ)，告别传统将煤层直接等效为均质下沉空间的假设。
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-xs"></span>
              <span>双介质扩散影响半径</span>
            </div>
            <p className="leading-relaxed">
              分别考虑基岩主要影响边界角 δ0 与深厚松散表土层主要移动角 φ，建立 r = H_PKS-u / tan(δ0) + H_l / tan(φ) 组合半径，精确刻画厚松散层覆岩沉降扩散特性。
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-emerald-600 rounded-xs"></span>
              <span>二重积分分离等价数值解法</span>
            </div>
            <p className="leading-relaxed">
              利用核函数在正交坐标轴上的可乘性，将二维复杂卷积积分解耦为走向与倾向两项独立的一维高斯型数值积分，结合复合 Simpson 1/3 算法实现高精度秒级收敛。
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-amber-600 rounded-xs"></span>
              <span>多源数据协同验证与反演</span>
            </div>
            <p className="leading-relaxed">
              支持现场水准实测点与合成基准点对比，自动核算 MAE、RMSE 及相对误差 MRE；内置参数校准器可对破断块长 L_PKS 及影响角开展反演优化。
            </p>
          </div>
        </div>
      </div>

      {/* 4. Bottom action bar */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>准备好开始工程预计了吗？直接进入工作台录入数据或载入标准算例。</span>
        </div>
        <button
          type="button"
          onClick={onEnterWorkbench}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <span>进入计算工作台</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
