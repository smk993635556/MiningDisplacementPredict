import React from 'react';
import {
  Layers,
  RotateCcw,
  Trash2,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Sliders,
} from 'lucide-react';
import { ModelInputs, StratumLayer, MeasuredPoint } from '../types.ts';
import { exportProjectToExcel } from '../core/excelProjectService.ts';

interface HeaderProps {
  projectName: string;
  setProjectName: (name: string) => void;
  onResetPreset: () => void;
  onClearInputs: () => void;
  onOpenAdvanced: () => void;
  onOpenHelp: () => void;
  onOpenReport: () => void;
  inputs: ModelInputs;
  strata: StratumLayer[];
  measuredPoints: MeasuredPoint[];
  currentView: 'landing' | 'workbench';
  onViewChange: (view: 'landing' | 'workbench') => void;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  setProjectName,
  onResetPreset,
  onClearInputs,
  onOpenAdvanced,
  onOpenHelp,
  onOpenReport,
  inputs,
  strata,
  measuredPoints,
  currentView,
  onViewChange,
}) => {
  const handleExportProjectExcel = () => {
    exportProjectToExcel({
      projectName: projectName || '未命名工程',
      inputs,
      strata,
      measuredPoints,
    });
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Title and Branding */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onViewChange('landing')}
            className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-2xs flex-shrink-0 transition-colors"
            title="点击返回算法原理首页"
          >
            <Layers className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                采动覆岩运移与地表沉陷耦合预计平台
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">
                通用预计系统
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">当前工程:</span>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="未命名工程"
                  className="font-semibold text-slate-800 hover:text-blue-600 border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-600 focus:outline-hidden bg-transparent px-1 py-0 w-36 sm:w-48 transition-colors"
                  title="点击修改工程项目名称"
                />
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher & Action Buttons Toolbar */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          {/* Primary View Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 mr-1 text-xs">
            <button
              type="button"
              onClick={() => onViewChange('landing')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                currentView === 'landing'
                  ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              算法介绍
            </button>
            <button
              type="button"
              onClick={() => onViewChange('workbench')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                currentView === 'workbench'
                  ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              预计工作台
            </button>
          </div>

          {/* Load Sample Parameters */}
          <button
            type="button"
            onClick={onResetPreset}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 border border-slate-200 rounded-md transition-colors flex items-center gap-1.5"
            title="载入一组通用标准示例数据"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">载入示例参数</span>
            <span className="sm:hidden">示例</span>
          </button>

          {/* Clear Inputs */}
          <button
            type="button"
            onClick={onClearInputs}
            className="px-2 py-1.5 text-xs font-medium text-slate-700 hover:text-red-700 hover:bg-red-50/80 border border-slate-200 rounded-md transition-colors flex items-center gap-1.5"
            title="清空当前所有几何与模型参数输入"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">清空</span>
          </button>

          {/* Export Project Excel */}
          <button
            type="button"
            onClick={handleExportProjectExcel}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1.5"
            title="导出当前工程的完整 Excel (包含项目参数、地层表、实测数据)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">导出</span>
            <span>Excel</span>
          </button>

          {/* Advanced Analysis */}
          <button
            type="button"
            onClick={onOpenAdvanced}
            className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 rounded-md transition-colors flex items-center gap-1.5"
            title="查看主关键层破断位移场、运行数值自检套件与参数反演"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>高级分析</span>
          </button>

          {/* Export Report */}
          <button
            type="button"
            onClick={onOpenReport}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors flex items-center gap-1.5"
            title="生成并打印通用工程预计报告"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">报告</span>
          </button>

          {/* Help & Documentation */}
          <button
            type="button"
            onClick={onOpenHelp}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            title="查看平台使用说明与模型理论"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>
    </header>
  );
};
