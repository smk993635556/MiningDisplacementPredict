import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sliders,
  Sparkles,
  RefreshCw,
  Cpu,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { ModelInputs, GridConfig, ValidationResult, DerivedParams, CalculationGridResult } from '../types.ts';
import { checkGridCoverage } from '../core/model.ts';

interface Step2ActionSectionProps {
  inputs: ModelInputs;
  derived: DerivedParams;
  validation: ValidationResult;
  isComputing: boolean;
  gridResult: CalculationGridResult | null;
  onCompute: () => void;
  onUpdateGrid: (patch: Partial<GridConfig>) => void;
  onResetAdaptiveGrid: () => void;
  onSetGridMode: (mode: 'adaptive' | 'manual') => void;
}

export const Step2ActionSection: React.FC<Step2ActionSectionProps> = ({
  inputs,
  derived,
  validation,
  isComputing,
  gridResult,
  onCompute,
  onUpdateGrid,
  onResetAdaptiveGrid,
  onSetGridMode,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { valid, errors, warnings } = validation;
  const gridMode = inputs.grid.mode || 'adaptive';

  // Check if grid covers subsidence influence bounds: xMin <= -(Df+3r), xMax >= Df+3r, etc.
  const coverageCheck = checkGridCoverage(inputs.grid, derived);

  // Result outdated status: when gridResult is null while inputs are valid
  const isResultOutdated = valid && gridResult === null && !isComputing;

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            2
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">第二步：网格模式与预计求解</h2>
            <p className="text-[11px] text-slate-500">
              支持自动自适应与手动网格模式，严格校验沉陷影响区覆盖并执行二重积分
            </p>
          </div>
        </div>

        {/* Status Chip */}
        <div>
          {!valid ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-semibold shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>需完善输入参数 ({errors.length} 项)</span>
            </span>
          ) : !coverageCheck.isCovered ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 text-amber-800 rounded-full text-xs font-semibold shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>网格未完全覆盖影响区</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-semibold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>网格与参数完整，可预计</span>
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

        {/* Grid Coverage Warning Banner (Requirement 4 & 5) */}
        {!coverageCheck.isCovered && valid && (
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-amber-950">
                  当前计算网格未覆盖本工程沉陷影响范围，是否恢复自适应网格？
                </h4>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  理论规范要求计算网格至少覆盖破断边界延伸3倍主要影响半径：走向覆盖 ±(D_f + 3r)，倾向覆盖 ±(M_f + 3r)。网格不足将导致沉陷盆地边缘截断或指标失真。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white/90 p-2.5 rounded-lg border border-amber-200">
              <div className={coverageCheck.deficitX ? 'text-red-700 font-medium' : 'text-slate-700'}>
                <div className="flex items-center justify-between">
                  <span>走向网格 (xMin ~ xMax):</span>
                  <span className="font-mono font-bold">[{inputs.grid.xMin}m, {inputs.grid.xMax}m]</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  沉陷边界要求: [{coverageCheck.requiredXMin}m, {coverageCheck.requiredXMax}m]
                  {coverageCheck.deficitX && <span className="ml-1 text-red-600 font-bold">⚠️ 不足</span>}
                </div>
              </div>

              <div className={coverageCheck.deficitY ? 'text-red-700 font-medium' : 'text-slate-700'}>
                <div className="flex items-center justify-between">
                  <span>倾向网格 (yMin ~ yMax):</span>
                  <span className="font-mono font-bold">[{inputs.grid.yMin}m, {inputs.grid.yMax}m]</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  沉陷边界要求: [{coverageCheck.requiredYMin}m, {coverageCheck.requiredYMax}m]
                  {coverageCheck.deficitY && <span className="ml-1 text-red-600 font-bold">⚠️ 不足</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  onResetAdaptiveGrid();
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>恢复自适应网格并预计</span>
              </button>
              <button
                type="button"
                onClick={onCompute}
                disabled={!valid || isComputing}
                className="px-3 py-1.5 bg-white hover:bg-amber-100/70 text-amber-900 border border-amber-300 rounded-lg text-xs font-medium transition-colors"
                title="按当前手动设置的小范围网格强制计算局部"
              >
                坚持按当前手动网格预计
              </button>
            </div>
          </div>
        )}

        {/* Outdated Notice (Requirement 6) */}
        {isResultOutdated && coverageCheck.isCovered && (
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 flex-shrink-0 animate-spin-reverse" />
              <span>当前工程参数或网格已变更，旧预计结果已失效，请点击下方“开始预计”重新计算。</span>
            </div>
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

        {/* Grid Mode Selection & Advanced Grid Settings */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between gap-2 py-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">网格计算模式:</span>
              {/* Segmented Mode Control */}
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => onSetGridMode('adaptive')}
                  className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    gridMode === 'adaptive'
                      ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="自动根据开采几何与影响半径计算覆盖范围"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>自动自适应模式</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetGridMode('manual')}
                  className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    gridMode === 'manual'
                      ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="手动指定网格范围与步长（仅在当前工程保留，切换工程后重置）"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>手动网格模式</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1 transition-colors"
            >
              <span>{showAdvanced ? '收起网格设置' : '展开网格设置'}</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Mode Explanation Notice */}
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            {gridMode === 'adaptive' ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                自动自适应中：当前覆盖走向 [{inputs.grid.xMin}m ~ {inputs.grid.xMax}m]，倾向 [{inputs.grid.yMin}m ~ {inputs.grid.yMax}m]
              </span>
            ) : (
              <span className="text-blue-700 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                手动设置生效中：切换或导入新工程时将自动恢复自适应网格
              </span>
            )}

            <button
              type="button"
              onClick={onResetAdaptiveGrid}
              className="text-[11px] text-blue-700 hover:underline flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>恢复自适应网格范围</span>
            </button>
          </div>

          {showAdvanced && (
            <div className="mt-3 p-4 bg-slate-50/80 rounded-lg border border-slate-200 text-xs space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-800">网格参数设置 ({gridMode === 'adaptive' ? '自动自适应模式' : '手动网格模式'})</span>
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
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-700">走向计算范围 (xMin ~ xMax)</label>
                    {gridMode === 'adaptive' && (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">自动自适应</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      step="50"
                      value={inputs.grid.xMin}
                      onChange={(e) => {
                        onUpdateGrid({ xMin: parseFloat(e.target.value) || 0, mode: 'manual' });
                      }}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                    <span className="text-slate-400">~</span>
                    <input
                      type="number"
                      step="50"
                      value={inputs.grid.xMax}
                      onChange={(e) => {
                        onUpdateGrid({ xMax: parseFloat(e.target.value) || 0, mode: 'manual' });
                      }}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                    <span className="text-slate-400 text-[10px]">m</span>
                  </div>
                  <p className="text-[10px] text-slate-400">理论沉陷下界: {(-derived.Df - 3*derived.r).toFixed(0)}m</p>
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
                      onChange={(e) => onUpdateGrid({ xStep: parseFloat(e.target.value) || 20, mode: 'manual' })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">m</span>
                  </div>
                  <p className="text-[10px] text-slate-400">点数: {Math.round((inputs.grid.xMax - inputs.grid.xMin) / inputs.grid.xStep) + 1}</p>
                </div>

                {/* Dip Range */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-700">倾向计算范围 (yMin ~ yMax)</label>
                    {gridMode === 'adaptive' && (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">自动自适应</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      step="50"
                      value={inputs.grid.yMin}
                      onChange={(e) => {
                        onUpdateGrid({ yMin: parseFloat(e.target.value) || 0, mode: 'manual' });
                      }}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                    <span className="text-slate-400">~</span>
                    <input
                      type="number"
                      step="50"
                      value={inputs.grid.yMax}
                      onChange={(e) => {
                        onUpdateGrid({ yMax: parseFloat(e.target.value) || 0, mode: 'manual' });
                      }}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                    <span className="text-slate-400 text-[10px]">m</span>
                  </div>
                  <p className="text-[10px] text-slate-400">理论沉陷下界: {(-derived.Mf - 3*derived.r).toFixed(0)}m</p>
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
                      onChange={(e) => onUpdateGrid({ yStep: parseFloat(e.target.value) || 20, mode: 'manual' })}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">m</span>
                  </div>
                  <p className="text-[10px] text-slate-400">点数: {Math.round((inputs.grid.yMax - inputs.grid.yMin) / inputs.grid.yStep) + 1}</p>
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
