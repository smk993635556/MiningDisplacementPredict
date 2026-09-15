import React, { useState, useMemo } from 'react';
import {
  Layers,
  Box,
  TrendingDown,
  Download,
  Sliders,
  Eye,
  Info,
} from 'lucide-react';
import { CalculationGridResult, MeasuredPoint, ModelInputs, DerivedParams } from '../types.ts';
import { PlotlyChart } from './PlotlyChart.tsx';
import { computeCenterProfiles } from '../core/model.ts';

interface SurfaceVisualizerProps {
  gridResult: CalculationGridResult | null;
  inputs: ModelInputs;
  derived: DerivedParams;
  measuredPoints?: MeasuredPoint[];
  dataType?: '合成验证数据' | '现场实测数据';
}

export const SurfaceVisualizer: React.FC<SurfaceVisualizerProps> = ({
  gridResult,
  inputs,
  derived,
  measuredPoints = [],
  dataType,
}) => {
  const [activeView, setActiveView] = useState<'contour' | 'surface3d' | 'strike' | 'dip'>('contour');
  const [contourInterval, setContourInterval] = useState<number>(0.1);
  const [showMeasuredOverlay, setShowMeasuredOverlay] = useState<boolean>(true);
  const [invertZ, setInvertZ] = useState<boolean>(false);

  // Profile data
  const profiles = useMemo(() => {
    return computeCenterProfiles(inputs, derived, inputs.grid);
  }, [inputs, derived]);

  // Filter measured points for strike (y = 0 or section === 'strike') and dip (x = 0 or section === 'dip')
  const strikeMeasured = useMemo(() => {
    return measuredPoints.filter((p) => p.section === 'strike' || Math.abs(p.y) < 1e-3);
  }, [measuredPoints]);

  const dipMeasured = useMemo(() => {
    return measuredPoints.filter((p) => p.section === 'dip' || Math.abs(p.x) < 1e-3);
  }, [measuredPoints]);

  // Handle CSV export of the 2D surface grid
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
    a.download = `地表沉陷预计网格_${inputs.caseName}_W_向下为正.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!gridResult || !gridResult.xs || !gridResult.ys || !gridResult.surfaceW) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400">
        请在左侧确认参数后点击“开始预计”以生成地表沉陷数据。
      </div>
    );
  }

  // Generate Plotly Chart Data & Layout based on activeView
  let chartData: Plotly.Data[] = [];
  let chartLayout: Partial<Plotly.Layout> = {};

  if (activeView === 'contour') {
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
          len: 0.8,
          thickness: 16,
        },
        hovertemplate:
          '走向 x: %{x:.1f} m<br>倾向 y: %{y:.1f} m<br>地表沉降 W: %{z:.4f} m<extra></extra>',
      },
    ];

    chartLayout = {
      title: { text: '地表下沉等值线云图 (向下为正, W > 0)', font: { size: 14 } },
      xaxis: { title: { text: '走向坐标 x (m)' }, zeroline: true, zerolinecolor: '#94a3b8' },
      yaxis: {
        title: { text: '倾向坐标 y (m)' },
        scaleanchor: 'x',
        scaleratio: 1,
        zeroline: true,
        zerolinecolor: '#94a3b8',
      },
    };
  } else if (activeView === 'surface3d') {
    chartData = [
      {
        z: invertZ
          ? gridResult.surfaceW.map((row) => row.map((w) => -w))
          : gridResult.surfaceW,
        x: gridResult.xs,
        y: gridResult.ys,
        type: 'surface',
        colorscale: 'Viridis',
        reversescale: true,
        colorbar: {
          title: { text: invertZ ? '高程变化 -W (m)' : '沉降 W (m)<br>向下为正' },
          len: 0.8,
          thickness: 16,
        },
        hovertemplate:
          '走向 x: %{x:.1f} m<br>倾向 y: %{y:.1f} m<br>沉降值: %{z:.4f} m<extra></extra>',
      },
    ];

    chartLayout = {
      title: { text: '地表下沉 3D 漏斗曲面', font: { size: 14 } },
      scene: {
        xaxis: { title: { text: '走向 x (m)' } },
        yaxis: { title: { text: '倾向 y (m)' } },
        zaxis: {
          title: { text: invertZ ? '高程 -W (m)' : '沉降 W (m) [向下为正]' },
          autorange: invertZ ? true : 'reversed', // Display downwards bowl
        },
        camera: {
          eye: { x: 1.4, y: -1.6, z: 1.2 },
        },
      },
    };
  } else if (activeView === 'strike') {
    // Strike Main Profile W(x, 0)
    chartData = [
      {
        x: profiles.strikeProfile.map((p) => p.coord),
        y: profiles.strikeProfile.map((p) => p.surfaceW),
        type: 'scatter',
        mode: 'lines',
        name: '预计下沉曲线 W(x, 0)',
        line: { color: '#2563eb', width: 3 },
        hovertemplate: '走向 x: %{x:.1f} m<br>预计沉降: %{y:.4f} m<extra></extra>',
      },
    ];

    if (showMeasuredOverlay && strikeMeasured.length > 0) {
      chartData.push({
        x: strikeMeasured.map((p) => p.x),
        y: strikeMeasured.map((p) => p.w_measured),
        type: 'scatter',
        mode: 'markers',
        name: `${dataType || '实测'}观测点 (共${strikeMeasured.length}点)`,
        marker: { color: '#dc2626', size: 7, symbol: 'circle-open-dot', line: { width: 2 } },
        hovertemplate:
          '测点 %{text}<br>走向 x: %{x:.1f} m<br>观测沉降: %{y:.4f} m<extra></extra>',
        text: strikeMeasured.map((p) => p.point_id),
      });
    }

    chartLayout = {
      title: { text: '走向主断面地表沉降预计剖面 W(x, y=0)', font: { size: 14 } },
      xaxis: { title: { text: '走向坐标 x (m)' }, zeroline: true, zerolinecolor: '#cbd5e1' },
      yaxis: {
        title: { text: '地表下沉值 W (m) [向下为正]' },
        autorange: 'reversed', // Downward positive visual convention
        zeroline: true,
        zerolinecolor: '#94a3b8',
      },
      legend: { orientation: 'h', y: -0.2 },
    };
  } else if (activeView === 'dip') {
    // Dip Main Profile W(0, y)
    chartData = [
      {
        x: profiles.dipProfile.map((p) => p.coord),
        y: profiles.dipProfile.map((p) => p.surfaceW),
        type: 'scatter',
        mode: 'lines',
        name: '预计下沉曲线 W(0, y)',
        line: { color: '#059669', width: 3 },
        hovertemplate: '倾向 y: %{x:.1f} m<br>预计沉降: %{y:.4f} m<extra></extra>',
      },
    ];

    if (showMeasuredOverlay && dipMeasured.length > 0) {
      chartData.push({
        x: dipMeasured.map((p) => p.y),
        y: dipMeasured.map((p) => p.w_measured),
        type: 'scatter',
        mode: 'markers',
        name: `${dataType || '实测'}观测点 (共${dipMeasured.length}点)`,
        marker: { color: '#dc2626', size: 7, symbol: 'diamond-open-dot', line: { width: 2 } },
        hovertemplate:
          '测点 %{text}<br>倾向 y: %{x:.1f} m<br>观测沉降: %{y:.4f} m<extra></extra>',
        text: dipMeasured.map((p) => p.point_id),
      });
    }

    chartLayout = {
      title: { text: '倾向主断面地表沉降预计剖面 W(x=0, y)', font: { size: 14 } },
      xaxis: { title: { text: '倾向坐标 y (m)' }, zeroline: true, zerolinecolor: '#cbd5e1' },
      yaxis: {
        title: { text: '地表下沉值 W (m) [向下为正]' },
        autorange: 'reversed', // Downward positive visual convention
        zeroline: true,
        zerolinecolor: '#94a3b8',
      },
      legend: { orientation: 'h', y: -0.2 },
    };
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col space-y-3">
      {/* Sub-navbar / view switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveView('contour')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeView === 'contour'
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>等值线云图</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('surface3d')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeView === 'surface3d'
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D 沉降漏斗</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('strike')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeView === 'strike'
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>走向主断面 W(x, 0)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('dip')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeView === 'dip'
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>倾向主断面 W(0, y)</span>
          </button>
        </div>

        {/* View specific controls */}
        <div className="flex items-center gap-2 text-xs">
          {activeView === 'contour' && (
            <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-1 border border-slate-200 rounded">
              <span className="text-[11px] text-slate-500">等值距:</span>
              <select
                value={contourInterval}
                onChange={(e) => setContourInterval(parseFloat(e.target.value))}
                className="bg-transparent font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value={0.05}>0.05 m</option>
                <option value={0.1}>0.10 m</option>
                <option value={0.2}>0.20 m</option>
                <option value={0.5}>0.50 m</option>
              </select>
            </div>
          )}

          {activeView === 'surface3d' && (
            <button
              type="button"
              onClick={() => setInvertZ(!invertZ)}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-600 text-xs flex items-center gap-1"
            >
              <span>{invertZ ? '切换为下沉量 (W>0)' : '切换为负高程 (-W)'}</span>
            </button>
          )}

          {(activeView === 'strike' || activeView === 'dip') && measuredPoints.length > 0 && (
            <label className="flex items-center gap-1 text-slate-600 cursor-pointer bg-slate-50 px-2 py-1 border border-slate-200 rounded">
              <input
                type="checkbox"
                checked={showMeasuredOverlay}
                onChange={(e) => setShowMeasuredOverlay(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span className="text-[11px]">叠加观测散点</span>
            </label>
          )}

          <button
            type="button"
            onClick={handleExportGridCsv}
            className="px-2.5 py-1 text-slate-700 hover:text-blue-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-medium transition-colors flex items-center gap-1"
            title="导出地表沉降二维数值矩阵为 CSV"
          >
            <Download className="w-3 h-3 text-slate-500" />
            <span>导出网格 CSV</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[460px] relative">
        <PlotlyChart
          id="surface-chart-container"
          data={chartData}
          layout={chartLayout}
          filename={`地表沉陷_${activeView}`}
        />
      </div>

      {/* View Explanation Footer */}
      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-blue-500" />
          <span>
            {activeView === 'contour' && '云图等值线采用 Viridis 色阶映射，最大预计下沉位于工作面几何中心 (0, 0)。'}
            {activeView === 'surface3d' && '3D 漏斗曲面支持鼠标拖拽旋转视角、滚轮缩放、双击还原视角。'}
            {activeView === 'strike' && '走向主断面 W(x, 0) 沿煤层推进方向展开，纵轴向下展开保持地表下沉直观感受。'}
            {activeView === 'dip' && '倾向主断面 W(0, y) 垂直于走向方向展开，展示倾向采宽范围内的沉降分布。'}
          </span>
        </div>
        <span className="text-slate-400">坐标单位: m | 下沉单位: m</span>
      </div>
    </div>
  );
};
