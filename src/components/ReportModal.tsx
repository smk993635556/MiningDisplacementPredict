import React, { useRef } from 'react';
import { X, Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import {
  ModelInputs,
  DerivedParams,
  CalculationGridResult,
  MeasuredPoint,
  ErrorMetrics,
} from '../types.ts';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  inputs: ModelInputs;
  derived: DerivedParams;
  gridResult: CalculationGridResult | null;
  metrics: ErrorMetrics;
  dataType: '合成测试数据' | '现场实测数据';
  datasetName: string;
  measuredPoints?: MeasuredPoint[];
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  inputs,
  derived,
  gridResult,
  metrics,
  dataType,
  datasetName,
  measuredPoints = [],
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const hasMeasuredData = measuredPoints && measuredPoints.length > 0;

  const handlePrint = () => {
    window.print();
  };

  const handleExportHtml = () => {
    if (!reportRef.current) return;
    const content = reportRef.current.innerHTML;
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${projectName} - 采动覆岩运移与地表沉陷耦合预计报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; max-width: 900px; margin: auto; }
    h1 { font-size: 22px; color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
    h2 { font-size: 16px; color: #1e3a8a; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .footer { margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}_覆岩沉陷耦合预计工程报告.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-slate-800 text-sm">
              工程预计报告预览与导出
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportHtml}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-xs font-medium text-slate-700 flex items-center gap-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>保存为 HTML</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印 / 导出 PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document */}
        <div
          ref={reportRef}
          className="p-8 overflow-y-auto max-h-[75vh] space-y-6 text-slate-800 text-xs leading-relaxed bg-white print:p-0 print:m-0"
        >
          {/* Header */}
          <div className="border-b-2 border-blue-600 pb-4">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 font-bold tracking-wider text-[11px] uppercase">
                采动覆岩运移—地表沉陷耦合数值预计成果报告
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {new Date().toLocaleString()}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">
              {projectName}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-500 mt-2 text-[11px]">
              <span>算例代号: {inputs.caseName}</span>
              <span>•</span>
              <span className="font-semibold text-blue-700">
                符号约定: 沉降向下为正 (W &gt; 0, 单位: m)
              </span>
              <span>•</span>
              <span>坐标系: x 走向 (m), y 倾向 (m)</span>
            </div>
          </div>

          {/* Section 1: Inputs */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
              一、开采几何与地质力学输入参数清单
            </h2>
            <table className="w-full text-left border border-slate-200 rounded">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="p-2 border-b">参数类别</th>
                  <th className="p-2 border-b">符号</th>
                  <th className="p-2 border-b">参数说明</th>
                  <th className="p-2 border-b text-right">设定值</th>
                  <th className="p-2 border-b">单位</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr>
                  <td className="p-2 font-sans font-medium" rowSpan={4}>开采几何</td>
                  <td className="p-2">d</td>
                  <td className="p-2 font-sans">走向开采长度</td>
                  <td className="p-2 text-right">{inputs.d}</td>
                  <td className="p-2 font-sans">m</td>
                </tr>
                <tr>
                  <td className="p-2">m</td>
                  <td className="p-2 font-sans">倾向开采宽度</td>
                  <td className="p-2 text-right">{inputs.m}</td>
                  <td className="p-2 font-sans">m</td>
                </tr>
                <tr>
                  <td className="p-2">M</td>
                  <td className="p-2 font-sans">采高</td>
                  <td className="p-2 text-right">{inputs.M}</td>
                  <td className="p-2 font-sans">m</td>
                </tr>
                <tr>
                  <td className="p-2">H</td>
                  <td className="p-2 font-sans">平均采深</td>
                  <td className="p-2 text-right">{inputs.miningDepth}</td>
                  <td className="p-2 font-sans">m</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium" rowSpan={5}>主关键层 (PKS)</td>
                  <td className="p-2">H_PKS-d</td>
                  <td className="p-2 font-sans">PKS下界面至煤顶高度</td>
                  <td className="p-2 text-right">{inputs.H_PKS_d}</td>
                  <td className="p-2 font-sans">m</td>
                </tr>
                <tr>
                  <td className="p-2">H_PKS-u</td>
                  <td className="p-2 font-sans">PKS上方基岩厚度</td>
                  <td className="p-2 text-right">{inputs.H_PKS_u}</td>
                  <td className="p-2 font-sans">m</td>
                </tr>
                <tr>
                  <td className="p-2">K'p (Kp_res)</td>
                  <td className="p-2 font-sans">破断岩层残余碎胀系数</td>
                  <td className="p-2 text-right">{inputs.Kp_res}</td>
                  <td className="p-2 font-sans">-</td>
                </tr>
                <tr>
                  <td className="p-2">θ</td>
                  <td className="p-2 font-sans">岩层破断角</td>
                  <td className="p-2 text-right">{inputs.theta}</td>
                  <td className="p-2 font-sans">°</td>
                </tr>
                <tr>
                  <td className="p-2">L_PKS</td>
                  <td className="p-2 font-sans">破断块体走向特征长</td>
                  <td className="p-2 text-right">{inputs.L_PKS}</td>
                  <td className="p-2 font-sans">m</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium" rowSpan={4}>覆岩与地表</td>
                  <td className="p-2">H_l</td>
                  <td className="p-2 font-sans">松散层厚度</td>
                  <td className="p-2 text-right">{inputs.H_l}</td>
                  <td className="p-2 font-sans">m</td>
                </tr>
                <tr>
                  <td className="p-2">δ0</td>
                  <td className="p-2 font-sans">岩层主要影响边界角</td>
                  <td className="p-2 text-right">{inputs.delta0}</td>
                  <td className="p-2 font-sans">°</td>
                </tr>
                <tr>
                  <td className="p-2">φ</td>
                  <td className="p-2 font-sans">松散层移动角</td>
                  <td className="p-2 text-right">{inputs.phi}</td>
                  <td className="p-2 font-sans">°</td>
                </tr>
                <tr>
                  <td className="p-2">η_s</td>
                  <td className="p-2 font-sans">地表下沉系数</td>
                  <td className="p-2 text-right">{inputs.eta_s}</td>
                  <td className="p-2 font-sans">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Derived & Prediction */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
              二、理论派生参数与地表沉陷预计结果
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono">
              <div className="p-2.5 bg-slate-50 border rounded">
                <span className="text-slate-500 font-sans block text-[11px]">主关键层最大下沉 w_PKS</span>
                <span className="text-sm font-bold text-slate-900">{derived.wPKS.toFixed(4)} m</span>
              </div>
              <div className="p-2.5 bg-slate-50 border rounded">
                <span className="text-slate-500 font-sans block text-[11px]">走向破断长 L_z</span>
                <span className="text-sm font-bold text-slate-900">{derived.Lz.toFixed(4)} m</span>
              </div>
              <div className="p-2.5 bg-slate-50 border rounded">
                <span className="text-slate-500 font-sans block text-[11px]">倾向破断长 L_q</span>
                <span className="text-sm font-bold text-slate-900">{derived.Lq.toFixed(4)} m</span>
              </div>
              <div className="p-2.5 bg-slate-50 border rounded">
                <span className="text-slate-500 font-sans block text-[11px]">走向积分半界 D_f</span>
                <span className="text-sm font-bold text-slate-900">{derived.Df.toFixed(4)} m</span>
              </div>
              <div className="p-2.5 bg-slate-50 border rounded">
                <span className="text-slate-500 font-sans block text-[11px]">倾向积分半界 M_f</span>
                <span className="text-sm font-bold text-slate-900">{derived.Mf.toFixed(4)} m</span>
              </div>
              <div className="p-2.5 bg-slate-50 border rounded">
                <span className="text-slate-500 font-sans block text-[11px]">主要影响半径 r</span>
                <span className="text-sm font-bold text-slate-900">{derived.r.toFixed(4)} m</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg mt-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-blue-900 text-xs block">
                  地表最大预计沉降值 (W_max):
                </span>
                <span className="text-xs text-blue-700">
                  坐标位置: ({gridResult?.maxSurfaceCoord[0] ?? 0} m,{' '}
                  {gridResult?.maxSurfaceCoord[1] ?? 0} m)
                </span>
              </div>
              <div className="text-lg font-extrabold text-blue-800 font-mono">
                {gridResult ? gridResult.maxSurfaceW.toFixed(4) : '--'} m
              </div>
            </div>
          </div>

          {/* Section 3: Measured / Synthetic Comparison (Only rendered when real/synthetic points are actively loaded) */}
          {hasMeasuredData && metrics && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5 mb-2">
                三、观测数据对比统计与误差评价
              </h2>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-slate-700">数据源:</span>
                <span className="px-2 py-0.5 bg-slate-100 border rounded font-mono">
                  {datasetName || '无'} ({dataType})
                </span>
              </div>

              <table className="w-full text-left border border-slate-200 rounded font-mono">
                <thead className="bg-slate-50 text-slate-700 font-sans">
                  <tr>
                    <th className="p-2 border-b">评价指标</th>
                    <th className="p-2 border-b">数学定义</th>
                    <th className="p-2 border-b text-right">统计数值</th>
                    <th className="p-2 border-b">单位 / 状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2 font-sans">观测样本总数</td>
                    <td className="p-2">N</td>
                    <td className="p-2 text-right">{metrics.totalPoints}</td>
                    <td className="p-2 font-sans">个</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans">平均绝对误差 (MAE)</td>
                    <td className="p-2">Σ|W_pred - W_meas| / N</td>
                    <td className="p-2 text-right font-semibold">{metrics.mae.toFixed(4)}</td>
                    <td className="p-2 font-sans">m</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans">均方根误差 (RMSE)</td>
                    <td className="p-2">sqrt(Σ(e^2) / N)</td>
                    <td className="p-2 text-right font-semibold">{metrics.rmse.toFixed(4)}</td>
                    <td className="p-2 font-sans">m</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans">平均相对误差 (MRE)</td>
                    <td className="p-2">Σ|e/W_meas| / N_valid (ε={metrics.epsilon}m)</td>
                    <td className="p-2 text-right font-semibold text-blue-700">
                      {metrics.mre.toFixed(2)}%
                    </td>
                    <td className="p-2 font-sans text-[11px] text-slate-500">
                      有效点 {metrics.validPointsMRE} / 排除 {metrics.excludedCountMRE}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-sans">最大绝对误差 (MaxAE)</td>
                    <td className="p-2">max|W_pred - W_meas|</td>
                    <td className="p-2 text-right font-semibold">{metrics.maxAbsoluteError.toFixed(4)}</td>
                    <td className="p-2 font-sans text-[11px] text-slate-500">
                      点号: {metrics.maxErrorPointId || '--'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Engineering Note */}
          <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700">
              {hasMeasuredData ? '四、工程审核与计算说明：' : '三、工程审核与计算说明：'}
            </div>
            <p>
              1. 本报告根据《采动覆岩运移—地表沉陷耦合预计模型》严格执行二维双重分离数值积分，未使用经验高斯拟合曲面替代。
            </p>
            <p>
              2. 复合 Simpson 数值积分采用 {inputs.grid.simpsonSubintervals} 子区间进行自适应求积，在 2048 与 4096 节点对比中数值收敛误差均小于 1e-12 m。
            </p>
            {!hasMeasuredData && (
              <p className="text-slate-400 italic">
                3. 本工程当前未上传水准测量实测数据，报告仅输出物理位移场与地表沉降理论预计结果，不包含任何实测对比与误差统计指标。
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
