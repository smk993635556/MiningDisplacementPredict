import {
  ModelInputs,
  DerivedParams,
  ValidationResult,
  GridConfig,
  CalculationGridResult,
  MeasuredPoint,
  ErrorMetrics,
  AcceptanceTestReport,
  AcceptanceTestItem,
  PRESET_1312_1,
} from '../types.ts';

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function validateInputs(p: ModelInputs): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (p.d <= 0) errors.push('开采走向长度 d 必须大于 0');
  if (p.m <= 0) errors.push('开采倾向长度 m 必须大于 0');
  if (p.M <= 0) errors.push('采高 M 必须大于 0');
  if (p.H_PKS_d <= 0) errors.push('主关键层下界面高度 H_PKS-d 必须大于 0');
  if (p.H_PKS_u <= 0) errors.push('主关键层上方基岩厚度 H_PKS-u 必须大于 0');
  if (p.H_l <= 0) errors.push('松散层厚度 H_l 必须大于 0');
  if (p.L_PKS <= 0) errors.push('主关键层破断块体走向长度 L_PKS 必须大于 0');
  if (p.eta_s <= 0) errors.push('地表下沉系数 eta_s 必须大于 0');

  if (p.Kp_res < 1.0) errors.push("残余碎胀系数 Kp_res 必须 >= 1.0 (岩石破碎后体积膨胀系数不得小于1)");

  if (p.theta <= 0 || p.theta >= 90) errors.push('岩层破断角 theta 必须在 (0°, 90°) 区间内');
  if (p.delta0 <= 0 || p.delta0 >= 90) errors.push('岩层边界角 delta0 必须在 (0°, 90°) 区间内');
  if (p.phi <= 0 || p.phi >= 90) errors.push('松散层移动角 phi 必须在 (0°, 90°) 区间内');

  if (errors.length === 0) {
    const derived = calculateDerivedParams(p);
    if (derived.wPKS <= 0) {
      errors.push(`主关键层最大下沉值 wPKS = ${derived.wPKS.toFixed(4)}m <= 0。请检查采高 M 与残余碎胀系数 Kp_res`);
    }
    if (derived.Lz <= 0) {
      errors.push(`主关键层破断走向长度 Lz = ${derived.Lz.toFixed(4)}m <= 0。采宽不足以让主关键层破断或破断角过缓`);
    }
    if (derived.Lq <= 0) {
      errors.push(`主关键层破断倾向长度 Lq = ${derived.Lq.toFixed(4)}m <= 0。采宽不足以让主关键层破断`);
    }
    if (derived.Df <= 0) errors.push(`走向积分边界 Df = ${derived.Df.toFixed(4)}m <= 0`);
    if (derived.Mf <= 0) errors.push(`倾向积分边界 Mf = ${derived.Mf.toFixed(4)}m <= 0`);
    if (derived.r <= 0) errors.push(`主要影响半径 r = ${derived.r.toFixed(4)}m <= 0`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function calculateDerivedParams(p: ModelInputs): DerivedParams {
  const thetaRad = degToRad(p.theta);
  const delta0Rad = degToRad(p.delta0);
  const phiRad = degToRad(p.phi);

  // 1. 主关键层最大下沉值: wPKS = M - H_PKS-d * (Kp_res - 1)
  const wPKS = p.M - p.H_PKS_d * (p.Kp_res - 1.0);

  // 2. 主关键层有效走向、倾向长度:
  // Lz = d - 2 * H_PKS-d / tan(theta)
  // Lq = m - 2 * H_PKS-d / tan(theta)
  const tanTheta = Math.tan(thetaRad);
  const offset = (2 * p.H_PKS_d) / tanTheta;
  const Lz = p.d - offset;
  const Lq = p.m - offset;

  // 3. 主要影响半径与积分边界:
  // r = H_PKS-u / tan(delta0) + H_l / tan(phi)
  // Df = (Lz + 2 * L_PKS) / 2
  // Mf = (Lq + 2 * L_PKS) / 2
  const r = p.H_PKS_u / Math.tan(delta0Rad) + p.H_l / Math.tan(phiRad);
  const Df = (Lz + 2 * p.L_PKS) / 2;
  const Mf = (Lq + 2 * p.L_PKS) / 2;

  return { wPKS, Lz, Lq, Df, Mf, r };
}

/**
 * 1D boundary function:
 * F(u, L) = 1 - [1 + exp((L - |2u|) / (0.5 * L_PKS) - 2)]^(-1)
 */
export function boundaryFunctionF(u: number, L: number, LPKS: number): number {
  const z = (L - 2 * Math.abs(u)) / (0.5 * LPKS) - 2;
  // Stable sigmoid evaluation
  if (z > 40) return 1.0;
  if (z < -40) return 0.0;
  return 1 - 1 / (1 + Math.exp(z));
}

/**
 * 2D broken subsidence field of Primary Key Stratum:
 * WPKS(eta, xi) = wPKS * F(eta, Lz) * F(xi, Lq)
 */
export function calculateWPKS(
  eta: number,
  xi: number,
  p: ModelInputs,
  d: DerivedParams
): number {
  return d.wPKS * boundaryFunctionF(eta, d.Lz, p.L_PKS) * boundaryFunctionF(xi, d.Lq, p.L_PKS);
}

/**
 * Composite Simpson's 1/3 Rule on [a, b] with N even subintervals
 */
export function simpson1D(
  f: (val: number) => number,
  a: number,
  b: number,
  N: number
): number {
  const nSub = N % 2 === 0 ? N : N + 1;
  const h = (b - a) / nSub;
  let sum = f(a) + f(b);

  for (let i = 1; i < nSub; i += 2) {
    sum += 4 * f(a + i * h);
  }
  for (let i = 2; i < nSub; i += 2) {
    sum += 2 * f(a + i * h);
  }

  return (h / 3) * sum;
}

/**
 * Separable strike integral:
 * Ax(x) = int_{-Df}^{Df} F(eta, Lz) * (1 / r) * exp(-pi * (x - eta)^2 / r^2) d eta
 */
export function calculateAx(
  x: number,
  p: ModelInputs,
  d: DerivedParams,
  N: number = 2048
): number {
  const { Df, Lz, r } = d;
  const invR = 1 / r;
  const rSq = r * r;

  return simpson1D(
    (eta) => {
      const diff = x - eta;
      const kernel = invR * Math.exp((-Math.PI * (diff * diff)) / rSq);
      return boundaryFunctionF(eta, Lz, p.L_PKS) * kernel;
    },
    -Df,
    Df,
    N
  );
}

/**
 * Separable dip integral:
 * Ay(y) = int_{-Mf}^{Mf} F(xi, Lq) * (1 / r) * exp(-pi * (y - xi)^2 / r^2) d xi
 */
export function calculateAy(
  y: number,
  p: ModelInputs,
  d: DerivedParams,
  N: number = 2048
): number {
  const { Mf, Lq, r } = d;
  const invR = 1 / r;
  const rSq = r * r;

  return simpson1D(
    (xi) => {
      const diff = y - xi;
      const kernel = invR * Math.exp((-Math.PI * (diff * diff)) / rSq);
      return boundaryFunctionF(xi, Lq, p.L_PKS) * kernel;
    },
    -Mf,
    Mf,
    N
  );
}

/**
 * Precompute Ax array for a list of x coordinates
 */
export function calculateAxCache(
  xs: number[],
  p: ModelInputs,
  d: DerivedParams,
  N: number = 2048
): Float64Array {
  const len = xs.length;
  const res = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    res[i] = calculateAx(xs[i], p, d, N);
  }
  return res;
}

/**
 * Precompute Ay array for a list of y coordinates
 */
export function calculateAyCache(
  ys: number[],
  p: ModelInputs,
  d: DerivedParams,
  N: number = 2048
): Float64Array {
  const len = ys.length;
  const res = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    res[i] = calculateAy(ys[i], p, d, N);
  }
  return res;
}

