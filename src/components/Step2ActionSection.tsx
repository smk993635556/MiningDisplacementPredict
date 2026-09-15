import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sliders,
  Cpu,
  HelpCircle,
} from 'lucide-react';
import { ModelInputs, GridConfig, ValidationResult } from '../types.ts';

interface Step2ActionSectionProps {
  inputs: ModelInputs;
  validation: ValidationResult;
  isComputing: boolean;
  onCompute: () => void;
  onUpdateGrid: (patch: Partial<GridConfig>) => void;
  onResetAdaptiveGrid: () => void;
}

export const Step2ActionSection: React.FC<Step2ActionSectionProps> = ({
  inputs,
  validation,
  isComputing,
  onCompute,
  onUpdateGrid,
  onResetAdaptiveGrid,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { valid, errors, warnings } = validation;

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            2
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">第二步：检查并开始预计</h2>
            <p className="text-[11px] text-slate-500">
              系统自动校验参数物理完整性，点击按钮一键启动复合 Simpson 高精度二重积分求解
            </p>
          </div>
        </div>

        {/* Status Chip */}
        <div>
          {valid ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-semibold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>输入完整，可以开始预计</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-semibold shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>需完善输入参数 ({errors.length} 项)</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Validation Errors or Alerts */}
        {!valid && (
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1.5 text-amber-900">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>请检查并补全以下参数方可启动预计计算：</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 pl-1">
              {errors.map((err, idx) => (
                <li key={idx} className="leading-relaxed">
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Big Action Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onCompute}
            disabled={!valid || isComputing}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2.5 ${
              !valid
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                : isComputing
                ? 'bg-blue-500 text-white cursor-wait animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white hover:shadow-lg active:scale-[0.99]'
            }`}
          >
            {isComputing ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>正在执行二重积分数值求解 (Simpson {inputs.grid.simpsonSubintervals} 等分)...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>开始预计 (计算地表沉陷)</span>
              </>
            )}
          </button>
        </div>

        {/* Collapsible Advanced Calculation Settings */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="w-full flex items-center justify-between py-2 text-xs text-slate-600 hover:text-slate-900 font-medium transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>高级计算设置 (计算网格范围与 Simpson 积分精度)</span>
              <span className="text-[10px] text-slate-400 font-normal">
                (当前: 走向 {inputs.grid.xMin}~{inputs.grid.xMax}m, 倾向 {inputs.grid.yMin}~{inputs.grid.yMax}m, 积分 {inputs.grid.simpsonSubintervals}等分)
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-[11px]">{showAdvanced ? '收起' : '展开'}</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 bg-slate-50/80 rounded-lg border border-slate-200 text-xs space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-800">网格参数微调</span>
                <button
                  type="button"
                  onClick={onResetAdaptiveGrid}
                  className="px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50 border border-blue-200 rounded transition-colors flex items-center gap-1"
                  title="根据当前走向跨度 d、倾向跨度 m 与主要影响半径 r 自动重置网格"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>恢复自动自适应网格范围</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Strike Range */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700">走向计算范围 (xMin ~ xMax)</label>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      step="50"
                      value={inputs.grid.xMin}
                      onChange={(e) => onUpdateGrid({ xMin: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                    <span className="text-slate-400">~</span>
                    <input
                      type="number"
                      step="50"
                      value={inputs.grid.xMax}
                      onChange={(e) => onUpdateGrid({ xMax: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                    <span className="text-slate-400 text-[10px]">m</span>
                  </div>
                </div>

                {/* Strike Step */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700">走向网格步长 (xStep)</label>
                  <div className="relative font-mono">
                    <input
                      type="number"
                      step="5"
                      min="5"
                      max="100"
                      value={inputs.grid.xStep}
                      onChange={(e) => onUpdateGrid({ xStep: parseFloat(e.target.value) || 20 })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">m</span>
                  </div>
                </div>

                {/* Dip Range */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700">倾向计算范围 (yMin ~ yMax)</label>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      step="50"
                      value={inputs.grid.yMin}
                      onChange={(e) => onUpdateGrid({ yMin: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                    <span className="text-slate-400">~</span>
                    <input
                      type="number"
                      step="50"
                      value={inputs.grid.yMax}
                      onChange={(e) => onUpdateGrid({ yMax: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                    <span className="text-slate-400 text-[10px]">m</span>
                  </div>
                </div>

                {/* Dip Step */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700">倾向网格步长 (yStep)</label>
                  <div className="relative font-mono">
                    <input
                      type="number"
                      step="5"
                      min="5"
                      max="100"
                      value={inputs.grid.yStep}
                      onChange={(e) => onUpdateGrid({ yStep: parseFloat(e.target.value) || 20 })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">m</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Simpson Subintervals */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700 flex items-center justify-between">
                    <span>复合 Simpson 积分子区间数</span>
                    <span className="text-slate-400 font-normal text-[10px]">推荐 2048 等分</span>
                  </label>
                  <select
                    value={inputs.grid.simpsonSubintervals}
                    onChange={(e) =>
                      onUpdateGrid({
                        simpsonSubintervals: parseInt(e.target.value) as 512 | 1024 | 2048 | 4096,
                      })
                    }
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                  >
                    <option value={512}>512 等分 (极速计算)</option>
                    <option value={1024}>1024 等分 (快速评估)</option>
                    <option value={2048}>2048 等分 (标准高精度，默认)</option>
                    <option value={4096}>4096 等分 (极限基准精度)</option>
                  </select>
                </div>

                {/* Subsidence Boundary Threshold */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700 flex items-center justify-between">
                    <span>沉降影响范围边界阈值 (W_threshold)</span>
                    <span className="text-slate-400 font-normal text-[10px]">采矿沉陷影响边界</span>
                  </label>
                  <div className="relative font-mono">
                    <input
                      type="number"
                      step="0.005"
                      min="0.001"
                      max="0.1"
                      value={inputs.grid.subsidenceThreshold ?? 0.01}
                      onChange={(e) =>
                        onUpdateGrid({ subsidenceThreshold: parseFloat(e.target.value) || 0.01 })
                      }
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">m (10mm)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
