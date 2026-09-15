import React, { useState } from 'react';
import { X, Box, ShieldCheck, Sliders, CheckCircle2, RotateCw, Copy, Check, TrendingDown } from 'lucide-react';
import {
  ModelInputs,
  DerivedParams,
  CalculationGridResult,
  MeasuredPoint,
  AcceptanceTestReport,
  CalibrationParams,
  CalibrationResult,
} from '../types.ts';
import { PKSVisualizer } from './PKSVisualizer.tsx';
import { runModelSelfCheck } from '../core/model.ts';
import { runParameterCalibration } from '../core/calibration.ts';

interface AdvancedAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: ModelInputs;
  derived: DerivedParams;
  gridResult: CalculationGridResult | null;
  measuredPoints: MeasuredPoint[];
  onApplyCalibration: (newInputs: Partial<ModelInputs>) => void;
}

export const AdvancedAnalysisModal: React.FC<AdvancedAnalysisModalProps> = ({
  isOpen,
  onClose,
  inputs,
  derived,
  gridResult,
  measuredPoints,
  onApplyCalibration,
}) => {
  const [activeTab, setActiveTab] = useState<'pks' | 'selfcheck' | 'calibration'>('pks');

  // Self-Check state
  const [report, setReport] = useState<AcceptanceTestReport | null>(null);
  const [copied, setCopied] = useState(false);

  // Calibration state
  const [calibConfig, setCalibConfig] = useState<CalibrationParams>({
    calibrateLPKS: true,
    calibrateR: false,
    calibrateEtaS: true,
    minLPKS: 5.0,
    maxLPKS: 50.0,
    minR: 200.0,
    maxR: 800.0,
    minEtaS: 0.3,
    maxEtaS: 1.2,
    lossFunction: 'MAE',
  });
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibResult, setCalibResult] = useState<CalibrationResult | null>(null);
  const [calibError, setCalibError] = useState<string | null>(null);

  if (!isOpen) return null;

  const ensureReport = () => {
    if (!report) {
      setReport(runModelSelfCheck());
    }
  };

  const handleRerunReport = () => {
    setReport(runModelSelfCheck());
  };

  const handleCopyReport = () => {
    if (!report) return;
    let text = `=== 采动覆岩运移与地表沉陷耦合预计平台 模型数值自检报告 ===\n`;
    text += `测试时间: ${report.timestamp}\n`;
    text += `结论: ${report.passedAll ? '全部断言通过 (PASSED)' : '存在未通过断言 (FAILED)'}\n\n`;
    for (const item of report.items) {
      text += `[${item.passed ? 'PASS' : 'FAIL'}] ${item.name}\n`;
      text += `  说明: ${item.description}\n`;
      text += `  计算值: ${item.calculatedValue}, 目标值: ${item.targetValue}\n`;
      if (item.absoluteError !== undefined) {
        text += `  绝对误差: ${item.absoluteError.toExponential(4)}, 容差: ${item.tolerance}\n`;
      }
      text += `\n`;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartCalibration = () => {
    if (measuredPoints.length === 0) {
      setCalibError('请先在工程中录入或导入实测点数据，方可进行参数反演与校准');
      return;
    }
    setIsCalibrating(true);
    setCalibError(null);

    setTimeout(() => {
      try {
        const res = runParameterCalibration(inputs, measuredPoints, calibConfig);
        setCalibResult(res);
      } catch (err: any) {
        setCalibError(err?.message || '反演计算失败');
      } finally {
        setIsCalibrating(false);
      }
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">高级分析与物理验证中心</h2>
              <p className="text-xs text-slate-500">主关键层下沉场深度解析、模型数值自检套件与参数反演校准</p>
            </div>
          </div>

          {/* Navigation Tab Switcher */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('pks')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'pks'
                  ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>主关键层下沉场</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('selfcheck');
                ensureReport();
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'selfcheck'
                  ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>模型数值自检 (24项)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calibration')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'calibration'
                  ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>参数反演校准</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tab Content */}
        <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50">
          {/* 1. PKS Visualizer */}
          {activeTab === 'pks' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    主关键层破断下沉场 W_PKS(η, ξ) 二维力学分布
                  </h3>
                  <span className="text-xs text-slate-500">
                    极大下沉值 w_PKS = {derived.wPKS.toFixed(4)} m | 破断尺寸: {derived.Lz.toFixed(1)}m × {derived.Lq.toFixed(1)}m
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  主关键层作为地表沉陷预计的核心力学源，其下沉位移场通过双向边界过渡函数刻画。
                  沉降采用向下为正，原点为破断体中心。
                </p>
              </div>

              <PKSVisualizer gridResult={gridResult} inputs={inputs} derived={derived} />
            </div>
          )}

          {/* 2. Self Check Suite */}
          {activeTab === 'selfcheck' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      模型数学与物理全套自动化测试 (24 项断言)
                    </h3>
                    {report && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          report.passedAll ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {report.passedAll ? '✓ 全部断言通过 (24/24)' : '存在失败项'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    涵盖 6 项派生几何参数、5 个主关键层特征点、10 个地表沉陷积分点、走向/倾向对称性 (&lt;1e-8) 以及 4096 vs 2048 积分收敛性 (&lt;1e-6)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 flex items-center gap-1 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? '已复制' : '复制结果'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRerunReport}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded shadow-2xs flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>重新自检</span>
                  </button>
                </div>
              </div>

              {report && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">状态</th>
                          <th className="py-2.5 px-3">测试项目</th>
                          <th className="py-2.5 px-3">测试说明</th>
                          <th className="py-2.5 px-3">计算值</th>
                          <th className="py-2.5 px-3">目标基准值</th>
                          <th className="py-2.5 px-3">绝对误差</th>
                          <th className="py-2.5 px-3">容差要求</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {report.items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3">
                              {item.passed ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> PASS
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                                  FAIL
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{item.name}</td>
                            <td className="py-2 px-3 text-slate-600 font-sans">{item.description}</td>
                            <td className="py-2 px-3 text-blue-700">{item.calculatedValue}</td>
                            <td className="py-2 px-3 text-slate-700">{item.targetValue}</td>
                            <td className="py-2 px-3 text-slate-500">
                              {item.absoluteError !== undefined ? item.absoluteError.toExponential(3) : '-'}
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.tolerance ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Parameter Calibration */}
          {activeTab === 'calibration' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900">
                  基于实测点的参数反演与自动校准 (Nelder-Mead 优化)
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  利用无导数单形体优化算法，根据地表实测下沉散点反演最优主关键层断块步距 L_PKS、主要影响半径 r 或下沉系数 η_s。
                </p>
              </div>

              {measuredPoints.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center text-xs text-amber-800">
                  当前工程尚未录入实测点数据。请在主界面第一步“导入项目 Excel”或地表预计结果区载入实测数据后使用反演模块。
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Calibration Controls */}
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3 text-xs">
                    <div className="font-bold text-slate-900 border-b pb-1.5">反演待寻优参数设定</div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={calibConfig.calibrateLPKS}
                          onChange={(e) =>
                            setCalibConfig((prev) => ({ ...prev, calibrateLPKS: e.target.checked }))
                          }
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-slate-800">反演主关键层破断块步距 L_PKS (当前: {inputs.L_PKS}m)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={calibConfig.calibrateEtaS}
                          onChange={(e) =>
                            setCalibConfig((prev) => ({ ...prev, calibrateEtaS: e.target.checked }))
                          }
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-slate-800">反演地表下沉系数 η_s (当前: {inputs.eta_s})</span>
                      </label>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600">目标损失函数:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCalibConfig((p) => ({ ...p, lossFunction: 'MAE' }))}
                          className={`px-2.5 py-1 rounded text-xs ${
                            calibConfig.lossFunction === 'MAE'
                              ? 'bg-blue-600 text-white font-medium'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          MAE (平均绝对误差)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCalibConfig((p) => ({ ...p, lossFunction: 'RMSE' }))}
                          className={`px-2.5 py-1 rounded text-xs ${
                            calibConfig.lossFunction === 'RMSE'
                              ? 'bg-blue-600 text-white font-medium'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          RMSE (均方根误差)
                        </button>
                      </div>
                    </div>

                    {calibError && <div className="text-red-600 bg-red-50 p-2 rounded">{calibError}</div>}

                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={isCalibrating}
                        onClick={handleStartCalibration}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded shadow-2xs transition-colors flex items-center justify-center gap-2"
                      >
                        {isCalibrating ? (
                          <>
                            <RotateCw className="w-4 h-4 animate-spin" />
                            <span>正在执行 Nelder-Mead 寻优反演...</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4" />
                            <span>启动参数反演</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right: Results */}
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3 text-xs">
                    <div className="font-bold text-slate-900 border-b pb-1.5">反演结果与参数回填</div>

                    {calibResult ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-900">
                          <div className="font-semibold text-xs mb-1">✓ 反演成功收敛</div>
                          <div className="text-[11px] space-y-0.5">
                            <div>迭代步数: {calibResult.iterationCount} 轮</div>
                            <div>初始 {calibConfig.lossFunction}: {calibResult.initialLoss.toFixed(4)} m</div>
                            <div>优化后 {calibConfig.lossFunction}: <strong className="text-emerald-700">{calibResult.finalLoss.toFixed(4)} m</strong></div>
                          </div>
                        </div>

                        <div className="space-y-2 font-mono">
                          {calibConfig.calibrateLPKS && (
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between">
                              <span className="font-sans text-slate-600">L_PKS (破断块长):</span>
                              <span>{calibResult.initialParams.L_PKS.toFixed(2)}m → <strong className="text-blue-600">{calibResult.calibratedParams.L_PKS.toFixed(2)}m</strong></span>
                            </div>
                          )}

                          {calibConfig.calibrateEtaS && (
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between">
                              <span className="font-sans text-slate-600">η_s (地表下沉系数):</span>
                              <span>{calibResult.initialParams.eta_s.toFixed(3)} → <strong className="text-blue-600">{calibResult.calibratedParams.eta_s.toFixed(3)}</strong></span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const patch: Partial<ModelInputs> = {};
                            if (calibConfig.calibrateLPKS) patch.L_PKS = calibResult.calibratedParams.L_PKS;
                            if (calibConfig.calibrateEtaS) patch.eta_s = calibResult.calibratedParams.eta_s;
                            onApplyCalibration(patch);
                            onClose();
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-2xs transition-colors"
                        >
                          应用反演参数并重新计算
                        </button>
                      </div>
                    ) : (
                      <div className="text-slate-400 py-10 text-center">
                        点击左侧“启动参数反演”开始基于实测点寻优计算
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
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
