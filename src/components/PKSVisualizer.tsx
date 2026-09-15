import React, { useState, useMemo } from 'react';
import {
  Layers,
  Box,
  TrendingDown,
  Info,
} from 'lucide-react';
import { CalculationGridResult, ModelInputs, DerivedParams } from '../types.ts';
import { PlotlyChart } from './PlotlyChart.tsx';
import { computeCenterProfiles } from '../core/model.ts';

interface PKSVisualizerProps {
  gridResult: CalculationGridResult | null;
  inputs: ModelInputs;
  derived: DerivedParams;
}

export const PKSVisualizer: React.FC<PKSVisualizerProps> = ({
  gridResult,
  inputs,
  derived,
}) => {
  const [activeView, setActiveView] = useState<'contour' | 'surface3d' | 'profile'>('contour');

  const profiles = useMemo(() => {
    return computeCenterProfiles(inputs, derived, inputs.grid);
  }, [inputs, derived]);

  if (!gridResult || !gridResult.xs || !gridResult.ys || !gridResult.pksW) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400">
        请在左侧确认参数后点击“开始预计”。
      </div>
    );
  }

  let chartData: Plotly.Data[] = [];
  let chartLayout: Partial<Plotly.Layout> = {};

  if (activeView === 'contour') {
    chartData = [
      {
        z: gridResult.pksW,
        x: gridResult.xs,
        y: gridResult.ys,
        type: 'contour',
        colorscale: 'YlOrRd',
        reversescale: true,
        contours: {
          start: 0,
          end: Math.ceil(derived.wPKS * 10) / 10,
          size: 0.2,
          showlabels: true,
          labelfont: { size: 10, color: '#1e293b' },
        },
        colorbar: {
          title: { text: 'WPKS (m)<br>向下为正' },
          len: 0.8,
          thickness: 16,
        },
        hovertemplate:
          '走向 η: %{x:.1f} m<br>倾向 ξ: %{y:.1f} m<br>PKS下沉: %{z:.4f} m<extra></extra>',
      },
    ];

    chartLayout = {
      title: { text: '主关键层二维破断下沉场云图 WPKS(η, ξ)', font: { size: 14 } },
      xaxis: { title: { text: '主关键层走向坐标 η (m)' }, zeroline: true, zerolinecolor: '#94a3b8' },
      yaxis: {
        title: { text: '主关键层倾向坐标 ξ (m)' },
        scaleanchor: 'x',
        scaleratio: 1,
        zeroline: true,
        zerolinecolor: '#94a3b8',
      },
      shapes: [
        // Rect for Lz / Lq boundary
        {
          type: 'rect',
          x0: -derived.Lz / 2,
          x1: derived.Lz / 2,
          y0: -derived.Lq / 2,
          y1: derived.Lq / 2,
          line: { color: '#dc2626', width: 2, dash: 'dot' },
        },
        // Rect for Df / Mf integration boundary
        {
          type: 'rect',
          x0: -derived.Df,
          x1: derived.Df,
          y0: -derived.Mf,
          y1: derived.Mf,
          line: { color: '#2563eb', width: 1.5, dash: 'dash' },
        },
      ],
      annotations: [
        {
          x: derived.Lz / 2,
          y: derived.Lq / 2,
          text: `破断边界 (Lz/2=${(derived.Lz / 2).toFixed(1)}, Lq/2=${(derived.Lq / 2).toFixed(1)})`,
          showarrow: true,
          arrowhead: 2,
          ax: 40,
          ay: -30,
          font: { size: 10, color: '#dc2626' },
        },
      ],
    };
  } else if (activeView === 'surface3d') {
    chartData = [
      {
        z: gridResult.pksW,
        x: gridResult.xs,
        y: gridResult.ys,
        type: 'surface',
        colorscale: 'YlOrRd',
        reversescale: true,
        colorbar: {
          title: { text: 'PKS 下沉 (m)' },
          len: 0.8,
          thickness: 16,
        },
        hovertemplate:
          '走向 η: %{x:.1f} m<br>倾向 ξ: %{y:.1f} m<br>下沉 WPKS: %{z:.4f} m<extra></extra>',
      },
    ];

    chartLayout = {
      title: { text: '主关键层 3D 下沉盆地曲面', font: { size: 14 } },
      scene: {
        xaxis: { title: { text: '走向 η (m)' } },
        yaxis: { title: { text: '倾向 ξ (m)' } },
        zaxis: {
          title: { text: '下沉量 WPKS (m) [向下为正]' },
          autorange: 'reversed',
        },
        camera: {
          eye: { x: 1.5, y: -1.5, z: 1.2 },
        },
      },
    };
  } else {
    // Both profiles together
    chartData = [
      {
        x: profiles.strikeProfile.map((p) => p.coord),
        y: profiles.strikeProfile.map((p) => p.pksW),
        type: 'scatter',
        mode: 'lines',
        name: '走向中心线 WPKS(η, ξ=0)',
        line: { color: '#ea580c', width: 3 },
        hovertemplate: 'η: %{x:.1f} m<br>WPKS: %{y:.4f} m<extra></extra>',
      },
      {
        x: profiles.dipProfile.map((p) => p.coord),
        y: profiles.dipProfile.map((p) => p.pksW),
        type: 'scatter',
        mode: 'lines',
        name: '倾向中心线 WPKS(η=0, ξ)',
        line: { color: '#d97706', width: 3, dash: 'dash' },
        hovertemplate: 'ξ: %{x:.1f} m<br>WPKS: %{y:.4f} m<extra></extra>',
      },
    ];

    chartLayout = {
      title: { text: '主关键层破断下沉特征剖面线', font: { size: 14 } },
      xaxis: { title: { text: '坐标 (m)' }, zeroline: true, zerolinecolor: '#cbd5e1' },
      yaxis: {
        title: { text: '主关键层下沉量 WPKS (m) [向下为正]' },
        autorange: 'reversed',
        zeroline: true,
        zerolinecolor: '#94a3b8',
      },
      legend: { orientation: 'h', y: -0.2 },
    };
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col space-y-3">
      {/* Top Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveView('contour')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeView === 'contour'
                ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2D 破断边界云图</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('surface3d')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeView === 'surface3d'
                ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D 下沉盆地</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('profile')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeView === 'profile'
                ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>走向/倾向破断剖面</span>
          </button>
        </div>

        {/* Boundary Info Tags */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded">
            破断半长 Lz/2: {(derived.Lz / 2).toFixed(2)} m
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
            积分半界 Df: {derived.Df.toFixed(2)} m
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[460px] relative">
        <PlotlyChart
          id="pks-chart-container"
          data={chartData}
          layout={chartLayout}
          filename={`主关键层下沉_${activeView}`}
        />
      </div>

      {/* Footer Info */}
      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          <span>
            公式: WPKS(η, ξ) = wPKS · F(η, Lz) · F(ξ, Lq)。红虚线标注 Lz/2 与 Lq/2 破断边界，蓝虚线标注 Df 与 Mf 积分截断边界。
          </span>
        </div>
        <span className="text-slate-400">wPKS = {derived.wPKS.toFixed(4)} m</span>
      </div>
    </div>
  );
};
