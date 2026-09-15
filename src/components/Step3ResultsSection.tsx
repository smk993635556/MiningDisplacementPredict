import React, { useState, useMemo } from 'react';
import {
  Layers,
  Box,
  TrendingDown,
  Download,
  Info,
  Maximize2,
  FileSpreadsheet,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Calculator,
  Compass,
  FileText,
} from 'lucide-react';
import {
  CalculationGridResult,
  MeasuredPoint,
  ModelInputs,
  DerivedParams,
} from '../types.ts';
import { PlotlyChart } from './PlotlyChart.tsx';
import { computeCenterProfiles } from '../core/model.ts';
import { MeasuredDataComparison } from './MeasuredDataComparison.tsx';

interface Step3ResultsSectionProps {
  gridResult: CalculationGridResult | null;
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
  onOpenDetails: () => void;
  projectName: string;
}

export const Step3ResultsSection: React.FC<Step3ResultsSectionProps> = ({
  gridResult,
  inputs,
  derived,
  measuredPoints,
  dataType,
  datasetName,
  onUpdatePoints,
  onOpenDetails,
  projectName,
}) => {
  const [activeTab, setActiveTab] = useState<'contour' | 'strike' | 'dip' | 'surface3d' | 'measured'>('contour');
  const [contourInterval, setContourInterval] = useState<number>(0.1);
  const [showMeasuredOverlay, setShowMeasuredOverlay] = useState<boolean>(true);

  // Profiles (Strike y=0, Dip x=0)
  const profiles = useMemo(() => {
    return computeCenterProfiles(inputs, derived, inputs.grid);
  }, [inputs, derived]);

  // Measured points categorized by section
  const strikeMeasured = useMemo(() => {
    return (measuredPoints || []).filter((p) => p && (p.section === 'strike' || Math.abs(p.y ?? 0) < 1e-3));
  }, [measuredPoints]);

  const dipMeasured = useMemo(() => {
    return (measuredPoints || []).filter((p) => p && (p.section === 'dip' || Math.abs(p.x ?? 0) < 1e-3));
  }, [measuredPoints]);

  // Compute Subsidence Impact Boundary: W >= threshold (default 0.01m = 10mm)
  const impactBoundary = useMemo(() => {
    if (!gridResult || !gridResult.xs || !gridResult.ys || !gridResult.surfaceW) return null;
    const threshold = inputs.grid.subsidenceThreshold ?? 0.01;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let count = 0;

    for (let j = 0; j < gridResult.ys.length; j++) {
      for (let i = 0; i < gridResult.xs.length; i++) {
        if (gridResult.surfaceW[j]?.[i] >= threshold) {
          count++;
          const x = gridResult.xs[i];
          const y = gridResult.ys[j];
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (count === 0) {
      return {
        threshold,
        strikeRange: '未超过阈值',
        strikeSpan: 0,
        dipRange: '未超过阈值',
        dipSpan: 0,
      };
    }

    return {
      threshold,
      strikeRange: `[${minX.toFixed(0)}, ${maxX.toFixed(0)}]`,
      strikeSpan: maxX - minX,
      dipRange: `[${minY.toFixed(0)}, ${maxY.toFixed(0)}]`,
      dipSpan: maxY - minY,
    };
  }, [gridResult, inputs.grid.subsidenceThreshold]);

  // Export 2D Grid Matrix to CSV
  const handleExportGridCsv = () => {
    if (!gridResult) return;
    const { xs, ys, surfaceW } = gridResult;
    let csv = 'y_coord(m)\\x_coord(m),' + xs.join(',') + '\n';
    for (let j = 0; j < ys.length; j++) {
      csv += `${ys[j]},` + surfaceW[j].map((w) => w.toFixed(6)).join(',') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `地表沉陷预计结果_${projectName || '工程'}_2D网格.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Profile Data to CSV
  const handleExportProfileCsv = () => {
    const strikeXs = profiles?.strike?.xs ?? profiles?.strikeProfile?.map((p) => p.coord) ?? [];
    const strikeWs = profiles?.strike?.ws ?? profiles?.strikeProfile?.map((p) => p.surfaceW) ?? [];
    const dipYs = profiles?.dip?.ys ?? profiles?.dipProfile?.map((p) => p.coord) ?? [];
    const dipWs = profiles?.dip?.ws ?? profiles?.dipProfile?.map((p) => p.surfaceW) ?? [];

    let csv = '走向断面(y=0)\nx(m),W_pred(m)\n';
    for (let i = 0; i < strikeXs.length; i++) {
      csv += `${strikeXs[i]},${(strikeWs[i] ?? 0).toFixed(6)}\n`;
    }
    csv += '\n倾向断面(x=0)\ny(m),W_pred(m)\n';
    for (let i = 0; i < dipYs.length; i++) {
      csv += `${dipYs[i]},${(dipWs[i] ?? 0).toFixed(6)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `地表主断面沉陷数据_${projectName || '工程'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle Quick Load 69 Synthetic Points
  const handleLoadStandardSynthetic = async () => {
    try {
      const resp = await fetch('/examples/合成验证数据_严格公式_69点.csv');
      const text = await resp.text();
      const lines = text.trim().split('\n');
      const points: MeasuredPoint[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length >= 4) {
          const s = parseFloat(parts[2]);
          const w = parseFloat(parts[3]);
          const section = parts[1] as 'strike' | 'dip';
          points.push({
            point_id: parts[0],
            section,
            s,
            x: section === 'dip' ? 0 : s,
            y: section === 'dip' ? s : 0,
            w_measured: w,
          });
        }
      }
      onUpdatePoints(points, '合成验证数据', '标准69点合成验证集');
    } catch (e) {
      alert('载入基准合成数据失败');
    }
  };

  if (!gridResult || !gridResult.xs || !gridResult.ys || !gridResult.surfaceW) {
    return (
      <section className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            3
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">第三步：查看预计结果</h2>
            <p className="text-[11px] text-slate-500">
              请在第二步点击“开始预计”按钮，计算完成后在此查看沉降指标与可视化分析
            </p>
          </div>
        </div>
        <div className="p-12 text-center text-slate-400 text-xs">
          暂无计算结果。请在上方输入参数并点击“开始预计”。
        </div>
      </section>
    );
  }

  // ----------------------------------------------------
  // Chart Data Generation for Tab 1~4
  // ----------------------------------------------------
  let chartData: Plotly.Data[] = [];
  let chartLayout: Partial<Plotly.Layout> = {};

  if (activeTab === 'contour') {
    chartData = [
      {
        z: gridResult.surfaceW,
        x: gridResult.xs,
        y: gridResult.ys,
        type: 'contour',
        colorscale: 'Viridis',
        reversescale: true,
        contours: {
          start: 0,
          end: Math.ceil(gridResult.maxSurfaceW * 10) / 10,
          size: contourInterval,
          showlabels: true,
          labelfont: { size: 10, color: '#ffffff' },
        },
        colorbar: {
          title: { text: '下沉 W (m)<br>向下为正' },
          len: 0.85,
          thickness: 16,
        },
        hovertemplate:
          '走向 x: %{x:.1f} m<br>倾向 y: %{y:.1f} m<br>地表沉降 W: %{z:.4f} m<extra></extra>',
      },
    ];

    if (showMeasuredOverlay && measuredPoints.length > 0) {
      chartData.push({
        x: measuredPoints.map((p) => p?.x ?? 0),
        y: measuredPoints.map((p) => p?.y ?? 0),
        mode: 'markers',
        type: 'scatter',
        name: dataType === '合成验证数据' ? '合成测点' : '实测点',
        marker: {
          color: '#ef4444',
          size: 6,
          symbol: 'circle',
          line: { color: '#ffffff', width: 1 },
        },
        text: measuredPoints.map((p) => `${p?.point_id ?? ''}: ${(p?.w_measured ?? 0).toFixed(3)}m`),
        hovertemplate: '测点 %{text}<extra></extra>',
      });
    }

    chartLayout = {
      title: {
        text: `地表沉降等值线云图 (W向下为正，等值线间距 ${contourInterval}m)`,
        font: { size: 13, color: '#1e293b' },
      },
      xaxis: { title: { text: '工作面走向 x (m)' }, zeroline: true, zerolinecolor: '#94a3b8' },
      yaxis: {
        title: { text: '工作面倾向 y (m)' },
        scaleanchor: 'x',
        scaleratio: 1,
        zeroline: true,
        zerolinecolor: '#94a3b8',
      },
      margin: { l: 60, r: 60, t: 45, b: 55 },
    };
  } else if (activeTab === 'strike') {
    const strikeXs = profiles?.strike?.xs ?? profiles?.strikeProfile?.map((p) => p.coord) ?? [];
    const strikeWs = profiles?.strike?.ws ?? profiles?.strikeProfile?.map((p) => p.surfaceW) ?? [];

    chartData = [
      {
        x: strikeXs,
        y: strikeWs,
        type: 'scatter',
        mode: 'lines',
        name: '理论预计曲线 (y = 0)',
        line: { color: '#2563eb', width: 2.5 },
        hovertemplate: '走向 x: %{x:.1f} m<br>下沉 W: %{y:.4f} m<extra></extra>',
      },
    ];

    if (showMeasuredOverlay && strikeMeasured.length > 0) {
      chartData.push({
        x: strikeMeasured.map((p) => p?.x ?? 0),
        y: strikeMeasured.map((p) => p?.w_measured ?? 0),
        type: 'scatter',
        mode: 'markers',
        name: dataType === '合成验证数据' ? '走向合成测点' : '走向实测点',
        marker: {
          color: '#dc2626',
          size: 7,
          symbol: 'diamond',
          line: { color: '#ffffff', width: 1 },
        },
        text: strikeMeasured.map((p) => `${p?.point_id ?? ''}: 实测 ${(p?.w_measured ?? 0).toFixed(4)}m`),
        hovertemplate: '%{text}<br>走向 x: %{x:.1f} m<extra></extra>',
      });
    }

    chartLayout = {
      title: {
        text: '走向主断面地表沉降曲线 (y = 0 m，向下为正)',
        font: { size: 13, color: '#1e293b' },
      },
      xaxis: { title: { text: '走向位置 x (m)' }, zeroline: true, zerolinecolor: '#94a3b8' },
      yaxis: {
        title: { text: '地表沉降 W (m，向下为正)' },
        autorange: 'reversed', // Downward positive visual convention
        zeroline: true,
        zerolinecolor: '#94a3b8',
      },
      legend: { x: 0.02, y: 0.05 },
      margin: { l: 60, r: 40, t: 45, b: 50 },
    };
  } else if (activeTab === 'dip') {
    const dipYs = profiles?.dip?.ys ?? profiles?.dipProfile?.map((p) => p.coord) ?? [];
    const dipWs = profiles?.dip?.ws ?? profiles?.dipProfile?.map((p) => p.surfaceW) ?? [];

    chartData = [
      {
        x: dipYs,
        y: dipWs,
        type: 'scatter',
        mode: 'lines',
        name: '理论预计曲线 (x = 0)',
        line: { color: '#059669', width: 2.5 },
        hovertemplate: '倾向 y: %{x:.1f} m<br>下沉 W: %{y:.4f} m<extra></extra>',
      },
    ];

    if (showMeasuredOverlay && dipMeasured.length > 0) {
      chartData.push({
        x: dipMeasured.map((p) => p?.y ?? 0),
        y: dipMeasured.map((p) => p?.w_measured ?? 0),
        type: 'scatter',
        mode: 'markers',
        name: dataType === '合成验证数据' ? '倾向合成测点' : '倾向实测点',
        marker: {
          color: '#dc2626',
          size: 7,
          symbol: 'diamond',
          line: { color: '#ffffff', width: 1 },
        },
        text: dipMeasured.map((p) => `${p?.point_id ?? ''}: 实测 ${(p?.w_measured ?? 0).toFixed(4)}m`),
        hovertemplate: '%{text}<br>倾向 y: %{x:.1f} m<extra></extra>',
      });
    }

    chartLayout = {
      title: {
        text: '倾向主断面地表沉降曲线 (x = 0 m，向下为正)',
        font: { size: 13, color: '#1e293b' },
      },
      xaxis: { title: { text: '倾向位置 y (m)' }, zeroline: true, zerolinecolor: '#94a3b8' },
      yaxis: {
        title: { text: '地表沉降 W (m，向下为正)' },
        autorange: 'reversed', // Downward positive visual convention
        zeroline: true,
        zerolinecolor: '#94a3b8',
      },
      legend: { x: 0.02, y: 0.05 },
      margin: { l: 60, r: 40, t: 45, b: 50 },
    };
  } else if (activeTab === 'surface3d') {
    chartData = [
      {
        z: gridResult.surfaceW.map((row) => row.map((v) => -v)), // Negated for downward physical visual basin
        x: gridResult.xs,
        y: gridResult.ys,
        type: 'surface',
        colorscale: 'Viridis',
        colorbar: {
          title: { text: '高程变动 -W (m)' },
          len: 0.7,
        },
        hovertemplate:
          '走向 x: %{x:.1f} m<br>倾向 y: %{y:.1f} m<br>沉降深度 W: %{customdata:.4f} m<extra></extra>',
        customdata: gridResult.surfaceW,
      },
    ];

    chartLayout = {
      title: {
        text: '三维采矿沉陷盆地网格曲面 (Z向下凹陷)',
        font: { size: 13, color: '#1e293b' },
      },
      scene: {
        xaxis: { title: { text: '走向 x (m)' } },
        yaxis: { title: { text: '倾向 y (m)' } },
        zaxis: { title: { text: '垂向深度 -W (m)' } },
        camera: {
          eye: { x: 1.5, y: -1.5, z: 1.2 },
        },
      },
      margin: { l: 20, r: 20, t: 45, b: 20 },
    };
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            3
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">第三步：查看预计结果</h2>
            <p className="text-[11px] text-slate-500">
              三项核心沉降指标、沉降等值线云图、双向主剖面、三维沉陷盆地与实测误差对比
            </p>
          </div>
        </div>

        {/* Details Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenDetails}
          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
          title="打开右侧抽屉，查看 w_PKS、L_z、L_q、D_f、M_f、r 及积分统计"
        >
          <Calculator className="w-3.5 h-3.5 text-blue-600" />
          <span>计算详情</span>
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* 3 Core Result Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Max Subsidence */}
          <div className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-xl border border-blue-100 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">最大地表沉降量 (W_max)</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-blue-700 font-mono tracking-tight">
                {gridResult.maxSurfaceW.toFixed(4)}
              </span>
              <span className="text-xs font-medium text-slate-500">m (向下为正)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              相对采高下沉率 {(gridResult.maxSurfaceW / (inputs.M || 1) * 100).toFixed(1)}%
            </div>
          </div>

          {/* Card 2: Max Subsidence Location */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">最大沉降位置坐标 (x, y)</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                ({(gridResult.maxSurfaceCoord?.[0] ?? gridResult.maxWCoord?.x ?? 0).toFixed(0)},{' '}
                {(gridResult.maxSurfaceCoord?.[1] ?? gridResult.maxWCoord?.y ?? 0).toFixed(0)})
              </span>
              <span className="text-xs font-medium text-slate-500">m</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              采空区对称中心处下沉极值
            </div>
          </div>

          {/* Card 3: Subsidence Impact Range */}
          <div className="p-4 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 rounded-xl border border-emerald-100 shadow-2xs">
            <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
              <span>沉降影响范围 (W ≥ 10mm)</span>
              <span className="text-[10px] text-emerald-700 font-mono">阈值: 0.01m</span>
            </div>
            <div className="mt-1 text-xs space-y-0.5 text-slate-800 font-mono">
              <div>
                走向: <strong className="text-emerald-800">{impactBoundary?.strikeRange}</strong> (跨度 {impactBoundary?.strikeSpan}m)
              </div>
              <div>
                倾向: <strong className="text-emerald-800">{impactBoundary?.dipRange}</strong> (跨度 {impactBoundary?.dipSpan}m)
              </div>
            </div>
          </div>
        </div>

        {/* Visualizer Tab Switcher & Export Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('contour')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'contour'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>沉降云图 (2D)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('strike')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'strike'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>走向主断面 (y = 0)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dip')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'dip'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>倾向主断面 (x = 0)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('surface3d')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'surface3d'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D 沉降盆地</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('measured')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'measured'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : measuredPoints.length > 0
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>实测对比</span>
              {measuredPoints.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === 'measured' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {measuredPoints.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Chart Tools (Only for Tab 1~4) */}
          {activeTab !== 'measured' && (
            <div className="flex items-center gap-2 text-xs">
              {activeTab === 'contour' && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px]">间距:</span>
                  <select
                    value={contourInterval}
                    onChange={(e) => setContourInterval(parseFloat(e.target.value))}
                    className="px-1.5 py-1 bg-white border border-slate-200 rounded text-xs"
                  >
                    <option value={0.05}>0.05 m</option>
                    <option value={0.1}>0.10 m</option>
                    <option value={0.2}>0.20 m</option>
                    <option value={0.5}>0.50 m</option>
                  </select>
                </div>
              )}

              {measuredPoints.length > 0 && (
                <label className="flex items-center gap-1 cursor-pointer text-slate-600 text-[11px]">
                  <input
                    type="checkbox"
                    checked={showMeasuredOverlay}
                    onChange={(e) => setShowMeasuredOverlay(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span>测点叠加</span>
                </label>
              )}

              {/* Export Buttons */}
              <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                <button
                  type="button"
                  onClick={activeTab === 'contour' || activeTab === 'surface3d' ? handleExportGridCsv : handleExportProfileCsv}
                  className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-xs flex items-center gap-1 transition-colors"
                  title="导出当前图表数据为 CSV"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>导出数据 (CSV)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab 1~4: Chart Rendering */}
        {activeTab !== 'measured' && (
          <div className="bg-white rounded-lg border border-slate-200 p-2 min-h-[500px] shadow-2xs">
            <PlotlyChart
              data={chartData}
              layout={chartLayout}
              style={{ width: '100%', height: '520px' }}
              className="rounded-md overflow-hidden"
            />
          </div>
        )}

        {/* Tab 5: Measured Points Comparison */}
        {activeTab === 'measured' && (
          <div>
            {measuredPoints.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">当前工程暂无实测对比数据</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    可在第一步“导入项目 Excel”上传包含“实测数据”工作簿的文件，或点击下方按钮载入标准 69 点合成验证数据集。
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleLoadStandardSynthetic}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>载入标准 69 点合成验证数据</span>
                  </button>
                </div>
              </div>
            ) : (
              <MeasuredDataComparison
                inputs={inputs}
                derived={derived}
                measuredPoints={measuredPoints}
                dataType={dataType}
                datasetName={datasetName}
                onUpdatePoints={onUpdatePoints}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
};
