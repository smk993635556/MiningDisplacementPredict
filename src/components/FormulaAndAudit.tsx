import React from 'react';
import { BookOpen, Calculator, CheckCircle2, FileCheck, Layers } from 'lucide-react';
import { ModelInputs, DerivedParams, CalculationGridResult } from '../types.ts';
import { PaperBenchmarkCard } from './PaperBenchmarkCard.tsx';

interface FormulaAndAuditProps {
  inputs: ModelInputs;
  derived: DerivedParams;
  gridResult: CalculationGridResult | null;
}

export const FormulaAndAudit: React.FC<FormulaAndAuditProps> = ({
  inputs,
  derived,
  gridResult,
}) => {
  return (
    <div className="space-y-4">
      {/* Benchmark notice */}
      <PaperBenchmarkCard />

      {/* Formula Specifications */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <Calculator className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">
            采动覆岩运移—地表沉陷耦合理论模型数学公式规范
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
          {/* Formula 1 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="flex items-center justify-between text-blue-800 font-semibold">
              <span>公式 (1): 主关键层最大自由下沉量</span>
              <span className="font-mono text-[11px] text-slate-400">(Eq. 1)</span>
            </div>
            <div className="p-2 bg-white rounded border border-slate-200 font-mono text-center text-slate-900 font-semibold">
              w_PKS = M - H_PKS-d · (K'p - 1)
            </div>
            <p className="text-[11px] text-slate-500">
              由采高 M 扣除主关键层下界面至煤层顶界面间垮落裂隙带岩层的残余碎胀充填高度。
            </p>
          </div>

          {/* Formula 2 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="flex items-center justify-between text-blue-800 font-semibold">
              <span>公式 (2): 主关键层有效破断尺度</span>
              <span className="font-mono text-[11px] text-slate-400">(Eq. 2)</span>
            </div>
            <div className="p-2 bg-white rounded border border-slate-200 font-mono text-center text-slate-900 font-semibold text-[11px]">
              L_z = d - 2·H_PKS-d / tan(θ),&nbsp;&nbsp;L_q = m - 2·H_PKS-d / tan(θ)
            </div>
            <p className="text-[11px] text-slate-500">
              依据岩层破断角 θ，自采空区周边向覆岩深部收缩求得主关键层位破断跨距。
            </p>
          </div>

          {/* Formula 3 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="flex items-center justify-between text-blue-800 font-semibold">
              <span>公式 (3): 地表主要影响半径与截断界</span>
              <span className="font-mono text-[11px] text-slate-400">(Eq. 3)</span>
            </div>
            <div className="p-2 bg-white rounded border border-slate-200 font-mono text-center text-slate-900 font-semibold text-[11px]">
              r = H_PKS-u / tan(δ0) + H_l / tan(φ)
            </div>
            <p className="text-[11px] text-slate-500">
              积分边界：D_f = (L_z + 2·L_PKS) / 2，M_f = (L_q + 2·L_PKS) / 2。
            </p>
          </div>

          {/* Formula 4 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="flex items-center justify-between text-blue-800 font-semibold">
              <span>公式 (4): 主关键层边界位移过渡函数</span>
              <span className="font-mono text-[11px] text-slate-400">(Eq. 4)</span>
            </div>
            <div className="p-2 bg-white rounded border border-slate-200 font-mono text-center text-slate-900 font-semibold text-[11px]">
              F(u, L) = 1 - [1 + exp((L - 2|u|) / (0.5·L_PKS) - 2)]^(-1)
            </div>
            <p className="text-[11px] text-slate-500">
              采用平滑 Sigmoid 型破断过渡曲线，模拟关键块体自破断区向非破断固支区的连续过渡。
            </p>
          </div>

          {/* Formula 5 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="flex items-center justify-between text-blue-800 font-semibold">
              <span>公式 (5): 主关键层二维破断下沉场</span>
              <span className="font-mono text-[11px] text-slate-400">(Eq. 5)</span>
            </div>
            <div className="p-2 bg-white rounded border border-slate-200 font-mono text-center text-slate-900 font-semibold text-[11px]">
              W_PKS(η, ξ) = w_PKS · F(η, L_z) · F(ξ, L_q)
            </div>
            <p className="text-[11px] text-slate-500">
              主关键层下沉空间分布由走向与倾向边界函数的乘积决定。
            </p>
          </div>

          {/* Formula 6 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
            <div className="flex items-center justify-between text-blue-800 font-semibold">
              <span>公式 (6): 地表下沉耦合二重积分及其分离</span>
              <span className="font-mono text-[11px] text-slate-400">(Eq. 6)</span>
            </div>
            <div className="p-2 bg-white rounded border border-slate-200 font-mono text-center text-slate-900 font-semibold text-[11px]">
              W(x, y) = η_s · w_PKS · A_x(x) · A_y(y)
            </div>
            <p className="text-[11px] text-slate-500">
              通过高斯核在走向与倾向方向的严格代数分离，二重面积分转化为两个一维复合 Simpson 数值积分。
            </p>
          </div>
        </div>
      </div>

      {/* Audit Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">模型数值审计与参数跟踪表</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            计算时间: {new Date().toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
            <span className="text-slate-400 block text-[11px]">开采尺寸 (d × m)</span>
            <span className="font-semibold text-slate-800">{inputs.d} m × {inputs.m} m</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
            <span className="text-slate-400 block text-[11px]">采高与深度 (M, H)</span>
            <span className="font-semibold text-slate-800">{inputs.M} m / {inputs.miningDepth} m</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
            <span className="text-slate-400 block text-[11px]">主关键层高度 (H_d, H_u)</span>
            <span className="font-semibold text-slate-800">{inputs.H_PKS_d} m / {inputs.H_PKS_u} m</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
            <span className="text-slate-400 block text-[11px]">松散层厚度 (H_l)</span>
            <span className="font-semibold text-slate-800">{inputs.H_l} m</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
            <span className="text-slate-400 block text-[11px]">角类参数 (θ, δ0, φ)</span>
            <span className="font-semibold text-slate-800">{inputs.theta}°, {inputs.delta0}°, {inputs.phi}°</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
            <span className="text-slate-400 block text-[11px]">碎胀与下沉系数 (Kp', η_s)</span>
            <span className="font-semibold text-slate-800">{inputs.Kp_res}, {inputs.eta_s}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
            <span className="text-slate-400 block text-[11px]">块体特征长 (L_PKS)</span>
            <span className="font-semibold text-slate-800">{inputs.L_PKS} m</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
            <span className="text-slate-400 block text-[11px]">Simpson 子区间数 (N)</span>
            <span className="font-semibold text-slate-800">{inputs.grid.simpsonSubintervals} (复合1/3公式)</span>
          </div>
        </div>

        <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100">
          <span>算法实现属性：纯客户端执行，不依赖远程后端；严格分离理论模型与参数反演。</span>
          <span className="text-emerald-700 font-medium">数值精度：64位双精度浮点</span>
        </div>
      </div>
    </div>
  );
};
