/**
 * Type definitions for Mining Overburden Movement & Surface Subsidence Coupling Platform
 * (采动覆岩运移与地表沉陷耦合预计平台)
 */

export interface ModelInputs {
  caseName: string;
  // 1. 开采几何
  d: number;           // 开采走向长度 (m)
  m: number;           // 开采倾向长度 (m)
  M: number;           // 采高 (m)
  alpha: number;       // 煤层倾角 (deg)
  miningDepth: number; // 开采深度 (m)

  // 2. 主关键层
  H_PKS_d: number;     // 主关键层下界面至煤层顶界面高度 (m)
  H_PKS_u: number;     // 主关键层上方基岩厚度 (m)
  Kp_res: number;      // 主关键层下方岩层残余碎胀系数 K'p (>= 1.0)
  theta: number;       // 岩层破断角 (deg)
  L_PKS: number;       // 主关键层破断块体走向长度 (m)

  // 3. 覆岩与松散层
  H_l: number;         // 松散层厚度 (m)
  delta0: number;      // 岩层边界角 (deg)
  phi: number;         // 松散层移动角 (deg)
  eta_s: number;       // 地表下沉系数

  // 4. 计算网格与积分
  grid: GridConfig;
}

export interface GridConfig {
  xMin: number;
  xMax: number;
  xStep: number;
  yMin: number;
  yMax: number;
  yStep: number;
  simpsonSubintervals: 512 | 1024 | 2048 | 4096;
  subsidenceThreshold?: number;
}

