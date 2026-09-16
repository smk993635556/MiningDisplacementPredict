import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Layers,
  Grid,
  Sparkles,
} from 'lucide-react';
import { ModelInputs, ValidationResult, PRESET_1312_1 } from '../types.ts';

interface ParameterPanelProps {
  inputs: ModelInputs;
  onChange: (inputs: ModelInputs) => void;
  validation: ValidationResult;
  onResetPreset: () => void;
  onResetAdaptiveGrid?: () => void;
  onOpenStratum: () => void;
  stratumCount: number;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  inputs,
  onChange,
  validation,
  onResetPreset,
  onResetAdaptiveGrid,
  onOpenStratum,
  stratumCount,
}) => {
  // Accordion state
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    geometry: true,
    pks: true,
    overburden: true,
    grid: true,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateField = <K extends keyof ModelInputs>(key: K, value: any) => {
    onChange({ ...inputs, [key]: value });
  };

  const updateGridField = (key: keyof ModelInputs['grid'], value: any) => {
    onChange({
      ...inputs,
      grid: {
        ...inputs.grid,
        [key]: value,
      },
    });
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden flex flex-col">
      {/* Panel Top Header */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-800 text-sm">参数设置与校验</span>
        </div>
        <button
          type="button"
          onClick={onResetPreset}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-medium"
          title="载入通用标准算例预设值"
        >
          <RotateCcw className="w-3 h-3" />
          <span>载入标准算例</span>
        </button>
      </div>

      {/* Validation Errors Notice */}
      {!validation.valid && (
        <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-red-800 mb-1">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>参数校验未通过，已阻止计算:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-700 pl-1">
            {validation.errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Accordion Groups */}
      <div className="divide-y divide-slate-100 overflow-y-auto max-h-[calc(100vh-210px)]">
        {/* 1. 开采几何 */}
        <div className="text-xs">
          <button
            type="button"
            onClick={() => toggleGroup('geometry')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              1. 开采几何参数
            </span>
            {openGroups.geometry ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openGroups.geometry && (
            <div className="px-3.5 pb-3 pt-1 grid grid-cols-2 gap-2.5 bg-white">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  走向开采长 (d)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={inputs.d}
                    onChange={(e) => updateField('d', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-7"
                  />
                  <span className="absolute right-2 text-[11px] text-slate-400">m</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  倾向开采长 (m)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={inputs.m}
                    onChange={(e) => updateField('m', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-7"
                  />
                  <span className="absolute right-2 text-[11px] text-slate-400">m</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  采高 (M)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={inputs.M}
                    onChange={(e) => updateField('M', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-7"
                  />
                  <span className="absolute right-2 text-[11px] text-slate-400">m</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  煤层倾角 (α)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="90"
                    value={inputs.alpha}
                    onChange={(e) => updateField('alpha', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-7"
                  />
                  <span className="absolute right-2 text-[11px] text-slate-400">°</span>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  平均采深 (H)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={inputs.miningDepth}
                    onChange={(e) => updateField('miningDepth', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-7"
                  />
                  <span className="absolute right-2 text-[11px] text-slate-400">m</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. 主关键层 */}
        <div className="text-xs">
          <button
            type="button"
            onClick={() => toggleGroup('pks')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              2. 主关键层 (PKS) 特征参数
            </span>
            {openGroups.pks ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openGroups.pks && (
            <div className="px-3.5 pb-3 pt-1 space-y-2.5 bg-white">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-600">
                      H_PKS-d
                    </label>
                    <span className="text-[10px] text-slate-400">PKS下至煤顶</span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={inputs.H_PKS_d}
                      onChange={(e) => updateField('H_PKS_d', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-7"
                    />
                    <span className="absolute right-2 text-[11px] text-slate-400">m</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-600">
                      H_PKS-u
                    </label>
                    <span className="text-[10px] text-slate-400">PKS上方基岩</span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={inputs.H_PKS_u}
                      onChange={(e) => updateField('H_PKS_u', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-7"
                    />
                    <span className="absolute right-2 text-[11px] text-slate-400">m</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1" title="残余碎胀系数 K'p (>=1.0)">
                    Kp_res (K'p)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.0"
                    value={inputs.Kp_res}
                    onChange={(e) => updateField('Kp_res', parseFloat(e.target.value) || 1.0)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1" title="岩层破断角 (度)">
                    破断角 (θ)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="89"
                      value={inputs.theta}
                      onChange={(e) => updateField('theta', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-5"
                    />
                    <span className="absolute right-1 text-[11px] text-slate-400">°</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1" title="主关键层破断块体走向长度 (现场或反演输入)">
                    块体长 L_PKS
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={inputs.L_PKS}
                      onChange={(e) => updateField('L_PKS', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-5"
                    />
                    <span className="absolute right-1 text-[11px] text-slate-400">m</span>
                  </div>
                </div>
              </div>

              <div className="p-2 bg-slate-50 border border-slate-200/80 rounded text-[11px] text-slate-500 flex items-start gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>L_PKS 是反映主关键层破断块体尺寸的关键输入，平台严格保留为用户输入项。</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. 覆岩与松散层 */}
        <div className="text-xs">
          <button
            type="button"
            onClick={() => toggleGroup('overburden')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              3. 覆岩与松散层参数
            </span>
            {openGroups.overburden ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openGroups.overburden && (
            <div className="px-3.5 pb-3 pt-1 grid grid-cols-2 gap-2.5 bg-white">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  松散层厚 (H_l)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={inputs.H_l}
                    onChange={(e) => updateField('H_l', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-7"
                  />
                  <span className="absolute right-2 text-[11px] text-slate-400">m</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  岩层边界角 (δ0)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="89"
                    value={inputs.delta0}
                    onChange={(e) => updateField('delta0', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-7"
                  />
                  <span className="absolute right-2 text-[11px] text-slate-400">°</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  松散移动角 (φ)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="89"
                    value={inputs.phi}
                    onChange={(e) => updateField('phi', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-7"
                  />
                  <span className="absolute right-2 text-[11px] text-slate-400">°</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  下沉系数 (η_s)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  value={inputs.eta_s}
                  onChange={(e) => updateField('eta_s', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. 计算网格与数值积分 */}
        <div className="text-xs">
          <button
            type="button"
            onClick={() => toggleGroup('grid')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Grid className="w-3.5 h-3.5 text-emerald-600" />
              4. 计算网格与 Simpson 积分
            </span>
            {openGroups.grid ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openGroups.grid && (
            <div className="px-3.5 pb-3 pt-1 space-y-2.5 bg-white">
              {/* Grid Mode Switcher */}
              <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100">
                <div className="inline-flex bg-slate-100 p-0.5 rounded border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (onResetAdaptiveGrid) {
                        onResetAdaptiveGrid();
                      } else {
                        updateGridField('mode', 'adaptive');
                      }
                    }}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      inputs.grid.mode !== 'manual'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚡ 自适应模式
                  </button>
                  <button
                    type="button"
                    onClick={() => updateGridField('mode', 'manual')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      inputs.grid.mode === 'manual'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🛠️ 手动模式
                  </button>
                </div>

                {onResetAdaptiveGrid && (
                  <button
                    type="button"
                    onClick={onResetAdaptiveGrid}
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                    title="重新计算自适应网格范围"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>恢复自适应</span>
                  </button>
                )}
              </div>

              {/* x range */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-slate-600">走向范围 x (m)</span>
                  {inputs.grid.mode !== 'manual' && (
                    <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 rounded">自适应</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <span className="text-[10px] text-slate-400">Min</span>
                    <input
                      type="number"
                      value={inputs.grid.xMin}
                      onChange={(e) => {
                        onChange({
                          ...inputs,
                          grid: { ...inputs.grid, xMin: parseFloat(e.target.value) || 0, mode: 'manual' },
                        });
                      }}
                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Max</span>
                    <input
                      type="number"
                      value={inputs.grid.xMax}
                      onChange={(e) => {
                        onChange({
                          ...inputs,
                          grid: { ...inputs.grid, xMax: parseFloat(e.target.value) || 0, mode: 'manual' },
                        });
                      }}
                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">步长</span>
                    <input
                      type="number"
                      step="5"
                      min="5"
                      value={inputs.grid.xStep}
                      onChange={(e) => {
                        onChange({
                          ...inputs,
                          grid: { ...inputs.grid, xStep: parseFloat(e.target.value) || 10, mode: 'manual' },
                        });
                      }}
                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* y range */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-slate-600">倾向范围 y (m)</span>
                  {inputs.grid.mode !== 'manual' && (
                    <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 rounded">自适应</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <span className="text-[10px] text-slate-400">Min</span>
                    <input
                      type="number"
                      value={inputs.grid.yMin}
                      onChange={(e) => {
                        onChange({
                          ...inputs,
                          grid: { ...inputs.grid, yMin: parseFloat(e.target.value) || 0, mode: 'manual' },
                        });
                      }}
                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Max</span>
                    <input
                      type="number"
                      value={inputs.grid.yMax}
                      onChange={(e) => {
                        onChange({
                          ...inputs,
                          grid: { ...inputs.grid, yMax: parseFloat(e.target.value) || 0, mode: 'manual' },
                        });
                      }}
                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">步长</span>
                    <input
                      type="number"
                      step="5"
                      min="5"
                      value={inputs.grid.yStep}
                      onChange={(e) => {
                        onChange({
                          ...inputs,
                          grid: { ...inputs.grid, yStep: parseFloat(e.target.value) || 10, mode: 'manual' },
                        });
                      }}
                      className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Simpson Subintervals */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  复合 Simpson 子区间数 N
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([512, 1024, 2048, 4096] as const).map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => updateGridField('simpsonSubintervals', num)}
                      className={`py-1 text-xs font-medium rounded border transition-colors ${
                        inputs.grid.simpsonSubintervals === num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  默认 2048。在 N=2048 与 N=4096 下中心点误差小于 1e-12 m，高度收敛。
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 5. 可选地层柱状表入口 */}
        <div className="p-3 bg-slate-50 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-700 block">综合地层柱状记录表</span>
            <span className="text-[11px] text-slate-400">
              当前已录入 {stratumCount} 层岩性与物理力学参数
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenStratum}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
          >
            查看/编辑
          </button>
        </div>
      </div>
    </div>
  );
};