/**
 * Single-point surface subsidence:
 * W(x, y) = eta_s * wPKS * Ax(x) * Ay(y)
 */
export function calculateSurfaceSubsidence(
  x: number,
  y: number,
  p: ModelInputs,
  d: DerivedParams,
  N: number = 2048
): number {
  const ax = calculateAx(x, p, d, N);
  const ay = calculateAy(y, p, d, N);
  return p.eta_s * d.wPKS * ax * ay;
}

/**
 * Computes the full 2D surface grid and PKS grid
 */
export function computeFullGrid(
  p: ModelInputs,
  d: DerivedParams,
  grid: GridConfig
): CalculationGridResult {
  const startTime = performance.now();

  const xs: number[] = [];
  for (let x = grid.xMin; x <= grid.xMax + 1e-6; x += grid.xStep) {
    xs.push(Math.round(x * 1e6) / 1e6);
  }

  const ys: number[] = [];
  for (let y = grid.yMin; y <= grid.yMax + 1e-6; y += grid.yStep) {
    ys.push(Math.round(y * 1e6) / 1e6);
  }

  const N = grid.simpsonSubintervals;
  const Ax = calculateAxCache(xs, p, d, N);
  const Ay = calculateAyCache(ys, p, d, N);

  const nx = xs.length;
  const ny = ys.length;

  const surfaceW: number[][] = new Array(ny);
  const pksW: number[][] = new Array(ny);

  let maxSurfaceW = -Infinity;
  let maxSurfaceCoord: [number, number] = [0, 0];
  let maxPksW = -Infinity;
  let maxPksCoord: [number, number] = [0, 0];

  const scale = p.eta_s * d.wPKS;

  for (let j = 0; j < ny; j++) {
    const rowSurface = new Array(nx);
    const rowPks = new Array(nx);
    const yVal = ys[j];
    const ayVal = Ay[j];

    for (let i = 0; i < nx; i++) {
      const xVal = xs[i];
      const wSurf = scale * Ax[i] * ayVal;
      const wPk = calculateWPKS(xVal, yVal, p, d);

      rowSurface[i] = wSurf;
      rowPks[i] = wPk;

      if (wSurf > maxSurfaceW) {
        maxSurfaceW = wSurf;
        maxSurfaceCoord = [xVal, yVal];
      }
      if (wPk > maxPksW) {
        maxPksW = wPk;
        maxPksCoord = [xVal, yVal];
      }
    }
    surfaceW[j] = rowSurface;
    pksW[j] = rowPks;
  }

  const computeTimeMs = Math.round((performance.now() - startTime) * 10) / 10;

  return {
    xs,
    ys,
    Ax,
    Ay,
    surfaceW,
    pksW,
    maxSurfaceW,
    maxSurfaceCoord,
    maxWCoord: { x: maxSurfaceCoord[0], y: maxSurfaceCoord[1] },
    maxPksW,
    maxPksCoord,
    computeTimeMs,
  };
}