export interface DerivedParams {
  wPKS: number; // 主关键层最大下沉值 (m)
  Lz: number;   // 主关键层有效走向长度 (m)
  Lq: number;   // 主关键层有效倾向长度 (m)
  Df: number;   // 走向积分半边界 (m)
  Mf: number;   // 倾向积分半边界 (m)
  r: number;    // 主要影响半径 (m)
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export type StratumLayerType = '松散层' | '普通岩层' | '主关键层' | '亚关键层' | '煤层';

export interface StratumLayer {
  layerNo: number;
  lithology: string;        // 岩性
  thickness: number;        // 厚度 (m)
  cumulativeDepth: number;  // 累计深度 (m)
  layerType?: StratumLayerType;
  density?: number;         // 密度 (kg/m3)
  elasticModulus?: number;  // 弹性模量 (GPa)
  tensileStrength?: number; // 抗拉强度 (MPa)
  keyStratumType?: 'normal' | 'PKS' | 'SKS'; // 关键层类型
  notes?: string;
}

export interface MeasuredPoint {
  point_id: string;
  section?: 'strike' | 'dip' | string;
  s?: number;
  x: number;
  y: number;
  w_measured: number;
  w_predicted?: number;
  residual?: number;       // w_pred - w_measured
  absError?: number;       // |w_pred - w_measured|
  relError?: number;       // |w_pred - w_measured| / |w_measured|
  isExcludedFromMRE?: boolean;
  dataType?: '现场实测数据' | '合成测试数据';
}

export interface MeasuredDataMeta {
  fileName: string;
  validCount: number;
  skippedCount: number;
  source: '用户上传的现场实测数据' | '模拟测试数据（非现场实测）' | '项目Excel导入';
  uploadedAt: string;
}

export interface ErrorMetrics {
  totalPoints: number;
  validPointsMRE: number;
  excludedCountMRE: number;
  mae: number;             // Mean Absolute Error (m)
  rmse: number;            // Root Mean Squared Error (m)
  mre: number;             // Mean Relative Error (%)
  maxAbsoluteError: number;// Maximum Absolute Error (m)
  maxErrorPointId?: string;
  epsilon: number;         // MRE threshold (default 0.01m)
}

export interface CalculationGridResult {
  xs: number[];
  ys: number[];
  Ax: Float64Array;
  Ay: Float64Array;
  surfaceW: number[][];    // [y_idx][x_idx], downward positive
  pksW: number[][];        // [y_idx][x_idx], downward positive
  maxSurfaceW: number;
  maxSurfaceCoord: [number, number];
  maxWCoord?: { x: number; y: number };
  maxPksW: number;
  maxPksCoord: [number, number];
  computeTimeMs: number;
}

export interface ProfilePoint {
  coord: number;
  surfaceW: number;
  pksW: number;
}

export interface AcceptanceTestItem {
  id: string;
  name: string;
  description: string;
  calculatedValue: number | string;
  targetValue: number | string;
  absoluteError?: number;
  tolerance?: number;
  passed: boolean;
  notes?: string;
}

export interface AcceptanceTestReport {
  passedAll: boolean;
  timestamp: string;
  items: AcceptanceTestItem[];
}

export interface CalibrationParams {
  calibrateLPKS: boolean;
  calibrateR: boolean;
  calibrateEtaS: boolean;
  minLPKS: number;
  maxLPKS: number;
  minR: number;
  maxR: number;
  minEtaS: number;
  maxEtaS: number;
  lossFunction: 'MAE' | 'RMSE';
}

export interface CalibrationResult {
  success: boolean;
  initialLoss: number;
  finalLoss: number;
  initialParams: { L_PKS: number; r: number; eta_s: number };
  calibratedParams: { L_PKS: number; r: number; eta_s: number };
  iterationCount: number;
  calibratedAt: string;
}

// Project naming constants
export const DEFAULT_PROJECT_NAME = '未命名工程';
export const EXAMPLE_PROJECT_NAME = '示例工程：深厚松散层非充分采动';

// Built-in benchmark preset (General standard deep alluvium benchmark)
export const STANDARD_BENCHMARK_PRESET: ModelInputs = {
  caseName: EXAMPLE_PROJECT_NAME,
  d: 630.0,
  m: 205.0,
  M: 3.6,
  alpha: 5.0,
  miningDepth: 528.0,
  H_PKS_d: 36.8,
  H_PKS_u: 21.7,
  H_l: 440.0,
  Kp_res: 1.0,
  theta: 75.0,
  L_PKS: 30.7,
  delta0: 46.2,
  phi: 45.0,
  eta_s: 1.1,
  grid: {
    xMin: -800,
    xMax: 800,
    xStep: 20,
    yMin: -800,
    yMax: 800,
    yStep: 20,
    simpsonSubintervals: 2048,
  },
};

export const PRESET_1312_1: ModelInputs = STANDARD_BENCHMARK_PRESET;

// Default 16 Stratum Table matching standard example
export const DEFAULT_16_STRATA: StratumLayer[] = [
  { layerNo: 1, lithology: '第四系冲洪积粉质粘土', thickness: 60.0, cumulativeDepth: 60.0, layerType: '松散层', keyStratumType: 'normal', notes: '上部松散沉积物' },
  { layerNo: 2, lithology: '新近系上部粘土互层', thickness: 120.0, cumulativeDepth: 180.0, layerType: '松散层', keyStratumType: 'normal', notes: '隔水粘土层' },
  { layerNo: 3, lithology: '新近系中部富水砂砾层', thickness: 140.0, cumulativeDepth: 320.0, layerType: '松散层', keyStratumType: 'normal', notes: '主要含水层' },
  { layerNo: 4, lithology: '新近系下部钙质粘土', thickness: 120.0, cumulativeDepth: 440.0, layerType: '松散层', keyStratumType: 'normal', notes: '松散层底部隔水层，松散层总厚 H_l=440m' },
  { layerNo: 5, lithology: '风化带泥质粉砂岩', thickness: 9.2, cumulativeDepth: 449.2, layerType: '普通岩层', keyStratumType: 'normal', notes: '基岩面风化带' },
  { layerNo: 6, lithology: '中粒石英砂岩', thickness: 12.5, cumulativeDepth: 461.7, layerType: '普通岩层', keyStratumType: 'normal', notes: '主关键层上方基岩，H_PKS-u=21.7m' },
  { layerNo: 7, lithology: '坚硬细粒砂岩 (主关键层)', thickness: 29.5, cumulativeDepth: 491.2, layerType: '主关键层', keyStratumType: 'PKS', notes: '主关键层 PKS，破断步距 L_PKS=30.7m' },
  { layerNo: 8, lithology: '灰黑色砂质泥岩', thickness: 6.8, cumulativeDepth: 498.0, layerType: '普通岩层', keyStratumType: 'normal', notes: '关键层下伏岩层' },
  { layerNo: 9, lithology: '中细粒砂岩 (亚关键层)', thickness: 10.5, cumulativeDepth: 508.5, layerType: '亚关键层', keyStratumType: 'SKS', notes: '亚关键层 SKS' },
  { layerNo: 10, lithology: '互层粉砂岩', thickness: 5.0, cumulativeDepth: 513.5, layerType: '普通岩层', keyStratumType: 'normal', notes: '粉砂互层' },
  { layerNo: 11, lithology: '炭质泥岩夹层', thickness: 4.5, cumulativeDepth: 518.0, layerType: '普通岩层', keyStratumType: 'normal', notes: '泥质岩层' },
  { layerNo: 12, lithology: '细粒砂岩', thickness: 6.0, cumulativeDepth: 524.0, layerType: '普通岩层', keyStratumType: 'normal', notes: '砂岩顶板' },
  { layerNo: 13, lithology: '泥岩直接顶板', thickness: 4.0, cumulativeDepth: 528.0, layerType: '普通岩层', keyStratumType: 'normal', notes: '煤层直接顶，H_PKS-d=36.8m' },
  { layerNo: 14, lithology: '目标开采煤层', thickness: 3.6, cumulativeDepth: 531.6, layerType: '煤层', keyStratumType: 'normal', notes: '采高 M=3.6m' },
  { layerNo: 15, lithology: '炭质泥岩直接底', thickness: 2.4, cumulativeDepth: 534.0, layerType: '普通岩层', keyStratumType: 'normal', notes: '煤层直接底' },
  { layerNo: 16, lithology: '坚硬细砂岩老底', thickness: 15.0, cumulativeDepth: 549.0, layerType: '普通岩层', keyStratumType: 'normal', notes: '老底岩层' },
];

export const DEFAULT_STRATA: StratumLayer[] = DEFAULT_16_STRATA;

