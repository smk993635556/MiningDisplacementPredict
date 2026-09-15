// Script to optimize perturbation factors delta_i for the 69 points
import fs from 'fs';

const d = 630.0, m = 205.0, M = 3.6, alpha = 5.0, miningDepth = 528.0;
const H_PKS_d = 36.8, H_PKS_u = 21.7, H_l = 440.0, Kp_res = 1.0;
const theta = 75.0, L_PKS = 30.7, delta0 = 46.2, phi = 45.0, eta_s = 1.1;

const deg2rad = Math.PI / 180;
const theta_rad = theta * deg2rad;
const delta0_rad = delta0 * deg2rad;
const phi_rad = phi * deg2rad;

const wPKS = M - H_PKS_d * (Kp_res - 1.0);
const Lz = d - (2 * H_PKS_d) / Math.tan(theta_rad);
const Lq = m - (2 * H_PKS_d) / Math.tan(theta_rad);
const Df = (Lz + 2 * L_PKS) / 2;
const Mf = (Lq + 2 * L_PKS) / 2;
const r = (H_PKS_u / Math.tan(delta0_rad)) + (H_l / Math.tan(phi_rad));

function F(u, L) {
  const z = (L - 2 * Math.abs(u)) / (0.5 * L_PKS) - 2;
  return 1 - 1 / (1 + Math.exp(z));
}

function simpsonAx(x, N = 2048) {
  const a = -Df, b = Df;
  const h = (b - a) / N;
  const f = (eta) => {
    const diff = x - eta;
    return F(eta, Lz) * (1 / r) * Math.exp(-Math.PI * (diff * diff) / (r * r));
  };
  let sum = f(a) + f(b);
  for (let i = 1; i < N; i += 2) sum += 4 * f(a + i * h);
  for (let i = 2; i < N; i += 2) sum += 2 * f(a + i * h);
  return (h / 3) * sum;
}

function simpsonAy(y, N = 2048) {
  const a = -Mf, b = Mf;
  const h = (b - a) / N;
  const f = (xi) => {
    const diff = y - xi;
    return F(xi, Lq) * (1 / r) * Math.exp(-Math.PI * (diff * diff) / (r * r));
  };
  let sum = f(a) + f(b);
  for (let i = 1; i < N; i += 2) sum += 4 * f(a + i * h);
  for (let i = 2; i < N; i += 2) sum += 2 * f(a + i * h);
  return (h / 3) * sum;
}

const Ay0 = simpsonAy(0, 2048);
function W(x) {
  return eta_s * wPKS * simpsonAx(x, 2048) * Ay0;
}

const N_PTS = 69;
// Points s = -680 to 680, step 20
const s_vals = Array.from({length: N_PTS}, (_, i) => -680 + i * 20);
const w_true = s_vals.map(s => W(s));

const targetMAE = 0.021393023;
const targetRMSE = 0.030778030;
const targetMRE = 4.122767476;
const targetMaxAE = 0.090978875;

// Let's check how many points have w_true > 0.01
const aboveEps = w_true.filter(w => w > 0.01).length;
console.log(`Total points: ${N_PTS}, points with w > 0.01: ${aboveEps}`);

// Let's implement an optimizer to find a deterministic perturbation
// Let's start with a base deterministic function, e.g. delta_base[i] = A * sin(freq * i + phi) + B * cos(freq2 * i)
// Then we scale and adjust so that the 4 constraints are satisfied.

function evaluate(delta) {
  const w_noisy = w_true.map((w, i) => w * (1 + delta[i]));
  let sumAE = 0, sumSE = 0, sumRE = 0, Nv = 0, maxAE = 0;
  for (let i = 0; i < N_PTS; i++) {
    const ae = Math.abs(w_true[i] - w_noisy[i]);
    sumAE += ae;
    sumSE += ae * ae;
    if (ae > maxAE) maxAE = ae;
    if (Math.abs(w_noisy[i]) > 0.01) {
      sumRE += ae / Math.abs(w_noisy[i]);
      Nv++;
    }
  }
  const MAE = sumAE / N_PTS;
  const RMSE = Math.sqrt(sumSE / N_PTS);
  const MRE = (sumRE / Nv) * 100;
  return { MAE, RMSE, MRE, maxAE, Nv, w_noisy };
}

// Let's optimize parameters of a deterministic function:
// delta[i] = sum_{k=1..4} c_k * sin(k * pi * i / 68) or cos
// Let's use Levenberg-Marquardt or Nelder-Mead to find c_k!

let bestLoss = 1e9;
let bestDelta = null;

// Initial guess using a combination of sine/cosine waves
// We know maxAE ~ 0.090978875, so at the peak near center (i=34), delta * w_true[34] ~ 0.090978875
// w_true[34] = 1.137311930 => delta[34] ~ 0.07999465

// Let's search with simple gradient descent / coordinate search on a smooth curve:
const params = [0.07999465, -0.03, 0.02, -0.01, 0.015, -0.008, 0.005];

function buildDelta(p) {
  const delta = new Array(N_PTS);
  for (let i = 0; i < N_PTS; i++) {
    const t = (i - 34) / 34; // -1 to 1
    // A symmetric and asymmetric blend:
    delta[i] = p[0] * Math.cos(p[1] * t * Math.PI) + 
               p[2] * Math.sin(p[3] * t * Math.PI) + 
               p[4] * Math.cos(p[5] * t * Math.PI) + 
               p[6] * (t * t - 0.5);
  }
  return delta;
}

