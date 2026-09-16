import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  CheckCircle,
  Search,
  Trash2,
  RefreshCw,
  FileDown,
  Clock,
  Database,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  MeasuredPoint,
  MeasuredDataMeta,
  ModelInputs,
  DerivedParams,
} from '../types.ts';
import { evaluateErrors } from '../core/model.ts';
import { parseMeasurementFile } from '../core/fileParser.ts';
import { PlotlyChart } from './PlotlyChart.tsx';

interface MeasuredDataComparisonProps {
  inputs: ModelInputs;
  derived: DerivedParams;
  measuredPoints: MeasuredPoint[];
  dataType: '合成测试数据' | '现场实测数据';
  datasetName: string;
  measuredDataMeta?: MeasuredDataMeta | null;
  onUpdatePoints: (
    points: MeasuredPoint[],
    type: '合成测试数据' | '现场实测数据',
    name: string,
    meta?: MeasuredDataMeta
  ) => void;
  onDeleteMeasuredData: () => void;
}

/**
 * Generates and downloads the standard measured data template
 */
function downloadStandardTemplate(format: 'csv' | 'xlsx' = 'csv') {
  const data = [
    ['point_id', 'section', 'x_m', 'y_m', 'w_measured_m', 'data_type'],
    ['Z-300', 'strike', -300, 0, 0.085, '现场实测数据'],
    ['Z0', 'strike', 0, 0, 1.462, '现场实测数据'],
    ['Z300', 'strike', 300, 0, 0.120, '现场实测数据'],
    ['Q-150', 'dip', 0, -150, 0.380, '现场实测数据'],
    ['Q150', 'dip', 0, 150, 0.410, '现场实测数据'],
  ];

  if (format === 'csv') {
    const csvStr = data.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '地表沉陷现场实测数据_标准模板.csv';
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '实测数据');
    XLSX.writeFile(wb, '地表沉陷现场实测数据_标准模板.xlsx');
  }
}

