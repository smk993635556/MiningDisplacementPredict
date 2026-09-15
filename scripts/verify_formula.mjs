// Verification script for the model formulas
const d = 630.0;
const m = 205.0;
const M = 3.6;
const alpha = 5.0;
const miningDepth = 528.0;
const H_PKS_d = 36.8;
const H_PKS_u = 21.7;
const H_l = 440.0;
const Kp_res = 1.0;
const theta = 75.0;
const L_PKS = 30.7;
const delta0 = 46.2;
const phi = 45.0;
const eta_s = 1.1;

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

console.log("Derived parameters:");
console.log(`wPKS = ${wPKS.toFixed(6)} (target: 3.600000)`);
console.log(`Lz   = ${Lz.toFixed(6)} (target: 610.278939)`);
console.log(`Lq   = ${Lq.toFixed(6)} (target: 185.278939)`);
console.log(`Df   = ${Df.toFixed(6)} (target: 335.839470)`);
console.log(`Mf   = ${Mf.toFixed(6)} (target: 123.339470)`);
console.log(`r    = ${r.toFixed(6)} (target: 460.809552)`);

function F(u, L) {
  const z = (L - 2 * Math.abs(u)) / (0.5 * L_PKS) - 2;
  return 1 - 1 / (1 + Math.exp(z));
}

function WPKS(eta, xi) {
  return wPKS * F(eta, Lz) * F(xi, Lq);
}

console.log("\nWPKS checks:");
const wpksChecks = [
  [0, 0, 3.599847660],
  [305.139469719, 0, 0.429112360],
  [335.839469719, 0, 0.008901067],
  [0, 92.639469719, 0.429130519],
  [0, 123.339469719, 0.008901443]
];
for (const [eta, xi, target] of wpksChecks) {
  const val = WPKS(eta, xi);
  const diff = Math.abs(val - target);
  console.log(`WPKS(${eta}, ${xi}) = ${val.toFixed(9)}, target = ${target.toFixed(9)}, err = ${diff.toExponential(4)}`);
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

function W(x, y, N = 2048) {
  return eta_s * wPKS * simpsonAx(x, N) * simpsonAy(y, N);
}

console.log("\nW(x, y) checks (N=2048):");
const wChecks = [
  [0, 0, 1.137311930],
  [100, 0, 1.069250043],
  [300, 0, 0.613926484],
  [335.839469719, 0, 0.515897797],
  [500, 0, 0.163473048],
  [800, 0, 0.003632339],
  [0, 100, 0.990002496],
  [0, 123.339469719, 0.920935017],
  [0, 300, 0.326039625],
  [335.839469719, 123.339469719, 0.417746736]
];

for (const [x, y, target] of wChecks) {
  const val = W(x, y, 2048);
  const diff = Math.abs(val - target);
  console.log(`W(${x}, ${y}) = ${val.toFixed(9)}, target = ${target.toFixed(9)}, err = ${diff.toExponential(4)}`);
}

console.log("\nSymmetry checks:");
console.log("|W(100, 50) - W(-100, 50)| =", Math.abs(W(100, 50) - W(-100, 50)).toExponential(4));
console.log("|W(100, 50) - W(100, -50)| =", Math.abs(W(100, 50) - W(100, -50)).toExponential(4));

console.log("\nConvergence check (N=4096 vs N=2048):");
for (const [x, y, target] of wChecks.slice(0, 3)) {
  const v2048 = W(x, y, 2048);
  const v4096 = W(x, y, 4096);
  const diff = Math.abs(v4096 - v2048);
  console.log(`Point (${x}, ${y}): diff = ${diff.toExponential(4)}`);
}
