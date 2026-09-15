import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Edit3,
  Download,
  Upload,
  Layers,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ModelInputs, StratumLayer, MeasuredPoint } from '../types.ts';
import {
  parseProjectExcel,
  generateBlankTemplateWorkbook,
  ParsedExcelResult,
} from '../core/excelProjectService.ts';

interface Step1InputSectionProps {
  inputs: ModelInputs;
  onUpdateInputs: (patch: Partial<ModelInputs>) => void;
  strata: StratumLayer[];
  onOpenStratumModal: () => void;
  onApplyExcelProject: (parsed: ParsedExcelResult) => void;
}

export const Step1InputSection: React.FC<Step1InputSectionProps> = ({
  inputs,
  onUpdateInputs,
  strata,
  onOpenStratumModal,
  onApplyExcelProject,
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'excel'>('direct');
  const [dragActive, setDragActive] = useState(false);
  const [parsingExcel, setParsingExcel] = useState(false);
  const [excelResult, setExcelResult] = useState<ParsedExcelResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Field change handler
  const handleNumericChange = (field: keyof ModelInputs, valStr: string) => {
    const val = parseFloat(valStr);
    onUpdateInputs({ [field]: isNaN(val) ? 0 : val });
  };

  // Excel Upload & Parse
  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('请上传 .xlsx 或 .xls 格式的 Excel 工作簿');
      return;
    }
    setParsingExcel(true);
    setExcelResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const result = await parseProjectExcel(buffer, file.name);
      setExcelResult(result);
    } catch (err: any) {
      alert(`解析 Excel 文件失败: ${err?.message || '未知错误'}`);
    } finally {
      setParsingExcel(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmApplyExcel = () => {
    if (excelResult && excelResult.success) {
      onApplyExcelProject(excelResult);
      setActiveTab('direct'); // switch back to direct view to see populated values
    }
  };

  const handleDownloadTemplate = () => {
    generateBlankTemplateWorkbook();
  };

  const handleDownloadSample = () => {
    const link = document.createElement('a');
    link.href = '/examples/开采沉陷预计平台_项目导入示例.xlsx';
    link.download = '开采沉陷预计平台_项目导入示例.xlsx';
    link.click();
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Section Top Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            1
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">第一步：输入工程数据</h2>
            <p className="text-[11px] text-slate-500">
              录入开采几何尺寸、覆岩地层赋存结构及主要影响模型力学参数
            </p>
          </div>
        </div>

        {/* Input Mode Selector */}
        <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'direct'
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>直接填写参数</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'excel'
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>导入项目 Excel</span>
          </button>
        </div>
      </div>

      {/* Mode A: Direct Parameter Input Form */}
      {activeTab === 'direct' && (
        <div className="p-5 space-y-5">
          {/* Group 1: Mining Dimensions */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-blue-600 rounded-xs"></span>
                <span>开采尺寸 (几何边界)</span>
              </div>
              <span className="text-[11px] text-slate-400">采空区走向跨度、倾向跨度与有效采厚</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* d */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-700 flex items-center gap-1">
                    <span>工作面走向长度</span>
                    <span className="text-slate-400 font-mono">(d)</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span
                    className="text-slate-400 hover:text-blue-600 cursor-help"
                    title="开采工作面在走向方向上的几何跨度 (m)，影响主关键层破断下沉范围"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={inputs.d || ''}
                    onChange={(e) => handleNumericChange('d', e.target.value)}
                    placeholder="630.0"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono text-slate-800"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">m</span>
                </div>
              </div>

              {/* m */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-700 flex items-center gap-1">
                    <span>工作面倾向长度</span>
                    <span className="text-slate-400 font-mono">(m)</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span
                    className="text-slate-400 hover:text-blue-600 cursor-help"
                    title="开采工作面在倾向方向上的几何跨度 (m)，影响倾向破断与下沉剖面"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={inputs.m || ''}
                    onChange={(e) => handleNumericChange('m', e.target.value)}
                    placeholder="205.0"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono text-slate-800"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">m</span>
                </div>
              </div>

              {/* M */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-700 flex items-center gap-1">
                    <span>煤层采高</span>
                    <span className="text-slate-400 font-mono">(M)</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span
                    className="text-slate-400 hover:text-blue-600 cursor-help"
                    title="工作面煤层实际采出厚度 (m)，决定顶板最大活动自由空间及破断下沉极值"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={inputs.M || ''}
                    onChange={(e) => handleNumericChange('M', e.target.value)}
                    placeholder="3.6"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono text-slate-800"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Group 2: Overburden Structure */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-2">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-indigo-600 rounded-xs"></span>
                  <span>覆岩结构 (地层赋存)</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenStratumModal}
                  className="px-2 py-0.5 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors flex items-center gap-1 shadow-2xs"
                  title="打开地层表柱状图，自动计算并填回 H_l, H_PKS-u, H_PKS-d"
                >
                  <Layers className="w-3 h-3 text-indigo-600" />
                  <span>从地层表计算</span>
                </button>
              </div>
              <span className="text-[11px] text-slate-400">
                当前地层表已定义 {strata.length} 层
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* H_l */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-700 flex items-center gap-1">
                    <span>松散层厚度</span>
                    <span className="text-slate-400 font-mono">(H_l)</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span
                    className="text-slate-400 hover:text-blue-600 cursor-help"
                    title="地表至基岩顶界面之间的全部第四系及新近系松散层厚度 (m)"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={inputs.H_l || ''}
                    onChange={(e) => handleNumericChange('H_l', e.target.value)}
                    placeholder="440.0"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono text-slate-800"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">m</span>
                </div>
              </div>

              {/* H_PKS_u */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-700 flex items-center gap-1">
                    <span>主关键层上方基岩厚度</span>
                    <span className="text-slate-400 font-mono">(H_PKS-u)</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span
                    className="text-slate-400 hover:text-blue-600 cursor-help"
                    title="基岩顶界面至主关键层上表面之间的基岩层厚度 (m)"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={inputs.H_PKS_u || ''}
                    onChange={(e) => handleNumericChange('H_PKS_u', e.target.value)}
                    placeholder="21.7"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono text-slate-800"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">m</span>
                </div>
              </div>

              {/* H_PKS_d */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-700 flex items-center gap-1">
                    <span>关键层至煤层顶板距离</span>
                    <span className="text-slate-400 font-mono">(H_PKS-d)</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span
                    className="text-slate-400 hover:text-blue-600 cursor-help"
                    title="主关键层下表面至目标开采煤层顶板之间的岩层厚度 (m)，决定垮落碎胀充填空间"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={inputs.H_PKS_d || ''}
                    onChange={(e) => handleNumericChange('H_PKS_d', e.target.value)}
                    placeholder="36.8"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono text-slate-800"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Group 3: Model Parameters */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-emerald-600 rounded-xs"></span>
                <span>模型参数 (破断与扩散)</span>
              </div>
              <span className="text-[11px] text-slate-400">主关键层破断断块尺度、碎胀系数与主要影响角</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {/* L_PKS */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-700 flex items-center gap-1">
                    <span>破断块长</span>
                    <span className="text-slate-400 font-mono">(L_PKS)</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span
                    className="text-slate-400 hover:text-blue-600 cursor-help"
                    title="主关键层初次或周期破断断块特征步距 (m)，影响边界过渡区宽度"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={inputs.L_PKS || ''}
                    onChange={(e) => handleNumericChange('L_PKS', e.target.value)}
                    placeholder="30.7"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono text-slate-800"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">m</span>
                </div>
              </div>

              {/* Kp_res */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-700 flex items-center gap-1">
                    <span>残余碎胀系数</span>
                    <span className="text-slate-400 font-mono">(Kp_res)</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span
                    className="text-slate-400 hover:text-blue-600 cursor-help"
                    title="采空区垮落矸石被压实后的残余碎胀系数，取值 >= 1.0 (基准算例取 1.0)"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="1.0"
                  value={inputs.Kp_res || ''}
                  onChange={(e) => handleNumericChange('Kp_res', e.target.value)}
                  placeholder="1.00"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono text-slate-800"
                />
              </div>

              {/* theta */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-700 flex items-center gap-1">
                    <span>岩层破断角</span>
                    <span className="text-slate-400 font-mono">(θ)</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span
                    className="text-slate-400 hover:text-blue-600 cursor-help"
                    title="主关键层破断边界与水平面的夹角 (0°, 90°)，用于计算主关键层破断跨度 L_z, L_q"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="89.9"
                    value={inputs.theta || ''}
                    onChange={(e) => handleNumericChange('theta', e.target.value)}
                    placeholder="75.0"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono text-slate-800"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">°</span>
                </div>
              </div>

              {/* delta0 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-700 flex items-center gap-1">
                    <span>基岩边界角</span>
                    <span className="text-slate-400 font-mono">(δ0)</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span
                    className="text-slate-400 hover:text-blue-600 cursor-help"
                    title="基岩主要影响角 (0°, 90°)，反映主关键层上方基岩内变形传递扩展角"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="89.9"
                    value={inputs.delta0 || ''}
                    onChange={(e) => handleNumericChange('delta0', e.target.value)}
                    placeholder="46.2"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono text-slate-800"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">°</span>
                </div>
              </div>

              {/* phi */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-700 flex items-center gap-1">
                    <span>松散层移动角</span>
                    <span className="text-slate-400 font-mono">(φ)</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span
                    className="text-slate-400 hover:text-blue-600 cursor-help"
                    title="松散层主要影响移动角 (0°, 90°)，反映表土层中变形扩散角"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="89.9"
                    value={inputs.phi || ''}
                    onChange={(e) => handleNumericChange('phi', e.target.value)}
                    placeholder="45.0"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono text-slate-800"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">°</span>
                </div>
              </div>

              {/* eta_s */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-700 flex items-center gap-1">
                    <span>地表下沉系数</span>
                    <span className="text-slate-400 font-mono">(η_s)</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span
                    className="text-slate-400 hover:text-blue-600 cursor-help"
                    title="地表下沉系数，反映地表最终最大下沉值与主关键层下沉的综合比例关系"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="2.0"
                  value={inputs.eta_s || ''}
                  onChange={(e) => handleNumericChange('eta_s', e.target.value)}
                  placeholder="1.10"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode B: Excel Project Import */}
      {activeTab === 'excel' && (
        <div className="p-5 space-y-4">
          {/* Download Templates Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-xs">
            <div className="text-slate-700">
              Excel 工作簿标准结构包含 3 个工作表：<strong>项目参数</strong>、<strong>地层表</strong>与<strong>实测数据</strong>。
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="下载带有标准格式与填报说明的空白 Excel 模板"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>下载空白模板</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
                title="下载包含基准参数、16层地层表与69个实测点的标准示例 Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>下载标准示例 Excel</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  点击选择文件或将 Excel 拖拽到此处
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  支持 .xlsx、.xls 文件，自动读取项目参数、地层柱状表与实测验证点
                </p>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {parsingExcel && (
            <div className="text-center py-4 text-xs text-blue-600 flex items-center justify-center gap-2 font-medium">
              <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              <span>正在快速解析 Excel 工作表结构与地层数据...</span>
            </div>
          )}

          {/* Parsed Result Summary Card */}
          {excelResult && (
            <div
              className={`p-4 rounded-lg border text-xs space-y-3 ${
                excelResult.success
                  ? 'bg-emerald-50/40 border-emerald-200 text-slate-800'
                  : 'bg-red-50/40 border-red-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  {excelResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-bold text-sm text-slate-900">
                    {excelResult.success ? 'Excel 解析成功' : 'Excel 校验未通过'}
                  </span>
                  <span className="px-2 py-0.5 bg-white rounded border text-slate-600 font-medium">
                    工程名称: {excelResult.projectName}
                  </span>
                </div>

                {excelResult.success && (
                  <button
                    type="button"
                    onClick={handleConfirmApplyExcel}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-2xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>确认应用到当前工程</span>
                  </button>
                )}
              </div>

              {/* Summary Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-[11px] text-slate-400">已读取参数项</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                    {excelResult.summary.parametersCount} / 9 项
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-[11px] text-slate-400">地层柱状层数</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                    {excelResult.summary.strataCount} 层
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-[11px] text-slate-400">结构识别状态</div>
                  <div className="text-xs font-semibold mt-0.5 flex items-center gap-2">
                    <span className={excelResult.summary.pksRecognized ? 'text-emerald-700' : 'text-red-600'}>
                      关键层: {excelResult.summary.pksRecognized ? '已识别' : '未找到'}
                    </span>
                    <span className={excelResult.summary.coalRecognized ? 'text-emerald-700' : 'text-red-600'}>
                      煤层: {excelResult.summary.coalRecognized ? '已识别' : '未找到'}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-[11px] text-slate-400">实测散点数</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                    {excelResult.summary.measuredPointsCount} 个测点
                  </div>
                </div>
              </div>

              {/* Calculated Stratum Dimensions from Excel */}
              {excelResult.summary.calculatedH_l !== undefined && (
                <div className="bg-white p-2.5 rounded border border-slate-200 flex flex-wrap items-center gap-4 text-xs font-mono">
                  <span className="font-sans text-slate-500">地层自动计算结果:</span>
                  <span>H_l = <strong>{excelResult.summary.calculatedH_l}m</strong></span>
                  <span>H_PKS-u = <strong>{excelResult.summary.calculatedH_PKS_u}m</strong></span>
                  <span>H_PKS-d = <strong>{excelResult.summary.calculatedH_PKS_d}m</strong></span>
                </div>
              )}

              {/* Errors & Warnings */}
              {excelResult.errors.length > 0 && (
                <div className="p-2.5 bg-red-100/70 border border-red-200 rounded text-red-800 space-y-1">
                  <div className="font-semibold text-xs">存在以下必须修正的错误：</div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {excelResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {excelResult.warnings.length > 0 && (
                <div className="p-2.5 bg-amber-100/70 border border-amber-200 rounded text-amber-900 space-y-1">
                  <div className="font-semibold text-xs">提示与警告：</div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {excelResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