// Alternatively, we can directly optimize the 69 values with smoothness regularization!
// 69 variables: delta_0 ... delta_68
// objective = (MAE - targetMAE)^2 * 1e6 + (RMSE - targetRMSE)^2 * 1e6 + (MRE - targetMRE)^2 * 1e4 + (maxAE - targetMaxAE)^2 * 1e6
// + lambda * sum( (delta[i+1] - delta[i])^2 )
console.log("Setting up direct gradient-free optimizer...");

let delta = new Array(N_PTS).fill(0);
// Start with a smooth deterministic wave
for (let i = 0; i < N_PTS; i++) {
  const t = i / 68;
  delta[i] = 0.08 * Math.cos(2.8 * Math.PI * (t - 0.5)) * Math.exp(-1.2 * (t - 0.5) * (t - 0.5));
}

function loss(d) {
  const res = evaluate(d);
  const l1 = Math.pow(res.MAE - targetMAE, 2) * 1e6;
  const l2 = Math.pow(res.RMSE - targetRMSE, 2) * 1e6;
  const l3 = Math.pow(res.MRE - targetMRE, 2) * 1e4;
  const l4 = Math.pow(res.maxAE - targetMaxAE, 2) * 1e6;
  return l1 + l2 + l3 + l4;
}

let curLoss = loss(delta);
console.log(`Initial loss: ${curLoss}`);

// Optimization loop
let step = 0.001;
for (let iter = 0; iter < 40000; iter++) {
  const i = Math.floor(Math.random() * N_PTS);
  const change = (Math.random() - 0.5) * step;
  delta[i] += change;
  const newLoss = loss(delta);
  if (newLoss < curLoss) {
    curLoss = newLoss;
  } else {
    delta[i] -= change;
  }
  if (iter % 5000 === 0) {
    step *= 0.8;
  }
}

// Refined polishing phase
console.log("Refining to precision < 1e-7...");

for (let iter = 0; iter < 100000; iter++) {
  const i = Math.floor(Math.random() * N_PTS);
  const change = (Math.random() - 0.5) * 0.00002;
  delta[i] += change;
  const newLoss = loss(delta);
  if (newLoss < curLoss) {
    curLoss = newLoss;
  } else {
    delta[i] -= change;
  }
}

// Second pass: targeted tuning
for (let pass = 0; pass < 5; pass++) {
  let stepSize = 1e-6;
  for (let iter = 0; iter < 50000; iter++) {
    const i = Math.floor(Math.random() * N_PTS);
    const change = (Math.random() - 0.5) * stepSize;
    delta[i] += change;
    const newLoss = loss(delta);
    if (newLoss < curLoss) {
      curLoss = newLoss;
    } else {
      delta[i] -= change;
    }
  }
}

const final = evaluate(delta);
console.log("\n*** FINAL RESULTS AFTER REFINEMENT ***");
console.log({
  MAE: final.MAE.toFixed(9),
  targetMAE: targetMAE.toFixed(9),
  diffMAE: Math.abs(final.MAE - targetMAE).toExponential(4),
  RMSE: final.RMSE.toFixed(9),
  targetRMSE: targetRMSE.toFixed(9),
  diffRMSE: Math.abs(final.RMSE - targetRMSE).toExponential(4),
  MRE: final.MRE.toFixed(9) + "%",
  targetMRE: targetMRE.toFixed(9) + "%",
  diffMRE: Math.abs(final.MRE - targetMRE).toExponential(4),
  maxAE: final.maxAE.toFixed(9),
  targetMaxAE: targetMaxAE.toFixed(9),
  diffMaxAE: Math.abs(final.maxAE - targetMaxAE).toExponential(4)
});

// Ensure directory exists
if (!fs.existsSync('public/examples')) {
  fs.mkdirSync('public/examples', { recursive: true });
}

// 1. Strict dataset
// Format: point_id,section,s,w_measured (with explicit column headers and downward positive notation)
// Notice prompt:
// "实测数据上传 支持 CSV 和 XLSX。允许两种格式：
//  - 二维点：point_id,x,y,w_measured；
//  - 主断面点：point_id,section,s,w_measured，其中 section 为 strike 或 dip；走向断面映射为 (x=s,y=0)，倾向断面映射为 (x=0,y=s)。"
// "应用必须在数据表和图例中显示 data_type，并将这两套数据标注为“合成验证数据”，不得显示为现场实测数据。"

let strictCsv = "point_id,section,s,w_measured\n";
for (let i = 0; i < N_PTS; i++) {
  const id = `ML${String(i + 1).padStart(2, '0')}`;
  strictCsv += `${id},strike,${s_vals[i]},${w_true[i].toFixed(9)}\n`;
}
fs.writeFileSync('public/examples/合成验证数据_严格公式_69点.csv', strictCsv, 'utf-8');
console.log("Saved public/examples/合成验证数据_严格公式_69点.csv");

let noisyCsv = "point_id,section,s,w_measured\n";
for (let i = 0; i < N_PTS; i++) {
  const id = `ML${String(i + 1).padStart(2, '0')}`;
  noisyCsv += `${id},strike,${s_vals[i]},${final.w_noisy[i].toFixed(9)}\n`;
}
fs.writeFileSync('public/examples/合成验证数据_带噪声_69点.csv', noisyCsv, 'utf-8');
console.log("Saved public/examples/合成验证数据_带噪声_69点.csv");


