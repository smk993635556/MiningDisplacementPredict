import React from 'react';
import { X, BookOpen, Compass, Calculator, Layers, HelpCircle, CheckCircle2 } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">平台使用帮助与计算方法说明</h2>
              <p className="text-xs text-slate-500">采动覆岩运移—地表沉陷耦合预计模型理论、算法与操作指引</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Section 1: 3-Step Workflow */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-4">
            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-2">
              <Compass className="w-4 h-4 text-blue-600" />
              三步极简操作流程
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded border border-blue-100 shadow-2xs">
                <div className="font-semibold text-blue-800 mb-1">第一步：输入工程数据</div>
                <div className="text-slate-600 leading-relaxed">
                  选择“直接填写参数”录入工作面尺寸与覆岩结构；或选择“导入项目 Excel”一键读取参数、地层表与实测点。
                </div>
              </div>
              <div className="bg-white p-3 rounded border border-blue-100 shadow-2xs">
                <div className="font-semibold text-blue-800 mb-1">第二步：检查并开始预计</div>
                <div className="text-slate-600 leading-relaxed">
                  系统自动校验参数物理合法性并生成自适应计算网格。点击“开始预计”触发浏览器本地高精度双重积分。
                </div>
              </div>
              <div className="bg-white p-3 rounded border border-blue-100 shadow-2xs">
                <div className="font-semibold text-blue-800 mb-1">第三步：查看预计结果</div>
                <div className="text-slate-600 leading-relaxed">
                  直观查看最大沉降量、极值位置与沉降边界；通过标签切换沉降等值线云图、走向/倾向断面图、3D曲面及实测对比。
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Mathematical Theory & Integral Separation */}
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-blue-600" />
              耦合预计模型核心算法
            </h3>
            <div className="space-y-3 leading-relaxed text-slate-600">
              <p>
                本平台严格实现采动覆岩运移与地表沉陷耦合预计模型。模型摒弃了传统概率积分法直接将煤层采空视为均匀微单元下沉的经验简化，
                建立了<strong>主关键层破断下沉场</strong>与<strong>覆岩及松散层二重积分传递函数</strong>的严格物理力学耦合表达。
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs font-mono text-slate-800">
                <div className="font-semibold text-slate-900 font-sans text-sm">地表沉陷二重积分方程：</div>
                <div>
                  W(x, y) = (η_s / r²) · ∬ WPKS(η, ξ) · exp[-π ((x-η)² + (y-ξ)²) / r²] dη dξ
                </div>
                <div className="text-slate-500 font-sans pt-1">
                  采用等价分离算法，将二维积分拆解为走向与倾向两项相互独立的一维积分卷积，利用复合 Simpson 1/3 数值积分在浏览器实现毫秒级求解。
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded">
                  <div className="font-semibold text-slate-900 mb-1">主关键层下沉场 W_PKS(η, ξ)</div>
                  <p className="text-slate-600">
                    W_PKS(η, ξ) = w_PKS · F(η, Lz) · F(ξ, Lq)
                    <br />
                    其中 w_PKS = M - H_PKS-d · (Kp_res - 1)，考虑下伏垮落岩层残余碎胀充填后的有效破断下沉极值。
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded">
                  <div className="font-semibold text-slate-900 mb-1">双介质主要影响半径 r</div>
                  <p className="text-slate-600">
                    r = H_PKS-u / tan(δ0) + H_l / tan(φ)
                    <br />
                    分别刻画主关键层上方坚硬基岩层与深厚表土松散层的差异化扩散移动传播规律。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Coordinate System & Downward Positive Convention */}
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Compass className="w-4 h-4 text-blue-600" />
              坐标系统与沉降符号约定
            </h3>
            <ul className="space-y-2 text-slate-600 leading-relaxed text-xs">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>地表坐标系：</strong>以工作面开采几何中心在地表的垂直投影为坐标原点 (0, 0)。x 轴为工作面走向方向（单位 m），y 轴为工作面倾向方向（单位 m）。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>关键层坐标系：</strong>以主关键层几何中心为原点，η 为走向，ξ 为倾向（单位 m）。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>沉降符号约定：</strong>严格执行采矿沉陷行业标准，沉降值<strong>向下为正</strong>，数值越大代表下沉量越深（单位 m）。
                </span>
              </li>
            </ul>
          </div>

          {/* Section 4: Stratum Table Role */}
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-blue-600" />
              地层表在计算中的角色
            </h3>
            <p className="text-slate-600 leading-relaxed text-xs">
              地层表并非装饰。系统依据钻孔柱状由浅至深的顺序，自动解析并计算模型所需的关键结构参数：
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="font-semibold text-slate-900">H_l (松散层厚度)：</span>
                <p className="text-slate-600 mt-1">顶部所有连续标记为“松散层”的土层厚度之和。</p>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="font-semibold text-slate-900">H_PKS-u (主关键层上基岩)：</span>
                <p className="text-slate-600 mt-1">松散层底界面至主关键层上表面之间的坚硬基岩总厚度。</p>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="font-semibold text-slate-900">H_PKS-d (主关键层下岩层)：</span>
                <p className="text-slate-600 mt-1">主关键层下表面至目标煤层顶板之间的覆岩总厚度。</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-medium transition-colors"
          >
            知道了，返回预计平台
          </button>
        </div>
      </div>
    </div>
  );
};