export const MeasuredDataComparison: React.FC<MeasuredDataComparisonProps> = ({
  inputs,
  derived,
  measuredPoints,
  dataType,
  datasetName,
  measuredDataMeta,
  onUpdatePoints,
  onDeleteMeasuredData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reuploadInputRef = useRef<HTMLInputElement>(null);
  const [epsilon, setEpsilon] = useState<number>(0.01);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'curve' | 'residual' | 'table'>('curve');
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);

  // Evaluate errors: only if points are present
  const evalResult = useMemo(() => {
    if (measuredPoints.length === 0) return null;
    return evaluateErrors(
      measuredPoints,
      inputs,
      derived,
      epsilon,
      inputs.grid.simpsonSubintervals
    );
  }, [measuredPoints, inputs, derived, epsilon]);

  const evaluatedPoints = evalResult ? evalResult.points : [];
  const metrics = evalResult ? evalResult.metrics : null;

  // Handle local file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadWarning(null);

    const parsed = await parseMeasurementFile(file, file.name);
    if (!parsed.success) {
      alert(`上传失败: ${parsed.errors.join('\n')}`);
      return;
    }

    if (parsed.warnings.length > 0) {
      setUploadWarning(`数据解析提示 (${parsed.skippedCount} 行跳过): ${parsed.warnings.slice(0, 3).join('; ')}`);
    }

    const meta: MeasuredDataMeta = {
      fileName: file.name,
      validCount: parsed.validCount,
      skippedCount: parsed.skippedCount,
      source: parsed.dataType === '合成测试数据' ? '模拟测试数据（非现场实测）' : '用户上传的现场实测数据',
      uploadedAt: new Date().toLocaleTimeString(),
    };

    onUpdatePoints(parsed.points, parsed.dataType, file.name, meta);
    if (e.target) e.target.value = '';
  };

  // Export compared points to CSV
  const handleExportComparisonCsv = () => {
    if (evaluatedPoints.length === 0) return;
    let csv =
      'point_id,section,s(m),x(m),y(m),w_measured(m),w_predicted(m),residual(m),abs_error(m),rel_error(%),is_excluded_from_mre,data_type\n';
    for (const p of evaluatedPoints) {
      csv += `${p.point_id},${p.section || ''},${p.s ?? ''},${p.x},${p.y},${p.w_measured},${(
        p.w_predicted || 0
      ).toFixed(6)},${(p.residual || 0).toFixed(6)},${(p.absError || 0).toFixed(6)},${(
        (p.relError || 0) * 100
      ).toFixed(2)},${p.isExcludedFromMRE ? 'YES' : 'NO'},${p.dataType || dataType}\n`;
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `实测与预计对比_${datasetName || 'points'}_向下为正.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered points for table view
  const filteredPoints = useMemo(() => {
    if (!searchQuery) return evaluatedPoints;
    const q = searchQuery.toLowerCase();
    return evaluatedPoints.filter(
      (p) =>
        p &&
        ((p.point_id || '').toLowerCase().includes(q) ||
          (p.x ?? '').toString().includes(q) ||
          (p.y ?? '').toString().includes(q))
    );
  }, [evaluatedPoints, searchQuery]);

  // Plots setup
  const sortedByCoord = useMemo(() => {
    return [...evaluatedPoints].sort((a, b) => ((a?.s ?? a?.x) ?? 0) - ((b?.s ?? b?.x) ?? 0));
  }, [evaluatedPoints]);

  const strikePoints = useMemo(() => {
    return sortedByCoord.filter((p) => p && (p.section === 'strike' || Math.abs(p.y ?? 0) < 1e-3));
  }, [sortedByCoord]);

  const dipPoints = useMemo(() => {
    return sortedByCoord.filter((p) => p && (p.section === 'dip' || Math.abs(p.x ?? 0) < 1e-3));
  }, [sortedByCoord]);

  // Chart data for curves (Strike & Dip)
  const curveData: Plotly.Data[] = useMemo(() => {
    const traces: Plotly.Data[] = [];
    const isSynthetic = dataType === '合成测试数据';
    const markerColor = isSynthetic ? '#0891b2' : '#dc2626';

    if (strikePoints.length > 0) {
      traces.push({
        x: strikePoints.map((p) => p.x),
        y: strikePoints.map((p) => p.w_predicted || 0),
        type: 'scatter',
        mode: 'lines',
        name: '走向预计曲线 (y ≈ 0)',
        line: { color: '#2563eb', width: 2 },
        hovertemplate: '走向 x: %{x:.1f} m<br>预计下沉: %{y:.4f} m<extra></extra>',
      });
      traces.push({
        x: strikePoints.map((p) => p.x),
        y: strikePoints.map((p) => p.w_measured),
        type: 'scatter',
        mode: 'markers',
        name: isSynthetic ? '走向模拟测点(非实测)' : '走向现场实测点',
        marker: {
          color: markerColor,
          size: 7,
          symbol: 'circle-dot',
          line: { width: 1.5, color: '#ffffff' },
        },
        text: strikePoints.map((p) => p.point_id),
        hovertemplate: '测点 %{text}<br>走向 x: %{x:.1f} m<br>下沉: %{y:.4f} m<extra></extra>',
      });
    }

    if (dipPoints.length > 0) {
      traces.push({
        x: dipPoints.map((p) => p.y),
        y: dipPoints.map((p) => p.w_predicted || 0),
        type: 'scatter',
        mode: 'lines',
        name: '倾向预计曲线 (x ≈ 0)',
        line: { color: '#059669', width: 2, dash: 'dot' },
        hovertemplate: '倾向 y: %{x:.1f} m<br>预计下沉: %{y:.4f} m<extra></extra>',
      });
      traces.push({
        x: dipPoints.map((p) => p.y),
        y: dipPoints.map((p) => p.w_measured),
        type: 'scatter',
        mode: 'markers',
        name: isSynthetic ? '倾向模拟测点(非实测)' : '倾向现场实测点',
        marker: {
          color: isSynthetic ? '#0284c7' : '#ea580c',
          size: 7,
          symbol: 'diamond-dot',
          line: { width: 1.5, color: '#ffffff' },
        },
        text: dipPoints.map((p) => p.point_id),
        hovertemplate: '测点 %{text}<br>倾向 y: %{x:.1f} m<br>下沉: %{y:.4f} m<extra></extra>',
      });
    }

    return traces;
  }, [strikePoints, dipPoints, dataType]);

  // Residual Plot
  const residualData: Plotly.Data[] = useMemo(() => {
    return [
      {
        x: sortedByCoord.map((p) => p.point_id),
        y: sortedByCoord.map((p) => p.residual || 0),
        type: 'bar',
        name: '残差 (预计 - 实测)',
        marker: {
          color: sortedByCoord.map((p) =>
            (p.residual || 0) >= 0 ? '#3b82f6' : '#f97316'
          ),
        },
        text: sortedByCoord.map(
          (p) =>
            `坐标: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})<br>实测: ${p.w_measured.toFixed(
              4
            )}m<br>预计: ${(p.w_predicted || 0).toFixed(4)}m`
        ),
        hovertemplate: '测点 %{x}<br>%{text}<br>残差: %{y:.4f} m<extra></extra>',
      },
    ];
  }, [sortedByCoord]);

  // =========================================================================
  // 1. EMPTY STATE: When NO measured data is present
  // =========================================================================
  if (measuredPoints.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-2xs space-y-6">
        {/* Empty status hero */}
        <div className="text-center max-w-xl mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              当前工程尚未上传现场实测数据
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              平台默认严格保持实测数据为空，绝不自动填充合成数据。请上传您在矿区现场水准测量采集的真实沉降点文件（支持 CSV 或 XLSX 格式）。
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-2xs"
            >
              <Upload className="w-4 h-4" />
              <span>上传实测数据 (CSV / XLSX)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => downloadStandardTemplate('csv')}
                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <FileDown className="w-3.5 h-3.5 text-slate-500" />
                <span>下载标准模板 (CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => downloadStandardTemplate('xlsx')}
                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>下载标准模板 (XLSX)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Standard Field Specifications Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800">
              标准实测数据字段规范与填写要求
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-1.5 pr-3">字段名称</th>
                  <th className="py-1.5 pr-3">说明</th>
                  <th className="py-1.5 pr-3">类型/取值</th>
                  <th className="py-1.5">示例</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                <tr>
                  <td className="py-1.5 pr-3 font-bold text-slate-900">point_id</td>
                  <td className="py-1.5 pr-3 font-sans">测点编号 (必填)</td>
                  <td className="py-1.5 pr-3 font-sans">字符串</td>
                  <td className="py-1.5 text-blue-700">Z-150 / Q20</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-bold text-slate-900">section</td>
                  <td className="py-1.5 pr-3 font-sans">测线类型 (选填)</td>
                  <td className="py-1.5 pr-3 font-sans">strike / dip / other</td>
                  <td className="py-1.5 text-blue-700">strike</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-bold text-slate-900">x_m</td>
                  <td className="py-1.5 pr-3 font-sans">工作面走向坐标 (m)</td>
                  <td className="py-1.5 pr-3 font-sans">有效数值</td>
                  <td className="py-1.5 text-blue-700">-150.0</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-bold text-slate-900">y_m</td>
                  <td className="py-1.5 pr-3 font-sans">工作面倾向坐标 (m)</td>
                  <td className="py-1.5 pr-3 font-sans">有效数值</td>
                  <td className="py-1.5 text-blue-700">0.0</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-bold text-slate-900">w_measured_m</td>
                  <td className="py-1.5 pr-3 font-sans">实测下沉值 (m，沉降向下为正)</td>
                  <td className="py-1.5 pr-3 font-sans">有效数值</td>
                  <td className="py-1.5 text-blue-700">0.450</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-bold text-slate-900">data_type</td>
                  <td className="py-1.5 pr-3 font-sans">数据类型标记 (选填)</td>
                  <td className="py-1.5 pr-3 font-sans">建议填写“现场实测数据”</td>
                  <td className="py-1.5 text-blue-700">现场实测数据</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 space-y-1">
            <p>• 有效实测记录必须包含有效点号、数值型坐标及下沉值，全空行将被自动跳过。</p>
            <p>• 提示：若仅用于算法学术验证，可打开右上角【高级设置】并在“开发与测试”中载入模拟测试数据。</p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. LOADED STATE: When measured points exist
  // =========================================================================
  const isSynthetic = dataType === '合成测试数据';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Synthetic Warning Banner (if user loaded synthetic test data from Advanced Analysis) */}
      {isSynthetic && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold">【当前显示为模拟测试数据（非现场实测）】</span>
              <span className="ml-1 text-amber-800">
                该数据仅用于理论模型算法验证与功能调试，绝不得作为矿井工程验收或沉陷评估的依据。
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onDeleteMeasuredData}
            className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 rounded font-semibold text-xs whitespace-nowrap transition-colors self-start sm:self-auto"
          >
            清除测试数据
          </button>
        </div>
      )}

      {/* Top Banner & Metadata Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">实测对比与误差分析</h3>
            {/* Status marker */}
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded border ${
                isSynthetic
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              {isSynthetic
                ? '【数据来源：模拟测试数据（非现场实测）】'
                : '【数据来源：用户上传的现场实测数据】'}
            </span>
          </div>

          {/* File details */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
            <span>
              文件名: <strong className="text-slate-700 font-mono">{measuredDataMeta?.fileName || datasetName}</strong>
            </span>
            <span>•</span>
            <span>
              观测点数: <strong className="text-blue-700">{measuredPoints.length}</strong> 点
            </span>
            {measuredDataMeta?.skippedCount ? (
              <>
                <span>•</span>
                <span className="text-amber-600">跳过无效行: {measuredDataMeta.skippedCount} 行</span>
              </>
            ) : null}
            {measuredDataMeta?.uploadedAt ? (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3" />
                  {measuredDataMeta.uploadedAt}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* Action buttons: Re-upload & Delete */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => reuploadInputRef.current?.click()}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
            title="重新选择 CSV 或 XLSX 上传并覆盖当前实测数据"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>重新上传</span>
          </button>
          <input
            ref={reuploadInputRef}
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={onDeleteMeasuredData}
            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-semibold transition-colors flex items-center gap-1.5"
            title="清空当前所有实测数据与对比指标"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>删除实测数据</span>
          </button>
        </div>
      </div>

      {uploadWarning && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{uploadWarning}</span>
        </div>
      )}

      {/* Error Metric Cards (Rule: Displayed when measured points >= 3) */}
      {measuredPoints.length >= 3 && metrics ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* MAE */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-[11px] text-slate-500 mb-0.5">平均绝对误差 (MAE)</div>
            <div className="text-lg font-extrabold text-slate-900 font-mono">
              {metrics.mae.toFixed(4)}{' '}
              <span className="text-xs font-normal text-slate-400">m</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Σ|W_pred - W_meas| / N</div>
          </div>

          {/* RMSE */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-[11px] text-slate-500 mb-0.5">均方根误差 (RMSE)</div>
            <div className="text-lg font-extrabold text-slate-900 font-mono">
              {metrics.rmse.toFixed(4)}{' '}
              <span className="text-xs font-normal text-slate-400">m</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">sqrt(Σ(e^2) / N)</div>
          </div>

          {/* MRE with Epsilon control */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-0.5">
              <span>平均相对误差 (MRE)</span>
              <span className="text-[10px] text-blue-600 font-mono">ε={epsilon}m</span>
            </div>
            <div className="text-lg font-extrabold text-slate-900 font-mono">
              {metrics.mre.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-400">%</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>参与点数: <strong className="text-emerald-700">{metrics.validPointsMRE}</strong></span>
              <span>排除点数: <strong className="text-slate-600">{metrics.excludedCountMRE}</strong></span>
            </div>
          </div>

          {/* MaxAE */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-[11px] text-slate-500 mb-0.5">最大绝对误差 (MaxAE)</div>
            <div className="text-lg font-extrabold text-slate-900 font-mono">
              {metrics.maxAbsoluteError.toFixed(4)}{' '}
              <span className="text-xs font-normal text-slate-400">m</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
              最差点号: <span className="font-mono text-slate-700 font-semibold">{metrics.maxErrorPointId || '--'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>当前实测测点为 {measuredPoints.length} 点，少于 3 点，暂不满足统计性误差分析要求（需 ≥3 点）。</span>
        </div>
      )}

      {/* Sub-tabs & Threshold Control */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveSubTab('curve')}
            className={`px-3 py-1 rounded transition-colors ${
              activeSubTab === 'curve'
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            实测与预计对比曲线
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('residual')}
            className={`px-3 py-1 rounded transition-colors ${
              activeSubTab === 'residual'
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            残差分布图
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('table')}
            className={`px-3 py-1 rounded transition-colors ${
              activeSubTab === 'table'
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            逐点对比明细表
          </button>
        </div>

        {/* Epsilon Threshold Setting and CSV Export */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600" title="实测沉降绝对值小于 ε 的点不参与 MRE 计算，避免分母极小导致的奇点放大">
            <span className="text-[11px]">MRE 排除阈值 ε:</span>
            <input
              type="number"
              step="0.005"
              min="0.001"
              max="0.1"
              value={epsilon}
              onChange={(e) => setEpsilon(parseFloat(e.target.value) || 0.01)}
              className="w-16 px-1.5 py-0.5 border border-slate-200 rounded font-mono text-center text-xs"
            />
            <span className="text-slate-400">m</span>
          </div>

          <button
            type="button"
            onClick={handleExportComparisonCsv}
            className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Download className="w-3 h-3 text-slate-500" />
            <span>导出对比结果 CSV</span>
          </button>
        </div>
      </div>

      {/* Main SubTab Content */}
      {activeSubTab === 'curve' ? (
        <div className="border border-slate-100 rounded-lg p-2 bg-white">
          <PlotlyChart
            data={curveData}
            layout={{
              title: {
                text: `地表沉降实测与理论对比 (${isSynthetic ? '模拟测试数据' : '现场实测'}，向下为正)`,
                font: { size: 13, color: '#1e293b' },
              },
              xaxis: { title: { text: '断面坐标位置 (m)' }, zeroline: true, zerolinecolor: '#94a3b8' },
              yaxis: {
                title: { text: '沉降 W (m，向下为正)' },
                autorange: 'reversed',
                zeroline: true,
                zerolinecolor: '#94a3b8',
              },
              legend: { x: 0.02, y: 0.05, bgcolor: 'rgba(255,255,255,0.85)' },
              margin: { l: 60, r: 40, t: 40, b: 50 },
            }}
            filename="实测与理论沉降对比"
          />
        </div>
      ) : activeSubTab === 'residual' ? (
        <div className="border border-slate-100 rounded-lg p-2 bg-white">
          <PlotlyChart
            data={residualData}
            layout={{
              title: {
                text: '逐点预计残差分布 (残差 = 预计值 - 实测值，正值表示预计下沉偏大)',
                font: { size: 13, color: '#1e293b' },
              },
              xaxis: { title: { text: '测点编号' } },
              yaxis: {
                title: { text: '残差 (m)' },
                zeroline: true,
                zerolinecolor: '#475569',
                zerolinewidth: 1.5,
              },
              margin: { l: 60, r: 40, t: 40, b: 50 },
            }}
            filename="逐点预计残差分布"
          />
        </div>
      ) : (
        /* Table View */
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索点号或坐标..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="text-xs text-slate-500">
              共 {filteredPoints.length} 条有效记录
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[380px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2">点号</th>
                  <th className="px-3 py-2">断面</th>
                  <th className="px-3 py-2 text-right">坐标 (x, y)</th>
                  <th className="px-3 py-2 text-right">实测值 (m)</th>
                  <th className="px-3 py-2 text-right">预计值 (m)</th>
                  <th className="px-3 py-2 text-right">残差 (m)</th>
                  <th className="px-3 py-2 text-right">绝对误差 (m)</th>
                  <th className="px-3 py-2 text-right">相对误差 (%)</th>
                  <th className="px-3 py-2 text-center">MRE 计算</th>
                  <th className="px-3 py-2 text-center">数据类型</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredPoints.map((p) => (
                  <tr key={p.point_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-1.5 font-sans font-semibold text-slate-900">
                      {p.point_id}
                    </td>
                    <td className="px-3 py-1.5 font-sans text-slate-500">
                      {p.section === 'strike'
                        ? '走向'
                        : p.section === 'dip'
                        ? '倾向'
                        : '其他'}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-600">
                      ({p.x.toFixed(1)}, {p.y.toFixed(1)})
                    </td>
                    <td className="px-3 py-1.5 text-right font-bold text-slate-900">
                      {p.w_measured.toFixed(4)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-semibold text-blue-700">
                      {(p.w_predicted || 0).toFixed(4)}
                    </td>
                    <td
                      className={`px-3 py-1.5 text-right font-medium ${
                        Math.abs(p.residual || 0) > 0.05
                          ? 'text-amber-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {(p.residual || 0) >= 0 ? '+' : ''}
                      {(p.residual || 0).toFixed(4)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-600">
                      {(p.absError || 0).toFixed(4)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-600">
                      {p.isExcludedFromMRE
                        ? '--'
                        : `${((p.relError || 0) * 100).toFixed(2)}%`}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {p.isExcludedFromMRE ? (
                        <span
                          className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-400 rounded"
                          title={`|W_meas| < ${epsilon}m，为避免小分母奇点而排除`}
                        >
                          排除 (&lt;ε)
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 rounded font-semibold">
                          参与
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center font-sans">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded ${
                          isSynthetic
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.dataType || dataType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
