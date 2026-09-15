import React, { useState } from 'react';
import {
  X,
  Sliders,
  AlertTriangle,
  Play,
  Check,
  RotateCcw,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import {
  ModelInputs,
  MeasuredPoint,
  CalibrationParams,
  CalibrationResult,
} from '../types.ts';
import { runParameterCalibration } from '../core/calibration.ts';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: ModelInputs;
  measuredPoints: MeasuredPoint[];
  onApplyCalibration: (newInputs: Partial<ModelInputs>) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  inputs,
  measuredPoints,
  onApplyCalibration,
}) => {
  const [config, setConfig] = useState<CalibrationParams>({
    calibrateLPKS: true,
    calibrateR: false,
    calibrateEtaS: true,
    minLPKS: 5.0,
    maxLPKS: 50.0,
    minR: 200.0,
    maxR: 800.0,
    minEtaS: 0.3,
    maxEtaS: 1.0,
    lossFunction: 'MAE',
  });

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartCalibration = () => {
    if (measuredPoints.length === 0) {
      setErrorMsg('请先在主界面上传或载入观测数据点，方可进行参数反演');
      return;
    }

    setIsCalibrating(true);
    setErrorMsg(null);

    setTimeout(() => {
      try {
        const calResult = runParameterCalibration(inputs, measuredPoints, config);
        setResult(calResult);
      } catch (err: any) {
        setErrorMsg(err?.message || '参数反演失败');
      } finally {
        setIsCalibrating(false);
      }
    }, 100);
  };

  const handleApply = () => {
    if (!result) return;
    const patch: Partial<ModelInputs> = {};
    if (config.calibrateLPKS) patch.L_PKS = result.calibratedParams.L_PKS;
    if (config.calibrateEtaS) patch.eta_s = result.calibratedParams.eta_s;
    onApplyCalibration(patch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                工程参数反演与模型校准模块 (Calibration Mode)
              </h3>
              <p className="text-xs text-slate-500">
                基于现场观测数据反演覆岩物理几何参数 (Nelder-Mead 优化搜索)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prominent Mandatory Academic Disclaimer */}
        <div className="p-3 bg-amber-50/80 border-b border-amber-200/90 text-amber-900 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">重要合规说明：</span>
            本模块输出结果属于<strong>工程参数数值校准拟合结果</strong>
            ，与论文原式的直接计算结果具有本质区别。禁止将本模块校准后的参数宣称为“论文原式理论直接计算结果”。
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[65vh]">
          {/* Target Data Info */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">拟合目标观测数据集:</span>
              <span className="font-semibold text-slate-800">
                {measuredPoints.length > 0
                  ? `已就绪，包含 ${measuredPoints.length} 个观测点`
                  : '未载入观测点 (不可反演)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">目标损失函数:</span>
              <select
                value={config.lossFunction}
                onChange={(e) =>
                  setConfig({ ...config, lossFunction: e.target.value as 'MAE' | 'RMSE' })
                }
                className="bg-white border border-slate-200 px-2 py-1 rounded font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="MAE">MAE (平均绝对误差)</option>
                <option value="RMSE">RMSE (均方根误差)</option>
              </select>
            </div>
          </div>

          {/* Parameter Selection & Bounds */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-800 text-xs">待反演参数及搜索边界配置</h4>

            {/* 1. L_PKS */}
            <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={config.calibrateLPKS}
                  onChange={(e) => setConfig({ ...config, calibrateLPKS: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>主关键层破断块体长 L_PKS (当前: {inputs.L_PKS} m)</span>
              </label>
              <div className="flex items-center gap-2 text-slate-600">
                <span>下限:</span>
                <input
                  type="number"
                  value={config.minLPKS}
                  onChange={(e) =>
                    setConfig({ ...config, minLPKS: parseFloat(e.target.value) || 1 })
                  }
                  className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-center"
                />
                <span>上限:</span>
                <input
                  type="number"
                  value={config.maxLPKS}
                  onChange={(e) =>
                    setConfig({ ...config, maxLPKS: parseFloat(e.target.value) || 100 })
                  }
                  className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-center"
                />
                <span className="text-slate-400">m</span>
              </div>
            </div>

            {/* 2. eta_s */}
            <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={config.calibrateEtaS}
                  onChange={(e) => setConfig({ ...config, calibrateEtaS: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>地表下沉系数 η_s (当前: {inputs.eta_s})</span>
              </label>
              <div className="flex items-center gap-2 text-slate-600">
                <span>下限:</span>
                <input
                  type="number"
                  step="0.05"
                  value={config.minEtaS}
                  onChange={(e) =>
                    setConfig({ ...config, minEtaS: parseFloat(e.target.value) || 0.1 })
                  }
                  className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-center"
                />
                <span>上限:</span>
                <input
                  type="number"
                  step="0.05"
                  value={config.maxEtaS}
                  onChange={(e) =>
                    setConfig({ ...config, maxEtaS: parseFloat(e.target.value) || 1.2 })
                  }
                  className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-center"
                />
              </div>
            </div>

            {/* 3. r */}
            <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={config.calibrateR}
                  onChange={(e) => setConfig({ ...config, calibrateR: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>主要影响半径 r (建议直接由角度公式计算)</span>
              </label>
              <div className="flex items-center gap-2 text-slate-600">
                <span>下限:</span>
                <input
                  type="number"
                  value={config.minR}
                  onChange={(e) =>
                    setConfig({ ...config, minR: parseFloat(e.target.value) || 100 })
                  }
                  className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-center"
                />
                <span>上限:</span>
                <input
                  type="number"
                  value={config.maxR}
                  onChange={(e) =>
                    setConfig({ ...config, maxR: parseFloat(e.target.value) || 1000 })
                  }
                  className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-center"
                />
                <span className="text-slate-400">m</span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Results Comparison Table */}
          {result && (
            <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-lg space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                  <Check className="w-4 h-4 text-indigo-600" />
                  <span>反演完成！迭代次数: {result.iterationCount}</span>
                </div>
                <div className="text-indigo-800 font-mono">
                  {config.lossFunction}: {result.initialLoss.toFixed(4)}m →{' '}
                  <span className="font-bold text-emerald-700">
                    {result.finalLoss.toFixed(4)}m
                  </span>
                </div>
              </div>

              <table className="w-full text-left bg-white border border-indigo-100 rounded">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="px-3 py-2">参数项</th>
                    <th className="px-3 py-2 text-right">校准前值</th>
                    <th className="px-3 py-2 text-right text-indigo-700">校准后最优值</th>
                    <th className="px-3 py-2 text-right">变化幅度</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {config.calibrateLPKS && (
                    <tr>
                      <td className="px-3 py-1.5 font-sans">破断块体长 L_PKS</td>
                      <td className="px-3 py-1.5 text-right">{result.initialParams.L_PKS} m</td>
                      <td className="px-3 py-1.5 text-right font-bold text-indigo-700">
                        {result.calibratedParams.L_PKS} m
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {(
                          result.calibratedParams.L_PKS - result.initialParams.L_PKS
                        ).toFixed(2)}{' '}
                        m
                      </td>
                    </tr>
                  )}
                  {config.calibrateEtaS && (
                    <tr>
                      <td className="px-3 py-1.5 font-sans">下沉系数 η_s</td>
                      <td className="px-3 py-1.5 text-right">{result.initialParams.eta_s}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-indigo-700">
                        {result.calibratedParams.eta_s}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {(
                          result.calibratedParams.eta_s - result.initialParams.eta_s
                        ).toFixed(4)}
                      </td>
                    </tr>
                  )}
                  {config.calibrateR && (
                    <tr>
                      <td className="px-3 py-1.5 font-sans">主要影响半径 r</td>
                      <td className="px-3 py-1.5 text-right">{result.initialParams.r.toFixed(2)} m</td>
                      <td className="px-3 py-1.5 text-right font-bold text-indigo-700">
                        {result.calibratedParams.r.toFixed(2)} m
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {(
                          result.calibratedParams.r - result.initialParams.r
                        ).toFixed(2)}{' '}
                        m
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleStartCalibration}
            disabled={isCalibrating || measuredPoints.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin' : ''}`} />
            <span>{isCalibrating ? '正在执行单纯形搜索...' : '开始参数反演'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded text-xs text-slate-700 font-medium"
            >
              取消
            </button>
            {result && (
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>应用校准参数至主界面</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