/**
 * Computes center profiles: strike (y = 0) and dip (x = 0)
 */
export function computeCenterProfiles(
  p: ModelInputs,
  d: DerivedParams,
  grid: GridConfig
) {
  const xs: number[] = [];
  for (let x = grid.xMin; x <= grid.xMax + 1e-6; x += grid.xStep) {
    xs.push(Math.round(x * 1e6) / 1e6);
  }

  const ys: number[] = [];
  for (let y = grid.yMin; y <= grid.yMax + 1e-6; y += grid.yStep) {
    ys.push(Math.round(y * 1e6) / 1e6);
  }

  const N = grid.simpsonSubintervals;
  const Ax = calculateAxCache(xs, p, d, N);
  const Ay = calculateAyCache(ys, p, d, N);

  const Ay0 = calculateAy(0, p, d, N);
  const Ax0 = calculateAx(0, p, d, N);

  const scale = p.eta_s * d.wPKS;

  const strikeProfile = xs.map((x, i) => ({
    coord: x,
    surfaceW: scale * Ax[i] * Ay0,
    pksW: calculateWPKS(x, 0, p, d),
  }));

  const dipProfile = ys.map((y, i) => ({
    coord: y,
    surfaceW: scale * Ax0 * Ay[i],
    pksW: calculateWPKS(0, y, p, d),
  }));

  const strike = {
    xs,
    ws: strikeProfile.map((pt) => pt.surfaceW),
  };

  const dip = {
    ys,
    ws: dipProfile.map((pt) => pt.surfaceW),
  };

  return { strikeProfile, dipProfile, strike, dip };
}

/**
 * Calculates error statistics between predicted and measured values
 */
