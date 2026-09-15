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
function W(x) {
  return eta_s * wPKS * simpsonAx(x, 2048) * Ay0;
}

const targetMAE = 0.021393023;
const targetRMSE = 0.030778030;
const targetMRE = 4.122767476;
const targetMaxAE = 0.090978875;

// Let's check what points give MaxAE = 0.090978875.
// Notice: If MaxAE = 0.090978875, and if the maximum perturbation was at point x:
// What if the perturbation formula is:
// delta[i] = ...
// Let's check if there is a formula like:
// delta = 0.08 * sin(...) or cos(...) or something
// What if the 69 points are x_i for i = 0..68:
// Let's test different start x0 and dx:
for (let dx of [20, 25, 15, 10, 18, 30]) {
  for (let xCenter of [0, 10, -10, 20, -20, 30, 50]) {
    const x0 = xCenter - 34 * dx;
    const xs = Array.from({length: 69}, (_, i) => x0 + i * dx);
    const ws = xs.map(x => W(x));

    // Test simple perturbation patterns
    // 1. delta = A * sin(omega * i + phi)
    // 2. delta = A * cos(...)
    // 3. delta = A * (sin(...) + ...)
    // If targetMaxAE = 0.090978875:
    // Then at some index maxIndex, ws[maxIndex] * delta[maxIndex] = 0.090978875.
    for (let idx = 0; idx < 69; idx++) {
      const w = ws[idx];
      if (w > 0.1) {
        const A = targetMaxAE / w;
        // If A is around 0.08:
        if (Math.abs(A - 0.08) < 0.005) {
          // Check what frequency/phase gives max at this index
          for (let k = 1; k <= 10; k++) {
            const freq = (k * Math.PI) / 68;
            const phase = Math.PI / 2 - freq * idx; // so sin(freq * idx + phase) = 1
            const delta = xs.map((_, i) => A * Math.sin(freq * i + phase));
            const w_noisy = ws.map((w, i) => w * (1 + delta[i]));
            
            // eval
            let sumAE = 0, sumSE = 0, sumRE = 0, Nv = 0;
            let mAE = 0;
            for (let i = 0; i < 69; i++) {
              const ae = Math.abs(ws[i] - w_noisy[i]);
              sumAE += ae;
              sumSE += ae * ae;
              if (ae > mAE) mAE = ae;
              if (Math.abs(w_noisy[i]) > 0.01) {
                sumRE += ae / Math.abs(w_noisy[i]);
                Nv++;
              }
            }
            const mae = sumAE / 69;
            const rmse = Math.sqrt(sumSE / 69);
            const mre = (sumRE / Nv) * 100;
            if (Math.abs(mae - targetMAE) < 0.0001 && Math.abs(rmse - targetRMSE) < 0.0001) {
              console.log(`FOUND! dx=${dx}, xCenter=${xCenter}, idx=${idx}, A=${A}, freq=${freq}, phase=${phase}`);
              console.log({mae, rmse, mre, mAE});
            }
          }
        }
      }
    }
  }
}
console.log("Done loop 1");
