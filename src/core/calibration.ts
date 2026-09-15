import {
  ModelInputs,
  DerivedParams,
  MeasuredPoint,
  CalibrationParams,
  CalibrationResult,
} from '../types.ts';
import {
  calculateDerivedParams,
  calculateSurfaceSubsidence,
  calculateAx,
  calculateAy,
} from './model.ts';

/**
 * Parameter calibration / inversion module
 *
 * NOTE & DISCLAIMER:
 * This is an engineering calibration/inversion module designed to fit field measurements.
 * It is STRICTLY SEPARATED from the pure paper theoretical model.
 * All results produced by this tool must be clearly labeled as calibrated parameters,
 * showing objective function, parameter bounds, and before/after comparisons.
 */

export function runParameterCalibration(
  baseParams: ModelInputs,
  points: MeasuredPoint[],
  config: CalibrationParams,
  onProgress?: (iter: number, loss: number) => void
): CalibrationResult {
  if (points.length === 0) {
    throw new Error('缺少实测数据点，无法执行参数反演');
  }

  const initialParams = {
    L_PKS: baseParams.L_PKS,
    r: calculateDerivedParams(baseParams).r,
    eta_s: baseParams.eta_s,
  };

  // Build variable vector
  const variableNames: ('L_PKS' | 'r' | 'eta_s')[] = [];
  const initialVector: number[] = [];
  const lowerBounds: number[] = [];
  const upperBounds: number[] = [];

  if (config.calibrateLPKS) {
    variableNames.push('L_PKS');
    initialVector.push(baseParams.L_PKS);
    lowerBounds.push(config.minLPKS);
    upperBounds.push(config.maxLPKS);
  }

  if (config.calibrateEtaS) {
    variableNames.push('eta_s');
    initialVector.push(baseParams.eta_s);
    lowerBounds.push(config.minEtaS);
    upperBounds.push(config.maxEtaS);
  }

  if (config.calibrateR) {
    variableNames.push('r');
    initialVector.push(initialParams.r);
    lowerBounds.push(config.minR);
    upperBounds.push(config.maxR);
  }

  if (variableNames.length === 0) {
    throw new Error('请至少勾选一个反演参数');
  }

  // Objective function
  function evalLoss(vec: number[]): number {
    // Construct active params
    let curLPKS = baseParams.L_PKS;
    let curEtaS = baseParams.eta_s;
    let overrideR: number | null = null;

    for (let i = 0; i < variableNames.length; i++) {
      const v = vec[i];
      // Penalty for boundary violation
      if (v < lowerBounds[i]) return 1e6 + (lowerBounds[i] - v) * 1e4;
      if (v > upperBounds[i]) return 1e6 + (v - upperBounds[i]) * 1e4;

      if (variableNames[i] === 'L_PKS') curLPKS = v;
      if (variableNames[i] === 'eta_s') curEtaS = v;
      if (variableNames[i] === 'r') overrideR = v;
    }

    const testInputs: ModelInputs = {
      ...baseParams,
      L_PKS: curLPKS,
      eta_s: curEtaS,
    };

    let derived = calculateDerivedParams(testInputs);
    if (overrideR !== null) {
      derived = { ...derived, r: overrideR };
    }

    if (derived.wPKS <= 0 || derived.Lz <= 0 || derived.Lq <= 0 || derived.r <= 0) {
      return 1e6;
    }

    const N = 512; // Use N=512 for fast evaluation during optimization loops
    const Ay0 = calculateAy(0, testInputs, derived, N);
    const Ax0 = calculateAx(0, testInputs, derived, N);
    const scale = testInputs.eta_s * derived.wPKS;

    let sum = 0;
    const count = points.length;

    for (let i = 0; i < count; i++) {
      const pt = points[i];
      let pred: number;
      if (pt.y === 0) {
        pred = scale * calculateAx(pt.x, testInputs, derived, N) * Ay0;
      } else if (pt.x === 0) {
        pred = scale * Ax0 * calculateAy(pt.y, testInputs, derived, N);
      } else {
        pred = calculateSurfaceSubsidence(pt.x, pt.y, testInputs, derived, N);
      }
      const diff = Math.abs(pred - pt.w_measured);
      if (config.lossFunction === 'RMSE') {
        sum += diff * diff;
      } else {
        sum += diff;
      }
    }

    return config.lossFunction === 'RMSE' ? Math.sqrt(sum / count) : sum / count;
  }

  const initialLoss = evalLoss(initialVector);

  // Nelder-Mead Simplex Optimization
  const dim = initialVector.length;
  let simplex: { point: number[]; value: number }[] = [];

  // Build initial simplex
  simplex.push({ point: [...initialVector], value: initialLoss });
  for (let i = 0; i < dim; i++) {
    const pt = [...initialVector];
    const span = upperBounds[i] - lowerBounds[i];
    const delta = span * 0.05;
    pt[i] = Math.min(upperBounds[i], Math.max(lowerBounds[i], pt[i] + delta));
    simplex.push({ point: pt, value: evalLoss(pt) });
  }

  const alpha = 1.0;
  const gamma = 2.0;
  const rho = 0.5;
  const sigma = 0.5;
  const maxIter = 100;
  let iterations = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    iterations = iter + 1;
    simplex.sort((a, b) => a.value - b.value);

    if (onProgress && iter % 10 === 0) {
      onProgress(iter, simplex[0].value);
    }

    const best = simplex[0];
    const worst = simplex[dim];
    const secondWorst = simplex[dim - 1];

    // Check convergence
    if (Math.abs(worst.value - best.value) < 1e-5) break;

    // Centroid of the best points
    const centroid = new Array(dim).fill(0);
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        centroid[j] += simplex[i].point[j] / dim;
      }
    }

    // Reflection
    const xr = centroid.map((c, j) => c + alpha * (c - worst.point[j]));
    const fr = evalLoss(xr);

    if (fr < secondWorst.value && fr >= best.value) {
      simplex[dim] = { point: xr, value: fr };
      continue;
    }

    // Expansion
    if (fr < best.value) {
      const xe = centroid.map((c, j) => c + gamma * (xr[j] - c));
      const fe = evalLoss(xe);
      if (fe < fr) {
        simplex[dim] = { point: xe, value: fe };
      } else {
        simplex[dim] = { point: xr, value: fr };
      }
      continue;
    }

    // Contraction
    const xc = centroid.map((c, j) => c + rho * (worst.point[j] - c));
    const fc = evalLoss(xc);
    if (fc < worst.value) {
      simplex[dim] = { point: xc, value: fc };
      continue;
    }

    // Shrink
    for (let i = 1; i <= dim; i++) {
      simplex[i].point = simplex[i].point.map((p, j) => best.point[j] + sigma * (p - best.point[j]));
      simplex[i].value = evalLoss(simplex[i].point);
    }
  }

  simplex.sort((a, b) => a.value - b.value);
  const bestPoint = simplex[0].point;
  const finalLoss = simplex[0].value;

  const calibratedParams = { ...initialParams };
  for (let i = 0; i < variableNames.length; i++) {
    const name = variableNames[i];
    calibratedParams[name] = Math.round(bestPoint[i] * 1e4) / 1e4;
  }

  return {
    success: true,
    initialLoss,
    finalLoss,
    initialParams,
    calibratedParams,
    iterationCount: iterations,
    calibratedAt: new Date().toLocaleString(),
  };
}