export function evaluateErrors(
  points: MeasuredPoint[],
  p: ModelInputs,
  d: DerivedParams,
  epsilon: number = 0.01,
  N: number = 2048
): { points: MeasuredPoint[]; metrics: ErrorMetrics } {
  const Ay0 = calculateAy(0, p, d, N);
  const Ax0 = calculateAx(0, p, d, N);
  const scale = p.eta_s * d.wPKS;

  let sumAE = 0;
  let sumSE = 0;
  let sumRE = 0;
  let validPointsMRE = 0;
  let excludedCountMRE = 0;
  let maxAbsoluteError = 0;
  let maxErrorPointId = '';

  const evaluatedPoints: MeasuredPoint[] = points.map((pt) => {
    let pred: number;
    if (pt.y === 0) {
      pred = scale * calculateAx(pt.x, p, d, N) * Ay0;
    } else if (pt.x === 0) {
      pred = scale * Ax0 * calculateAy(pt.y, p, d, N);
    } else {
      pred = calculateSurfaceSubsidence(pt.x, pt.y, p, d, N);
    }

    const residual = pred - pt.w_measured;
    const absError = Math.abs(residual);

    sumAE += absError;
    sumSE += absError * absError;

    if (absError > maxAbsoluteError) {
      maxAbsoluteError = absError;
      maxErrorPointId = pt.point_id;
    }

    const isExcluded = Math.abs(pt.w_measured) <= epsilon;
    let relError = 0;
    if (!isExcluded) {
      relError = absError / Math.abs(pt.w_measured);
      sumRE += relError;
      validPointsMRE++;
    } else {
      excludedCountMRE++;
    }

    return {
      ...pt,
      w_predicted: pred,
      residual,
      absError,
      relError,
      isExcludedFromMRE: isExcluded,
    };
  });

  const totalPoints = points.length;
  const mae = totalPoints > 0 ? sumAE / totalPoints : 0;
  const rmse = totalPoints > 0 ? Math.sqrt(sumSE / totalPoints) : 0;
  const mre = validPointsMRE > 0 ? (sumRE / validPointsMRE) * 100 : 0;

  return {
    points: evaluatedPoints,
    metrics: {
      totalPoints,
      validPointsMRE,
      excludedCountMRE,
      mae,
      rmse,
      mre,
      maxAbsoluteError,
      maxErrorPointId,
      epsilon,
    },
  };
}

/**
 * Runs the mandatory model self-check suite against all requirements from the prompt
 */
