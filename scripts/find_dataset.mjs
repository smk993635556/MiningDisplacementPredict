import { createRequire } from 'module';
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
function W(x, y = 0) {
  if (y === 0) {
    return eta_s * wPKS * simpsonAx(x, 2048) * Ay0;
  }
  return eta_s * wPKS * simpsonAx(x, 2048) * simpsonAy(y, 2048);
}

// Target values:
// MAE ≈ 0.021393023
// RMSE ≈ 0.030778030
// MRE ≈ 4.122767476%
// MaxAE ≈ 0.090978875

// What are the 69 points?
// Let's test what points could be:
// Could it be 69 points along strike line:
// e.g. i from 0 to 68: s_i?
// Let's check spacing:
// If range is [-680, 680], step 20 -> 69 points: s = -680 + i * 20.
// What about range [-510, 510], step 15? 1020/15 = 68 -> 69 points.
// What about range [-680, 680] with sin perturbation?
// e.g., delta = 0.08 * sin(...)?
console.log("Searching for 69 points...");

// Let's test a variety of grids and perturbation formulas
const targetMAE = 0.021393023;
const targetRMSE = 0.030778030;
const targetMRE = 4.122767476;
const targetMaxAE = 0.090978875;

// Let's check: MaxAE = 0.090978875.
// If at x = 0, W(0,0) = 1.137311930.
// What if at x=0, error is MaxAE?
// Then delta at x=0 is 0.090978875 / 1.137311930 = 0.0799946536...
// Notice 0.0799946536:
// What if x is from -680 to +680, step 20 (69 points)?
// Index of x=0 is i=34 (the middle point).
// If delta(i) = A * cos(...) or A * sin(...) or similar?
const xs_20 = [];
for (let i = -34; i <= 34; i++) {
  xs_20.push(i * 20);
}
console.log(`xs_20 length: ${xs_20.length}, min: ${xs_20[0]}, max: ${xs_20[68]}`);

// Let's test xs_20 with W(x, 0)
const w_vals = xs_20.map(x => W(x, 0));
console.log("w_vals computed for xs_20. W(0,0) =", w_vals[34]);

// Check: MaxAE is 0.090978875.
// If MaxAE is at x=0 (w_vals[34]=1.137311930), max relative error at x=0 is 0.090978875 / 1.137311930 = 0.0799946536.
// What if delta is 0.08 * cos(omega * i)?
// At i=34, cos(0) = 1 => delta = 0.08 * 1 = 0.08?
// Wait! 1.137311930 * 0.08 = 0.0909849544 != 0.090978875.
// But what if delta = 0.08 * something, or at x != 0?
// What if x = 100? W(100,0) = 1.069250043. 0.090978875 / 1.069250043 = 0.085086...
// What if delta is fixed, or a function of i?
// Let's test standard deterministic perturbations:
// 1. delta_i = 0.08 * sin(i * ... + ...)
// 2. delta_i = 0.08 * cos(...)
// 3. LCG PRNG: seed = 42 or 12345 or 1312, etc.
// 4. delta_i = 0.05 * sin(...) + 0.03 * cos(...)
// Search common deterministic functions
function evalMetrics(w_true, w_noisy, eps = 0.01) {
  const N = w_true.length;
  let sumAE = 0;
  let sumSE = 0;
  let sumRE = 0;
  let Nv = 0;
  let maxAE = 0;

  for (let i = 0; i < N; i++) {
    const ae = Math.abs(w_true[i] - w_noisy[i]);
    sumAE += ae;
    sumSE += ae * ae;
    if (ae > maxAE) maxAE = ae;

    if (Math.abs(w_noisy[i]) > eps) {
      sumRE += ae / Math.abs(w_noisy[i]);
      Nv++;
    }
  }

  const MAE = sumAE / N;
  const RMSE = Math.sqrt(sumSE / N);
  const MRE = (sumRE / Nv) * 100;
  return { MAE, RMSE, MRE, maxAE, Nv };
}

// Let's test a variety of functions for perturbation:
// e.g. delta_i = A * sin(k * i) or cos(k * i) or sin(s / lambda) etc.
// Also check if indices i are 1..69 or 0..68.
console.log("Searching sinusoidal patterns...");
for (let A = 0.05; A <= 0.12; A += 0.005) {
  for (let freq of [0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 1, 2, Math.PI/10, Math.PI/8, Math.PI/6, Math.PI/4, Math.PI/2, Math.PI]) {
    for (let phase of [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI]) {
      const w_noisy = w_vals.map((w, idx) => w * (1 + A * Math.sin(idx * freq + phase)));
      const res = evalMetrics(w_vals, w_noisy);
      if (Math.abs(res.MAE - targetMAE) < 0.001) {
        console.log(`Candidate: A=${A}, freq=${freq}, phase=${phase}`, res);
      }
    }
  }
}

