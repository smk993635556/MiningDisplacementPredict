import React from 'react';
import { X, Calculator, Cpu, Sigma, Hash, HelpCircle, Compass } from 'lucide-react';
import { DerivedParams, ModelInputs, CalculationGridResult } from '../types.ts';

interface DetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: ModelInputs;
  derived: DerivedParams;
  gridResult: CalculationGridResult | null;
}

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
  isOpen,
  onClose,
  inputs,
  derived,
  gridResult,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">模型计算详情与派生参数</h3>
              <p className="text-[11px] text-slate-500">主关键层动力学派生值及二重积分分离指标</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Section 1: 6 Derived Parameters */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-slate-900 font-bold border-b border-slate-100 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Sigma className="w-3.5 h-3.5 text-blue-600" />
                6 项核心派生参数
              </span>
              <span className="text-[10px] text-slate-400 font-normal">双精度浮点计算</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div className="text-[10px] text-slate-500">主关键层最大下沉 (w_PKS)</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {derived.wPKS.toFixed(4)} <span className="text-[10px] font-normal text-slate-500">m</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">M - H_PKS-d·(Kp_res-1)</div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div className="text-[10px] text-slate-500">主要影响半径 (r)</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {derived.r.toFixed(4)} <span className="text-[10px] font-normal text-slate-500">m</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">基岩与松散层等价扩散</div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div className="text-[10px] text-slate-500">破断走向跨度 (L_z)</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {derived.Lz.toFixed(4)} <span className="text-[10px] font-normal text-slate-500">m</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">d - 2·H_PKS-d / tanθ</div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div className="text-[10px] text-slate-500">破断倾向跨度 (L_q)</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {derived.Lq.toFixed(4)} <span className="text-[10px] font-normal text-slate-500">m</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">m - 2·H_PKS-d / tanθ</div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div className="text-[10px] text-slate-500">走向半积分边界 (D_f)</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {derived.Df.toFixed(4)} <span className="text-[10px] font-normal text-slate-500">m</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">(L_z + 2·L_PKS) / 2</div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div className="text-[10px] text-slate-500">倾向半积分边界 (M_f)</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {derived.Mf.toFixed(4)} <span className="text-[10px] font-normal text-slate-500">m</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">(L_q + 2·L_PKS) / 2</div>
              </div>
            </div>
          </div>

          {/* Section 2: Mathematical Expressions */}
          <div className="space-y-2">
            <div className="text-slate-900 font-bold border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              解析公式与等价分离
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200 font-mono text-[11px] space-y-1.5 leading-relaxed text-slate-800">
              <div>
                <span className="text-slate-400"># 关键层破断位移场:</span>
                <br />
                W_PKS(η, ξ) = w_PKS · F(η, Lz) · F(ξ, Lq)
              </div>
              <div className="pt-1">
                <span className="text-slate-400"># 边界过渡函数:</span>
                <br />
                F(u, L) = 1 - [1 + exp((L - |2u|) / (0.5·L_PKS) - 2)]⁻¹
              </div>
              <div className="pt-1">
                <span className="text-slate-400"># 地表二重积分等价分离:</span>
                <br />
                W(x, y) = η_s · w_PKS · A_x(x) · A_y(y)
              </div>
            </div>
          </div>

          {/* Section 3: Numerical Integration Metrics */}
          {gridResult && gridResult.xs && gridResult.ys && (
            <div className="space-y-2">
              <div className="text-slate-900 font-bold border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                数值积分与网格信息
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-500">Simpson 子区间数:</span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {inputs.grid.simpsonSubintervals} 等分
                  </div>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-500">计算耗时:</span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {gridResult.computeTimeMs.toFixed(1)} ms
                  </div>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-500">走向网格点数:</span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {gridResult.xs.length} 点 (步长 {inputs.grid.xStep}m)
                  </div>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-500">倾向网格点数:</span>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {gridResult.ys.length} 点 (步长 {inputs.grid.yStep}m)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
