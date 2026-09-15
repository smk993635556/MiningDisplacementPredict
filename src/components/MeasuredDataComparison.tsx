import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  CheckCircle,
  HelpCircle,
  Search,
  Filter,
  ArrowUpDown,
  FileCheck,
} from 'lucide-react';
import {
  MeasuredPoint,
  ErrorMetrics,
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
  dataType: '合成验证数据' | '现场实测数据';
  datasetName: string;
  onUpdatePoints: (
    points: MeasuredPoint[],
    type: '合成验证数据' | '现场实测数据',
    name: string
  ) => void;
}

export const MeasuredDataComparison: React.FC<MeasuredDataComparisonProps> = ({
  inputs,
  derived,
  measuredPoints,
  dataType,
  datasetName,
  onUpdatePoints,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [epsilon, setEpsilon] = useState<number>(0.01);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'curve' | 'residual' | 'table'>('curve');
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [isLoadingPreset, setIsLoadingPreset] = useState<boolean>(false);

  // Evaluate errors whenever points, inputs, derived or epsilon change
  const evalResult = useMemo(() => {
    return evaluateErrors(measuredPoints, inputs, derived, epsilon, inputs.grid.simpsonSubintervals);
  }, [measuredPoints, inputs, derived, epsilon]);

  const { points: evaluatedPoints, metrics } = evalResult;

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
      setUploadWarning(`解析提示: ${parsed.warnings.slice(0, 3).join('; ')}`);
    }

    onUpdatePoints(parsed.points, parsed.dataType, file.name);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Quick load pre-generated synthetic datasets
  const handleLoadSynthetic = async (type: 'strict' | 'noisy') => {
    setIsLoadingPreset(true);
    setUploadWarning(null);
    try {
      const url =
        type === 'strict'
          ? '/examples/合成验证数据_严格公式_69点.csv'
          : '/examples/合成验证数据_带噪声_69点.csv';
      const res = await fetch(url);
      if (!res.ok) throw new Error('未能获取示例数据文件');
      const text = await res.text();
      const parsed = await parseMeasurementFile(
        text,
        type === 'strict' ? '合成验证数据_严格公式' : '合成验证数据_带噪声'
      );
      if (parsed.success) {
        onUpdatePoints(
          parsed.points,
          '合成验证数据',
          type === 'strict' ? '严格公式合成验证集 (69点)' : '带噪声合成验证集 (69点)'
        );
      }
    } catch (err: any) {
      alert(`载入合成数据集失败: ${err.message}`);
    } finally {
      setIsLoadingPreset(false);
    }
  };

  // Export compared points to CSV
  const handleExportComparisonCsv = () => {
    if (evaluatedPoints.length === 0) return;
    let csv =
      'point_id,section,s(m),x(m),y(m),w_measured(m),w_predicted(m),residual(m),abs_error(m),rel_error(%),is_excluded_from_mre\n';
    for (const p of evaluatedPoints) {
      csv += `${p.point_id},${p.section || ''},${p.s ?? ''},${p.x},${p.y},${p.w_measured},${(
        p.w_predicted || 0
      ).toFixed(6)},${(p.residual || 0).toFixed(6)},${(p.absError || 0).toFixed(6)},${(
        (p.relError || 0) * 100
      ).toFixed(2)},${p.isExcludedFromMRE ? 'YES' : 'NO'}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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

  const curveData: Plotly.Data[] = [
    {
      x: sortedByCoord.map((p) => p?.s ?? p?.x ?? 0),
      y: sortedByCoord.map((p) => p?.w_predicted || 0),
      type: 'scatter',
      mode: 'lines',
      name: '理论耦合预计曲线 W_pred',
      line: { color: '#2563eb', width: 2.5 },
      hovertemplate: '坐标: %{x:.1f} m<br>预计沉降: %{y:.4f} m<extra></extra>',
    },
    {
      x: sortedByCoord.map((p) => p?.s ?? p?.x ?? 0),
      y: sortedByCoord.map((p) => p?.w_measured ?? 0),
      type: 'scatter',
      mode: 'markers',
      name: `${dataType} W_meas`,
      marker: {
        color: dataType === '合成验证数据' ? '#0891b2' : '#dc2626',
        size: 7,
        symbol: 'circle-open-dot',
        line: { width: 2 },
      },
      text: sortedByCoord.map((p) => p?.point_id ?? ''),
      hovertemplate:
        '点号 %{text}<br>坐标: %{x:.1f} m<br>实测/合成下沉: %{y:.4f} m<extra></extra>',
    },
  ];

  const residualData: Plotly.Data[] = [
    {
      x: sortedByCoord.map((p) => p?.s ?? p?.x ?? 0),
      y: sortedByCoord.map((p) => p?.residual || 0),
      type: 'bar',
      name: '残差 (W_pred - W_meas)',
      marker: {
        color: sortedByCoord.map((p) =>
          (p.residual || 0) >= 0 ? '#3b82f6' : '#f97316'
        ),
      },
      text: sortedByCoord.map((p) => p.point_id),
      hovertemplate:
        '点号 %{text}<br>坐标: %{x:.1f} m<br>残差: %{y:.4f} m<extra></extra>',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-4">
      {/* Top Banner & File Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">实测对比与误差分析</h3>
            {/* Strict data type badge */}
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                dataType === '合成验证数据'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              {dataType}
            </span>
            <span className="text-xs text-slate-500 truncate max-w-[200px]">
              {datasetName || '未载入数据'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            严格区分现场实测数据与合成验证数据，提供多指标多维度数值检验。
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleLoadSynthetic('strict')}
            disabled={isLoadingPreset}
            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-medium transition-colors flex items-center gap-1"
            title="载入无噪声严格公式生成的 69 点合成验证数据集 (预期 MAE ≈ 0, MRE ≈ 0%)"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>载入严格公式合成集</span>
          </button>

          <button
            type="button"
            onClick={() => handleLoadSynthetic('noisy')}
            disabled={isLoadingPreset}
            className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded font-medium transition-colors flex items-center gap-1"
            title="载入包含高斯噪声与边缘扰动的 69 点合成验证数据集"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>载入带噪声合成集</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-medium transition-colors flex items-center gap-1 shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>上传 CSV/XLSX</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {uploadWarning && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{uploadWarning}</span>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {/* MAE */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <div className="text-[11px] text-slate-500 mb-0.5">平均绝对误差 (MAE)</div>
          <div className="text-base font-bold text-slate-800">
            {metrics.mae.toFixed(4)} <span className="text-xs font-normal text-slate-400">m</span>
          </div>
          <div className="text-[10px] text-slate-400">Σ|W_pred - W_meas| / N</div>
        </div>

        {/* RMSE */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <div className="text-[11px] text-slate-500 mb-0.5">均方根误差 (RMSE)</div>
          <div className="text-base font-bold text-slate-800">
            {metrics.rmse.toFixed(4)} <span className="text-xs font-normal text-slate-400">m</span>
          </div>
          <div className="text-[10px] text-slate-400">sqrt(Σ(e^2) / N)</div>
        </div>

        {/* MRE with Epsilon control */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-0.5">
            <span>平均相对误差 (MRE)</span>
            <span className="text-[10px] text-blue-600 font-mono">ε={epsilon}m</span>
          </div>
          <div className="text-base font-bold text-slate-800">
            {metrics.mre.toFixed(2)} <span className="text-xs font-normal text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            参与点: {metrics.validPointsMRE} / 排除: {metrics.excludedCountMRE}
          </div>
        </div>

        {/* MaxAE */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <div className="text-[11px] text-slate-500 mb-0.5">最大绝对误差 (MaxAE)</div>
          <div className="text-base font-bold text-slate-800">
            {metrics.maxAbsoluteError.toFixed(4)}{' '}
            <span className="text-xs font-normal text-slate-400">m</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            点号: {metrics.maxErrorPointId || '--'}
          </div>
        </div>

        {/* Total Points */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <div className="text-[11px] text-slate-500 mb-0.5">观测样本统计</div>
          <div className="text-base font-bold text-slate-800">
            {metrics.totalPoints}{' '}
            <span className="text-xs font-normal text-slate-400">点</span>
          </div>
          <div className="text-[10px] text-emerald-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>全量完成计算</span>
          </div>
        </div>
      </div>

      {/* Threshold and Sub-tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('curve')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'curve'
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            预计与观测散点图
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('residual')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'residual'
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            逐点残差柱状图
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'table'
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            逐点对比明细表
          </button>
        </div>

        {/* Epsilon Threshold Slider and Export */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="text-[11px]">MRE 过滤阈值 ε:</span>
            <input
              type="number"
              step="0.005"
              min="0.001"
              max="0.1"
              value={epsilon}
              onChange={(e) => setEpsilon(parseFloat(e.target.value) || 0.01)}
              className="w-16 px-1.5 py-0.5 border border-slate-200 rounded font-mono text-center"
            />
            <span className="text-slate-400">m</span>
          </div>

          <button
            type="button"
            onClick={handleExportComparisonCsv}
            disabled={evaluatedPoints.length === 0}
            className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <Download className="w-3 h-3 text-slate-500" />
            <span>导出对比 CSV</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {evaluatedPoints.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-lg p-10 text-center text-slate-400 text-xs">
          暂无观测数据。请点击上方按钮载入预置的合成验证数据集，或上传您现场的 CSV/XLSX 数据。
        </div>
      ) : activeTab === 'curve' ? (
        <div className="h-[420px] w-full">
          <PlotlyChart
            id="measured-curve-chart"
            data={curveData}
            layout={{
              title: { text: `预计曲线与观测点对比 (${dataType})`, font: { size: 14 } },
              xaxis: { title: { text: '测点位置 / 坐标 (m)' }, zeroline: true },
              yaxis: {
                title: { text: '沉降下沉量 W (m) [向下为正]' },
                autorange: 'reversed',
                zeroline: true,
              },
              legend: { orientation: 'h', y: -0.2 },
            }}
            filename="实测与预计曲线对比"
          />
        </div>
      ) : activeTab === 'residual' ? (
        <div className="h-[420px] w-full">
          <PlotlyChart
            id="measured-residual-chart"
            data={residualData}
            layout={{
              title: { text: '逐点预计残差分布 (W_pred - W_meas)', font: { size: 14 } },
              xaxis: { title: { text: '测点位置 / 坐标 (m)' }, zeroline: true },
              yaxis: {
                title: { text: '残差值 (m)' },
                zeroline: true,
                zerolinecolor: '#ef4444',
                zerolinewidth: 1.5,
              },
            }}
            filename="逐点预计残差分布"
          />
        </div>
      ) : (
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
            <span className="text-xs text-slate-400">
              共 {filteredPoints.length} 条记录 (按坐标排序)
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[380px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2">点号</th>
                  <th className="px-3 py-2">断面</th>
                  <th className="px-3 py-2 text-right">坐标 (x, y)</th>
                  <th className="px-3 py-2 text-right">实测值 (m)</th>
                  <th className="px-3 py-2 text-right">预计值 (m)</th>
                  <th className="px-3 py-2 text-right">残差 (m)</th>
                  <th className="px-3 py-2 text-right">相对误差 (%)</th>
                  <th className="px-3 py-2 text-center">MRE 计算</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredPoints.map((p) => (
                  <tr key={p.point_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-1.5 font-sans font-medium text-slate-800">
                      {p.point_id}
                    </td>
                    <td className="px-3 py-1.5 font-sans text-slate-500">
                      {p.section === 'strike'
                        ? '走向'
                        : p.section === 'dip'
                        ? '倾向'
                        : '--'}
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-600">
                      ({p.x.toFixed(1)}, {p.y.toFixed(1)})
                    </td>
                    <td className="px-3 py-1.5 text-right font-semibold text-slate-800">
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
                      {p.isExcludedFromMRE
                        ? '--'
                        : `${((p.relError || 0) * 100).toFixed(2)}%`}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {p.isExcludedFromMRE ? (
                        <span
                          className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-400 rounded"
                          title={`|W_meas| <= ${epsilon}m，为避免小分母奇点而排除`}
                        >
                          排除 (&le;ε)
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 rounded">
                          有效
                        </span>
                      )}
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
