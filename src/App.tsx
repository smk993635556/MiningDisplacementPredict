import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ModelInputs,
  DerivedParams,
  CalculationGridResult,
  MeasuredPoint,
  MeasuredDataMeta,
  StratumLayer,
  GridConfig,
  PRESET_1312_1,
  DEFAULT_16_STRATA,
  DEFAULT_PROJECT_NAME,
  EXAMPLE_PROJECT_NAME,
  ENGINEERING_PRESETS,
} from './types.ts';
import {
  validateInputs,
  calculateDerivedParams,
  computeFullGrid,
  evaluateErrors,
  calculateAdaptiveGridConfig,
  checkGridCoverage,
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

  // Measurement State - Strictly empty on first mount!
  const [measuredPoints, setMeasuredPoints] = useState<MeasuredPoint[]>([]);
  const [dataType, setDataType] = useState<'现场实测数据' | '合成测试数据'>('现场实测数据');
  const [datasetName, setDatasetName] = useState<string>('');
  const [measuredDataMeta, setMeasuredDataMeta] = useState<MeasuredDataMeta | null>(null);

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

  // Error metrics for current points - only evaluated if points exist
  const errorMetrics = useMemo(() => {
    if (measuredPoints.length === 0) return undefined;
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

  // Initial mount computation only - strictly NO synthetic data loading
  useEffect(() => {
    runComputation();
  }, []);

  // Update inputs patch
  // Rule: If key parameters changed, invalidate previous results (Requirement 6)
  // and recalculate adaptive grid bounds if in adaptive mode (Requirement 1 & 2)
  const handleUpdateInputs = (patch: Partial<ModelInputs>) => {
    const isKeyParamChanged =
      patch.d !== undefined ||
      patch.m !== undefined ||
      patch.M !== undefined ||
      patch.H_PKS_d !== undefined ||
      patch.H_PKS_u !== undefined ||
      patch.H_l !== undefined ||
      patch.theta !== undefined ||
      patch.delta0 !== undefined ||
      patch.phi !== undefined ||
      patch.L_PKS !== undefined ||
      patch.Kp_res !== undefined ||
      patch.eta_s !== undefined;

    if (isKeyParamChanged) {
      // Invalidate previous calculation results
      setGridResult(null);
    }

    setInputs((prev) => {
      const next = { ...prev, ...patch };
      // If in adaptive mode (default), automatically re-calculate adaptive grid bounds
      if (isKeyParamChanged && prev.grid.mode !== 'manual') {
        const nextDerived = calculateDerivedParams(next);
        const adaptiveGrid = calculateAdaptiveGridConfig(next, nextDerived, prev.grid);
        next.grid = adaptiveGrid;
      }
      return next;
    });
  };

  // Update calculation grid config
  // Rule: Modifying grid invalidates previous results and transitions to manual mode
  const handleUpdateGrid = (patch: Partial<GridConfig>) => {
    setGridResult(null);
    setInputs((prev) => ({
      ...prev,
      grid: {
        ...prev.grid,
        ...patch,
        mode: patch.mode !== undefined ? patch.mode : 'manual',
      },
    }));
  };

  // Switch grid mode: adaptive vs manual
  const handleSetGridMode = (mode: 'adaptive' | 'manual') => {
    if (mode === 'adaptive') {
      handleResetAdaptiveGrid();
    } else {
      handleUpdateGrid({ mode: 'manual' });
    }
  };

  // Reset grid to optimal bounds based on d, m, and r, and recalculate immediately
  const handleResetAdaptiveGrid = () => {
    const adaptiveGrid = calculateAdaptiveGridConfig(inputs, derived);
    const updatedInputs: ModelInputs = {
      ...inputs,
      grid: adaptiveGrid,
    };
    setInputs(updatedInputs);
    setGridResult(null);
    setIsComputing(true);

    setTimeout(() => {
      try {
        const result = computeFullGrid(updatedInputs, derived, adaptiveGrid);
        setGridResult(result);
      } catch (err) {
        console.error('Computation error:', err);
      } finally {
        setIsComputing(false);
      }
    }, 30);
  };

  // Switch or reset to engineering preset
  // Rule: Strictly clear previous measured/synthetic data, invalidate old grids,
  // recompute adaptive grid, and immediately generate results for current engineering!
  const handleSelectPreset = (presetId: string = 'preset_standard') => {
    const presetItem =
      ENGINEERING_PRESETS.find((p) => p.id === presetId) || ENGINEERING_PRESETS[0];
    const targetInputs = { ...presetItem.inputs };
    const targetDerived = calculateDerivedParams(targetInputs);
    // Automatically calculate adaptive grid bounds for this project (Requirement 1 & 2)
    const adaptiveGrid = calculateAdaptiveGridConfig(targetInputs, targetDerived);
    targetInputs.grid = adaptiveGrid;

    setProjectName(presetItem.name);
    setInputs(targetInputs);
    setStrata(DEFAULT_16_STRATA);
    setMeasuredPoints([]);
    setDataType('现场实测数据');
    setDatasetName('');
    setMeasuredDataMeta(null);
    setGridResult(null);

    // Immediately compute and render fresh results for current engineering
    setIsComputing(true);
    setTimeout(() => {
      try {
        const result = computeFullGrid(targetInputs, targetDerived, adaptiveGrid);
        setGridResult(result);
      } catch (err) {
        console.error('Computation error:', err);
      } finally {
        setIsComputing(false);
      }
    }, 40);
  };

  const handleResetPreset = () => {
    handleSelectPreset('preset_standard');
  };

  // Clear all inputs to blank/zero
  // Rule: Must clear measured data, synthetic data, error metrics and source markers!
  const handleClearInputs = () => {
    setProjectName(DEFAULT_PROJECT_NAME);
    const blankInputs: ModelInputs = {
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
        mode: 'adaptive',
        xMin: -800,
        xMax: 800,
        xStep: 20,
        yMin: -800,
        yMax: 800,
        yStep: 20,
        simpsonSubintervals: 2048,
        subsidenceThreshold: 0.01,
      },
    };
    setInputs(blankInputs);
    setMeasuredPoints([]);
    setDataType('现场实测数据');
    setDatasetName('');
    setMeasuredDataMeta(null);
    setGridResult(null);
  };

  // Apply parsed project from Excel
  // Rule: Strictly clear previous measured/synthetic data and previous gridResult.
  // Advanced grid parameters MUST NOT be inherited across projects!
  const handleApplyExcelProject = (parsed: ParsedExcelResult) => {
    const nextProjectName = parsed.projectName || '导入工程';
    setProjectName(nextProjectName);

    // Clear previous project's calculation result
    setGridResult(null);

    const baseInputs = parsed.inputs || inputs;
    // Strictly calculate adaptive grid for the imported project; DO NOT inherit manual or previous grid!
    const targetDerived = calculateDerivedParams(baseInputs);
    const adaptiveGrid = calculateAdaptiveGridConfig(baseInputs, targetDerived);
    const targetInputs: ModelInputs = {
      ...baseInputs,
      grid: adaptiveGrid,
    };

    setInputs(targetInputs);
    if (parsed.strata && parsed.strata.length > 0) {
      setStrata(parsed.strata);
    }

    if (parsed.measuredPoints && parsed.measuredPoints.length > 0) {
      setMeasuredPoints(parsed.measuredPoints);
      setDataType('现场实测数据');
      setDatasetName(`Excel导入实测 (${parsed.measuredPoints.length}点)`);
      setMeasuredDataMeta({
        fileName: '项目Excel导入',
        validCount: parsed.measuredPoints.length,
        skippedCount: parsed.summary?.skippedMeasuredPointsCount || 0,
        source: '项目Excel导入',
        uploadedAt: new Date().toLocaleTimeString(),
      });
    } else {
      // Clear previous measured data completely
      setMeasuredPoints([]);
      setDataType('现场实测数据');
      setDatasetName('');
      setMeasuredDataMeta(null);
    }

    // Immediately compute with the new project and adaptive grid
    setIsComputing(true);
    setTimeout(() => {
      try {
        const result = computeFullGrid(targetInputs, targetDerived, adaptiveGrid);
        setGridResult(result);
      } catch (err) {
        console.error('Computation error:', err);
      } finally {
        setIsComputing(false);
      }
    }, 60);
  };

  // Update measured points with metadata
  const handleUpdatePoints = (
    pts: MeasuredPoint[],
    type: '现场实测数据' | '合成测试数据',
    name: string,
    meta?: MeasuredDataMeta
  ) => {
    setMeasuredPoints(pts);
    setDataType(type);
    setDatasetName(name);
    if (meta) {
      setMeasuredDataMeta(meta);
    } else if (pts.length > 0) {
      setMeasuredDataMeta({
        fileName: name,
        validCount: pts.length,
        skippedCount: 0,
        source: type === '合成测试数据' ? '模拟测试数据（非现场实测）' : '用户上传的现场实测数据',
        uploadedAt: new Date().toLocaleTimeString(),
      });
    } else {
      setMeasuredDataMeta(null);
    }
  };

  // Delete measured data
  const handleDeleteMeasuredData = () => {
    setMeasuredPoints([]);
    setDataType('现场实测数据');
    setDatasetName('');
    setMeasuredDataMeta(null);
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
        onSelectPreset={handleSelectPreset}
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
                derived={derived}
                validation={validation}
                isComputing={isComputing}
                gridResult={gridResult}
                onCompute={runComputation}
                onUpdateGrid={handleUpdateGrid}
                onResetAdaptiveGrid={handleResetAdaptiveGrid}
                onSetGridMode={handleSetGridMode}
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
                measuredDataMeta={measuredDataMeta}
                isComputing={isComputing}
                onCompute={runComputation}
                onResetAdaptiveGrid={handleResetAdaptiveGrid}
                onUpdatePoints={handleUpdatePoints}
                onDeleteMeasuredData={handleDeleteMeasuredData}
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

      {/* Advanced Analysis Modal (PKS 3D, Model Self-Check, Parameter Calibration, Dev/Test Synthetic Data) */}
      <AdvancedAnalysisModal
        isOpen={showAdvancedModal}
        onClose={() => setShowAdvancedModal(false)}
        inputs={inputs}
        derived={derived}
        gridResult={gridResult}
        measuredPoints={measuredPoints}
        onApplyCalibration={handleApplyCalibration}
        onLoadSyntheticData={(pts, name) => {
          handleUpdatePoints(pts, '合成测试数据', name, {
            fileName: name,
            validCount: pts.length,
            skippedCount: 0,
            source: '模拟测试数据（非现场实测）',
            uploadedAt: new Date().toLocaleTimeString(),
          });
        }}
        onClearMeasuredData={handleDeleteMeasuredData}
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
        measuredPoints={measuredPoints}
      />
    </div>
  );
}
