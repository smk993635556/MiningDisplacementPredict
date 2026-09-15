import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  BookOpen,
  RotateCcw,
  Check,
  AlertCircle,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import { StratumLayer, DEFAULT_16_STRATA, StratumLayerType } from '../types.ts';
import { calculateStratumInputs } from '../core/stratumCalculator.ts';

interface StratumModalProps {
  isOpen: boolean;
  onClose: () => void;
  strata: StratumLayer[];
  onSaveStrata: (newStrata: StratumLayer[]) => void;
  onApplyToInputs?: (calculated: { H_l: number; H_PKS_u: number; H_PKS_d: number; M?: number }) => void;
}

export const StratumModal: React.FC<StratumModalProps> = ({
  isOpen,
  onClose,
  strata,
  onSaveStrata,
  onApplyToInputs,
}) => {
  const [layers, setLayers] = useState<StratumLayer[]>(
    strata && strata.length > 0 ? strata : DEFAULT_16_STRATA
  );

  if (!isOpen) return null;

  const stratumCalc = calculateStratumInputs(layers);

  const handleAddLayer = () => {
    const newId = layers.length + 1;
    const lastDepth = layers.length > 0 ? layers[layers.length - 1].cumulativeDepth : 0;
    const defaultThick = 5.0;
    const newLayers: StratumLayer[] = [
      ...layers,
      {
        layerNo: newId,
        lithology: '砂质泥岩',
        thickness: defaultThick,
        cumulativeDepth: Math.round((lastDepth + defaultThick) * 10) / 10,
        layerType: '普通岩层',
        keyStratumType: 'normal',
      },
    ];
    setLayers(newLayers);
  };

  const handleUpdate = (index: number, field: keyof StratumLayer, value: any) => {
    const updated = [...layers];
    updated[index] = { ...updated[index], [field]: value };

    // If layerType updated, also sync keyStratumType
    if (field === 'layerType') {
      if (value === '主关键层') updated[index].keyStratumType = 'PKS';
      else if (value === '亚关键层') updated[index].keyStratumType = 'SKS';
      else updated[index].keyStratumType = 'normal';
    }

    // Recompute cumulative depths
    let depth = 0;
    for (let i = 0; i < updated.length; i++) {
      depth += Number(updated[i].thickness) || 0;
      updated[i].cumulativeDepth = Math.round(depth * 10) / 10;
      updated[i].layerNo = i + 1;
    }

    setLayers(updated);
  };

  const handleDelete = (index: number) => {
    const updated = layers.filter((_, i) => i !== index);
    let depth = 0;
    for (let i = 0; i < updated.length; i++) {
      depth += Number(updated[i].thickness) || 0;
      updated[i].cumulativeDepth = Math.round(depth * 10) / 10;
      updated[i].layerNo = i + 1;
    }
    setLayers(updated);
  };

  const handleResetBenchmark = () => {
    setLayers(DEFAULT_16_STRATA);
  };

  const handleApplyAndClose = () => {
    onSaveStrata(layers);
    if (onApplyToInputs && stratumCalc.valid) {
      onApplyToInputs({
        H_l: stratumCalc.H_l,
        H_PKS_u: stratumCalc.H_PKS_u,
        H_PKS_d: stratumCalc.H_PKS_d,
        M: stratumCalc.coalThickness > 0 ? stratumCalc.coalThickness : undefined,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                工程地层柱状表与结构参数计算
              </h3>
              <p className="text-xs text-slate-500">
                按钻孔从上至下排列岩土层，系统自动推导松散层厚度 H_l、主关键层上基岩 H_PKS-u 及下岩层 H_PKS-d
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetBenchmark}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-blue-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors flex items-center gap-1"
              title="重置为标准 16 层工程基准地层"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>载入标准地层表</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Realtime Derived Metrics Bar */}
        <div className="px-6 py-3 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-blue-900">自动推导覆岩结构:</span>
            </div>
            <div className="bg-white px-2.5 py-1 rounded border border-blue-200 text-slate-700">
              松散层厚度 <strong className="text-blue-700 font-mono">H_l = {stratumCalc.H_l}m</strong>
            </div>
            <div className="bg-white px-2.5 py-1 rounded border border-blue-200 text-slate-700">
              主关键层上基岩 <strong className="text-blue-700 font-mono">H_PKS-u = {stratumCalc.H_PKS_u}m</strong>
            </div>
            <div className="bg-white px-2.5 py-1 rounded border border-blue-200 text-slate-700">
              主关键层下岩层 <strong className="text-blue-700 font-mono">H_PKS-d = {stratumCalc.H_PKS_d}m</strong>
            </div>
            {stratumCalc.coalThickness > 0 && (
              <div className="bg-white px-2.5 py-1 rounded border border-blue-200 text-slate-700">
                识别煤层采高 <strong className="text-blue-700 font-mono">M = {stratumCalc.coalThickness}m</strong>
              </div>
            )}
          </div>

          {!stratumCalc.valid && (
            <div className="flex items-center gap-1 text-red-600 font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>{stratumCalc.errors[0] || '地层表定义不完整'}</span>
            </div>
          )}
        </div>

        {/* Table Content */}
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                <tr>
                  <th className="py-2 px-3 w-14">序号</th>
                  <th className="py-2 px-3">岩性名称</th>
                  <th className="py-2 px-3 w-28">厚度 (m)</th>
                  <th className="py-2 px-3 w-24">累计深度 (m)</th>
                  <th className="py-2 px-3 w-36">层位类型</th>
                  <th className="py-2 px-3">备注说明</th>
                  <th className="py-2 px-3 w-12 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {layers.map((layer, idx) => {
                  const isLoose = layer.layerType === '松散层';
                  const isPKS = layer.layerType === '主关键层' || layer.keyStratumType === 'PKS';
                  const isCoal = layer.layerType === '煤层';

                  let rowBg = '';
                  if (isPKS) rowBg = 'bg-purple-50/60 font-medium';
                  else if (isCoal) rowBg = 'bg-amber-50/60 font-medium';
                  else if (isLoose) rowBg = 'bg-sky-50/40';

                  return (
                    <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${rowBg}`}>
                      <td className="py-1.5 px-3 font-mono text-slate-500">{layer.layerNo}</td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={layer.lithology}
                          onChange={(e) => handleUpdate(idx, 'lithology', e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded focus:bg-white focus:outline-hidden"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={layer.thickness}
                          onChange={(e) =>
                            handleUpdate(idx, 'thickness', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-1.5 py-0.5 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded focus:bg-white focus:outline-hidden font-mono"
                        />
                      </td>
                      <td className="py-1.5 px-3 font-mono text-slate-600">
                        {layer.cumulativeDepth.toFixed(1)}
                      </td>
                      <td className="py-1.5 px-3">
                        <select
                          value={layer.layerType || (layer.keyStratumType === 'PKS' ? '主关键层' : '普通岩层')}
                          onChange={(e) =>
                            handleUpdate(idx, 'layerType', e.target.value as StratumLayerType)
                          }
                          className={`w-full px-1 py-0.5 rounded border text-xs font-medium focus:outline-hidden ${
                            isPKS
                              ? 'border-purple-300 bg-purple-50 text-purple-800'
                              : isCoal
                              ? 'border-amber-300 bg-amber-50 text-amber-800'
                              : isLoose
                              ? 'border-sky-300 bg-sky-50 text-sky-800'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          <option value="松散层">松散层 (表土)</option>
                          <option value="普通岩层">普通岩层</option>
                          <option value="主关键层">主关键层 (PKS)</option>
                          <option value="亚关键层">亚关键层 (SKS)</option>
                          <option value="煤层">目标煤层</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={layer.notes || ''}
                          onChange={(e) => handleUpdate(idx, 'notes', e.target.value)}
                          placeholder="说明..."
                          className="w-full px-1.5 py-0.5 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded focus:bg-white focus:outline-hidden text-slate-500"
                        />
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100 transition-colors"
                          title="删除此地层"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddLayer}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加岩层</span>
            </button>
            <span className="text-xs text-slate-500">
              共 {layers.length} 个地层，总厚度 {layers.length > 0 ? layers[layers.length - 1].cumulativeDepth.toFixed(1) : 0} m
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            提示：必须指定且只能指定 1 个“主关键层”和 1 个“煤层”，顶部连续层将自动累加为松散层。
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleApplyAndClose}
              disabled={!stratumCalc.valid}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>应用计算结果到模型参数</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
