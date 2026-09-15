import React, { useEffect, useRef, useState, useCallback } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Download, Maximize2, RefreshCw } from 'lucide-react';

interface PlotlyChartProps {
  id?: string;
  data: Plotly.Data[];
  layout: Partial<Plotly.Layout>;
  config?: Partial<Plotly.Config>;
  className?: string;
  style?: React.CSSProperties;
  onRelayout?: (eventData: any) => void;
  showExportControls?: boolean;
  filename?: string;
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({
  id = 'plotly-chart',
  data,
  layout,
  config,
  className = 'w-full h-full min-h-[380px]',
  style,
  onRelayout,
  showExportControls = true,
  filename = 'chart',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  const mergedLayout: Partial<Plotly.Layout> = {
    autosize: true,
    margin: { t: 40, r: 30, b: 50, l: 60 },
    font: { family: 'system-ui, -apple-system, sans-serif', size: 12, color: '#334155' },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    ...layout,
  };

  const mergedConfig: Partial<Plotly.Config> = {
    responsive: true,
    displayModeBar: false, // We provide clean UI buttons or default buttons
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    ...config,
  };

  useEffect(() => {
    if (!containerRef.current) return;

    Plotly.react(containerRef.current, data, mergedLayout, mergedConfig)
      .then(() => {
        setIsReady(true);
      })
      .catch((err) => {
        console.error('Plotly rendering error:', err);
      });

    const el = containerRef.current;
    if (onRelayout && el) {
      el.removeAllListeners?.('plotly_relayout');
      el.on?.('plotly_relayout', onRelayout);
    }
  }, [data, layout]);

  // ResizeObserver for clean responsive behavior
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (containerRef.current && isReady) {
        Plotly.Plots.resize(containerRef.current);
      }
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, [isReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, []);

  const handleDownloadImage = useCallback(
    (format: 'png' | 'svg') => {
      if (!containerRef.current) return;
      Plotly.downloadImage(containerRef.current, {
        format,
        width: 1200,
        height: 800,
        filename: `${filename}_${format}`,
      });
    },
    [filename]
  );

  const handleResetView = useCallback(() => {
    if (!containerRef.current) return;
    Plotly.relayout(containerRef.current, {
      'xaxis.autorange': true,
      'yaxis.autorange': true,
      'scene.camera': {},
    } as any);
  }, []);

  return (
    <div className="relative group w-full h-full flex flex-col">
      {showExportControls && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm rounded-md px-2 py-1 text-xs text-slate-600">
          <button
            type="button"
            onClick={handleResetView}
            className="p-1 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
            title="重置视角 (Reset View)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => handleDownloadImage('png')}
            className="px-1.5 py-0.5 font-medium hover:text-blue-600 hover:bg-slate-100 rounded transition-colors flex items-center gap-1"
            title="导出 PNG 图片"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadImage('svg')}
            className="px-1.5 py-0.5 font-medium hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
            title="导出矢量 SVG 图片"
          >
            SVG
          </button>
        </div>
      )}

      <div
        id={id}
        ref={containerRef}
        className={className}
        style={{ width: '100%', height: '100%', minHeight: '380px', ...style }}
      />
    </div>
  );
};