export function runModelSelfCheck(): AcceptanceTestReport {
  const p = PRESET_1312_1;
  const d = calculateDerivedParams(p);
  const items: AcceptanceTestItem[] = [];

  // Group 1: 6 Derived Parameters
  const derivedTargets = [
    { name: 'wPKS (主关键层最大下沉)', key: 'wPKS', calc: d.wPKS, target: 3.6, tol: 1e-5 },
    { name: 'Lz (主关键层破断走向长度)', key: 'Lz', calc: d.Lz, target: 610.278939, tol: 1e-5 },
    { name: 'Lq (主关键层破断倾向长度)', key: 'Lq', calc: d.Lq, target: 185.278939, tol: 1e-5 },
    { name: 'Df (走向积分半边界)', key: 'Df', calc: d.Df, target: 335.83947, tol: 1e-5 },
    { name: 'Mf (倾向积分半边界)', key: 'Mf', calc: d.Mf, target: 123.33947, tol: 1e-5 },
    { name: 'r (主要影响半径)', key: 'r', calc: d.r, target: 460.809552, tol: 1e-5 },
  ];

  for (const item of derivedTargets) {
    const err = Math.abs(item.calc - item.target);
    items.push({
      id: `derived_${item.key}`,
      name: item.name,
      description: `验证派生参数 ${item.key} 精度要求 ≤ 1e-5 m`,
      calculatedValue: item.calc.toFixed(6),
      targetValue: item.target.toFixed(6),
      absoluteError: err,
      tolerance: item.tol,
      passed: err <= item.tol,
    });
  }

  // Group 2: PKS Subsidence Field
  const pksChecks = [
    { eta: 0, xi: 0, target: 3.59984766 },
    { eta: 305.139469719, xi: 0, target: 0.42911236 },
    { eta: 335.839469719, xi: 0, target: 0.008901067 },
    { eta: 0, xi: 92.639469719, target: 0.429130519 },
    { eta: 0, xi: 123.339469719, target: 0.008901443 },
  ];

  for (let i = 0; i < pksChecks.length; i++) {
    const { eta, xi, target } = pksChecks[i];
    const calc = calculateWPKS(eta, xi, p, d);
    const err = Math.abs(calc - target);
    items.push({
      id: `pks_${i}`,
      name: `WPKS(${eta.toFixed(3)}, ${xi.toFixed(3)})`,
      description: '主关键层二维破断下沉场特征点验收',
      calculatedValue: calc.toFixed(9),
      targetValue: target.toFixed(9),
      absoluteError: err,
      tolerance: 1e-4,
      passed: err <= 1e-4,
    });
  }

  // Group 3: Surface Subsidence with Simpson 2048
  const wChecks = [
    { x: 0, y: 0, target: 1.13731193 },
    { x: 100, y: 0, target: 1.069250043 },
    { x: 300, y: 0, target: 0.613926484 },
    { x: 335.839469719, y: 0, target: 0.515897797 },
    { x: 500, y: 0, target: 0.163473048 },
    { x: 800, y: 0, target: 0.003632339 },
    { x: 0, y: 100, target: 0.990002496 },
    { x: 0, y: 123.339469719, target: 0.920935017 },
    { x: 0, y: 300, target: 0.326039625 },
    { x: 335.839469719, y: 123.339469719, target: 0.417746736 },
  ];

  for (let i = 0; i < wChecks.length; i++) {
    const { x, y, target } = wChecks[i];
    const calc = calculateSurfaceSubsidence(x, y, p, d, 2048);
    const err = Math.abs(calc - target);
    items.push({
      id: `surface_${i}`,
      name: `W(${x.toFixed(3)}, ${y.toFixed(3)})`,
      description: '地表沉陷耦合数值积分检验 (Simpson 2048)',
      calculatedValue: calc.toFixed(9),
      targetValue: target.toFixed(9),
      absoluteError: err,
      tolerance: 1e-4,
      passed: err <= 1e-4,
    });
  }

  // Group 4: Symmetry Assertions
  const wPos100_50 = calculateSurfaceSubsidence(100, 50, p, d, 2048);
  const wNeg100_50 = calculateSurfaceSubsidence(-100, 50, p, d, 2048);
  const w100_Neg50 = calculateSurfaceSubsidence(100, -50, p, d, 2048);

  const symXErr = Math.abs(wPos100_50 - wNeg100_50);
  const symYErr = Math.abs(wPos100_50 - w100_Neg50);

  items.push({
    id: 'symmetry_x',
    name: '走向对称性 |W(x, y) - W(-x, y)|',
    description: '走向对称性断言 < 1e-8',
    calculatedValue: symXErr.toExponential(4),
    targetValue: '< 1e-8',
    absoluteError: symXErr,
    tolerance: 1e-8,
    passed: symXErr < 1e-8,
  });

  items.push({
    id: 'symmetry_y',
    name: '倾向对称性 |W(x, y) - W(x, -y)|',
    description: '倾向对称性断言 < 1e-8',
    calculatedValue: symYErr.toExponential(4),
    targetValue: '< 1e-8',
    absoluteError: symYErr,
    tolerance: 1e-8,
    passed: symYErr < 1e-8,
  });

  // Group 5: Convergence Check (4096 vs 2048 difference < 1e-6)
  const w2048_00 = calculateSurfaceSubsidence(0, 0, p, d, 2048);
  const w4096_00 = calculateSurfaceSubsidence(0, 0, p, d, 4096);
  const convErr = Math.abs(w4096_00 - w2048_00);

  items.push({
    id: 'convergence_subintervals',
    name: '积分收敛性 |W_4096(0,0) - W_2048(0,0)|',
    description: '4096与2048子区间差值断言 < 1e-6 m',
    calculatedValue: convErr.toExponential(4),
    targetValue: '< 1e-6',
    absoluteError: convErr,
    tolerance: 1e-6,
    passed: convErr < 1e-6,
  });

  const passedAll = items.every((i) => i.passed);

  return {
    passedAll,
    timestamp: new Date().toISOString(),
    items,
  };
}
