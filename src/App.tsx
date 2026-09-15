import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ModelInputs,
  DerivedParams,
  CalculationGridResult,
  MeasuredPoint,
  StratumLayer,
  GridConfig,
  PRESET_1312_1,
  DEFAULT_16_STRATA,
  DEFAULT_PROJECT_NAME,
  EXAMPLE_PROJECT_NAME,
} from './types.ts';
import {
  validateInputs,
  calculateDerivedParams,
  computeFullGrid,
  evaluateErrors,
} from './core/model.ts';
import { parseMeasurementFile } from './core/fileParser.ts';
import { ParsedExcelResult } from './core/excelProjectService.ts';

// Components
import { Header } from './components/Header.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { Step1InputSection } from './components/Step1InputSection.tsx';
import { Step2ActionSection } from './components/Step2ActionSection.tsx';
import { Step3ResultsSection } from './components/Step3ResultsSection.tsx';
import { DetailsDrawer } from './components/DetailsDrawer.tsx';
import { AdvancedAnalysisModal } from './components/AdvancedAnalysisModal.tsx';
import { StratumModal } from './components/StratumModal.tsx';
import { HelpModal } from './components/HelpModal.tsx';
import { ReportModal } from './components/ReportModal.tsx';

export default function App() {
  // Navigation View State
  const [currentView, setCurrentView] = useState<'landing' | 'workbench'>('workbench');

  // Main Project State
  const [projectName, setProjectName] = useState<string>(EXAMPLE_PROJECT_NAME);
  const [inputs, setInputs] = useState<ModelInputs>(PRESET_1312_1);
  const [strata, setStrata] = useState<StratumLayer[]>(DEFAULT_16_STRATA);

  // Measurement State
  const [measuredPoints, setMeasuredPoints] = useState<MeasuredPoint[]>([]);
  const [dataType, setDataType] = useState<'合成验证数据' | '现场实测数据'>('合成验证数据');
  const [datasetName, setDatasetName] = useState<string>('标准69点合成验证集');

  // Calculation Results
  const [gridResult, setGridResult] = useState<CalculationGridResult | null>(null);
  const [isComputing, setIsComputing] = useState<boolean>(false);

  // Modals and Drawer Visibility
  const [showStratumModal, setShowStratumModal] = useState<boolean>(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState<boolean>(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Validation
  const validation = useMemo(() => validateInputs(inputs), [inputs]);

  // Derived Parameters (wPKS, Lz, Lq, Df, Mf, r)
  const derived = useMemo(() => {
    return calculateDerivedParams(inputs);
  }, [inputs]);

  // Error metrics for current points
  const errorMetrics = useMemo(() => {
    return evaluateErrors(
      measuredPoints,
      inputs,
      derived,
      0.01,
      inputs.grid.simpsonSubintervals
    ).metrics;
  }, [measuredPoints, inputs, derived]);

  // Core computation trigger
  const runComputation = useCallback(() => {
    if (!validation.valid) return;
    setIsComputing(true);

    setTimeout(() => {
      try {
        const result = computeFullGrid(inputs, derived, inputs.grid);
        setGridResult(result);
      } catch (err) {
        console.error('Computation error:', err);
      } finally {
        setIsComputing(false);
      }
    }, 30);
  }, [inputs, derived, validation.valid]);

  // Initial mount computation and synthetic dataset loading
  useEffect(() => {
    runComputation();

    fetch('/examples/合成验证数据_严格公式_69点.csv')
      .then((res) => {
        if (!res.ok) throw new Error('File not found');
        return res.text();
      })
      .then((csvText) => {
        return parseMeasurementFile(csvText, '合成验证数据_严格公式');
      })
      .then((parsed) => {
        if (parsed.success && parsed.points.length > 0) {
          setMeasuredPoints(parsed.points);
          setDataType('合成验证数据');
          setDatasetName('标准69点合成验证集');
        }
      })
      .catch((e) => {
        console.warn('Initial synthetic dataset fetch notice:', e);
      });
  }, []);

  // Update inputs patch
  const handleUpdateInputs = (patch: Partial<ModelInputs>) => {
    setInputs((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  // Update calculation grid config
  const handleUpdateGrid = (patch: Partial<GridConfig>) => {
    setInputs((prev) => ({
      ...prev,
      grid: {
        ...prev.grid,
        ...patch,
      },
    }));
  };

  // Reset grid to optimal bounds based on d, m, and r
  const handleResetAdaptiveGrid = () => {
    const effectiveR = derived.r > 50 ? derived.r : 400;
    const halfX = Math.ceil((inputs.d / 2 + 1.4 * effectiveR) / 50) * 50;
    const halfY = Math.ceil((inputs.m / 2 + 1.4 * effectiveR) / 50) * 50;

    handleUpdateGrid({
      xMin: -halfX,
      xMax: halfX,
      xStep: 20,
      yMin: -halfY,
      yMax: halfY,
      yStep: 20,
      simpsonSubintervals: 2048,
      subsidenceThreshold: 0.01,
    });
  };

  // Reset to built-in standard benchmark
  const handleResetPreset = () => {
    setInputs(PRESET_1312_1);
    setStrata(DEFAULT_16_STRATA);
    setProjectName(EXAMPLE_PROJECT_NAME);
    setTimeout(() => {
      runComputation();
    }, 50);
  };

  // Clear all inputs to blank/zero
  const handleClearInputs = () => {
    setProjectName(DEFAULT_PROJECT_NAME);
    setInputs({
      caseName: DEFAULT_PROJECT_NAME,
      d: 0,
      m: 0,
      M: 0,
      alpha: 0,
      miningDepth: 0,
      H_PKS_d: 0,
      H_PKS_u: 0,
      H_l: 0,
      Kp_res: 1.0,
      theta: 75.0,
      L_PKS: 0,
      delta0: 0,
      phi: 0,
      eta_s: 1.0,
      grid: {
        xMin: -800,
        xMax: 800,
        xStep: 20,
        yMin: -800,
        yMax: 800,
        yStep: 20,
        simpsonSubintervals: 2048,
        subsidenceThreshold: 0.01,
      },
    });
    setMeasuredPoints([]);
    setGridResult(null);
  };

  // Apply parsed project from Excel
  const handleApplyExcelProject = (parsed: ParsedExcelResult) => {
    if (parsed.projectName) {
      setProjectName(parsed.projectName);
    }
    if (parsed.inputs) {
      setInputs((prev) => ({
        ...prev,
        ...parsed.inputs,
        grid: prev.grid, // preserve or adapt grid
      }));
    }
    if (parsed.strata && parsed.strata.length > 0) {
      setStrata(parsed.strata);
    }
    if (parsed.measuredPoints && parsed.measuredPoints.length > 0) {
      setMeasuredPoints(parsed.measuredPoints);
      setDataType('现场实测数据');
      setDatasetName(`Excel导入测点 (${parsed.measuredPoints.length}点)`);
    }

    setTimeout(() => {
      runComputation();
    }, 100);
  };

  // Apply values auto-calculated from StratumModal
  const handleApplyStratumCalculated = (calculated: {
    H_l: number;
    H_PKS_u: number;
    H_PKS_d: number;
    M?: number;
  }) => {
    setInputs((prev) => ({
      ...prev,
      H_l: calculated.H_l,
      H_PKS_u: calculated.H_PKS_u,
      H_PKS_d: calculated.H_PKS_d,
      ...(calculated.M ? { M: calculated.M } : {}),
    }));
  };

  // Apply calibrated parameters from AdvancedAnalysisModal
  const handleApplyCalibration = (patch: Partial<ModelInputs>) => {
    setInputs((prev) => ({
      ...prev,
      ...patch,
    }));
    setTimeout(() => {
      runComputation();
    }, 50);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      {/* 1. Generic Header Toolbar */}
      <Header
        projectName={projectName}
        setProjectName={setProjectName}
        onResetPreset={handleResetPreset}
        onClearInputs={handleClearInputs}
        onOpenAdvanced={() => setShowAdvancedModal(true)}
        onOpenHelp={() => setShowHelpModal(true)}
        onOpenReport={() => setShowReportModal(true)}
        inputs={inputs}
        strata={strata}
        measuredPoints={measuredPoints}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* 2. Main Content: Landing Page OR Calculation Workbench */}
      {currentView === 'landing' ? (
        <LandingPage
          onEnterWorkbench={() => setCurrentView('workbench')}
          onLoadExampleAndEnter={() => {
            handleResetPreset();
            setCurrentView('workbench');
          }}
          onOpenHelp={() => setShowHelpModal(true)}
          onOpenAdvanced={() => setShowAdvancedModal(true)}
        />
      ) : (
        /* Calculation Workbench: Responsive Two-Column Layout (Left: Inputs & Action, Right: Results) */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (lg: 5 cols): Step 1 (Inputs) + Step 2 (Validation & Action) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Step 1: Input Section */}
              <Step1InputSection
                inputs={inputs}
                onUpdateInputs={handleUpdateInputs}
                strata={strata}
                onOpenStratumModal={() => setShowStratumModal(true)}
                onApplyExcelProject={handleApplyExcelProject}
              />

              {/* Step 2: Validation & Compute Section */}
              <Step2ActionSection
                inputs={inputs}
                validation={validation}
                isComputing={isComputing}
                onCompute={runComputation}
                onUpdateGrid={handleUpdateGrid}
                onResetAdaptiveGrid={handleResetAdaptiveGrid}
              />
            </div>

            {/* Right Column (lg: 7 cols): Step 3 (Results & Visualizer) */}
            <div className="lg:col-span-7">
              <Step3ResultsSection
                gridResult={gridResult}
                inputs={inputs}
                derived={derived}
                measuredPoints={measuredPoints}
                dataType={dataType}
                datasetName={datasetName}
                onUpdatePoints={(pts, type, name) => {
                  setMeasuredPoints(pts);
                  setDataType(type);
                  setDatasetName(name);
                }}
                onOpenDetails={() => setShowDetailsDrawer(true)}
                projectName={projectName}
              />
            </div>
          </div>
        </main>
      )}

      {/* 3. Footer */}
      <footer className="mt-auto py-4 px-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>采动覆岩运移—地表沉陷耦合预计平台</span>
          <span>•</span>
          <span className="font-medium text-slate-700">严格实现主关键层破断位移场与地表移动二重积分理论</span>
          <span>•</span>
          <span className="text-blue-700 font-semibold">符号约定：沉降向下为正 (W &gt; 0, 单位: m)</span>
          <span>•</span>
          <span>纯浏览器本地计算</span>
        </div>
      </footer>

      {/* 4. Modals & Drawers */}
      {/* Details Drawer */}
      <DetailsDrawer
        isOpen={showDetailsDrawer}
        onClose={() => setShowDetailsDrawer(false)}
        inputs={inputs}
        derived={derived}
        gridResult={gridResult}
      />

      {/* Stratum Column Modal */}
      <StratumModal
        isOpen={showStratumModal}
        onClose={() => setShowStratumModal(false)}
        strata={strata}
        onSaveStrata={(newStrata) => setStrata(newStrata)}
        onApplyToInputs={handleApplyStratumCalculated}
      />

      {/* Advanced Analysis Modal (PKS 3D, Model Self-Check, Parameter Calibration) */}
      <AdvancedAnalysisModal
        isOpen={showAdvancedModal}
        onClose={() => setShowAdvancedModal(false)}
        inputs={inputs}
        derived={derived}
        gridResult={gridResult}
        measuredPoints={measuredPoints}
        onApplyCalibration={handleApplyCalibration}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* Printable Engineering Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        projectName={projectName}
        inputs={inputs}
        derived={derived}
        gridResult={gridResult}
        metrics={errorMetrics}
        dataType={dataType}
        datasetName={datasetName}
      />
    </div>
  );
}
