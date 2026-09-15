import React from 'react';
import {
  ArrowDown,
  Info,
  CheckCircle,
  Timer,
  Maximize2,
  Compass,
} from 'lucide-react';
import { DerivedParams, CalculationGridResult, ModelInputs } from '../types.ts';

interface SummaryCardsProps {
  derived: DerivedParams;
  gridResult: CalculationGridResult | null;
  inputs: ModelInputs;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  derived,
  gridResult,
  inputs,
}) => {
  return (
    <div className="w-full space-y-2.5">
      {/* Top Convention Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-blue-50/70 border border-blue-200/80 rounded-lg text-xs">
        <div className="flex items-center gap-1.5 text-blue-900 font-medium">
          <ArrowDown className="w-4 h-4 text-blue-600 animate-bounce" />
          <span>符号约定：沉降向下为正 (Downwards positive, W &gt; 0, 单位: m)</span>
        </div>
        <div className="flex items-center gap-3 text-slate-600 text-[11px]">
          <span>地表坐标：x 走向，y 倾向</span>
          <span>•</span>
          <span>主关键层：η 走向，ξ 倾向</span>
          {gridResult && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <Timer className="w-3.5 h-3.5" />
                <span>计算耗时: {gridResult.computeTimeMs} ms</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {/* 1. wPKS */}
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-0.5">
            <span>w_PKS</span>
            <span className="text-[10px] text-slate-400">PKS下沉</span>
          </div>
          <div className="text-base font-bold text-slate-900 tracking-tight">
            {derived.wPKS.toFixed(4)} <span className="text-xs font-normal text-slate-500">m</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">M - H_d·(K'p - 1)</div>
        </div>

        {/* 2. Lz */}
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-0.5">
            <span>L_z</span>
            <span className="text-[10px] text-slate-400">走向破断</span>
          </div>
          <div className="text-base font-bold text-slate-900 tracking-tight">
            {derived.Lz.toFixed(4)} <span className="text-xs font-normal text-slate-500">m</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">d - 2H_d/tanθ</div>
        </div>

        {/* 3. Lq */}
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-0.5">
            <span>L_q</span>
            <span className="text-[10px] text-slate-400">倾向破断</span>
          </div>
          <div className="text-base font-bold text-slate-900 tracking-tight">
            {derived.Lq.toFixed(4)} <span className="text-xs font-normal text-slate-500">m</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">m - 2H_d/tanθ</div>
        </div>

        {/* 4. Df */}
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-0.5">
            <span>D_f</span>
            <span className="text-[10px] text-slate-400">走向积分界</span>
          </div>
          <div className="text-base font-bold text-slate-900 tracking-tight">
            {derived.Df.toFixed(4)} <span className="text-xs font-normal text-slate-500">m</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">(Lz + 2LPKS)/2</div>
        </div>

        {/* 5. Mf */}
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-0.5">
            <span>M_f</span>
            <span className="text-[10px] text-slate-400">倾向积分界</span>
          </div>
          <div className="text-base font-bold text-slate-900 tracking-tight">
            {derived.Mf.toFixed(4)} <span className="text-xs font-normal text-slate-500">m</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">(Lq + 2LPKS)/2</div>
        </div>

        {/* 6. r */}
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-0.5">
            <span>r</span>
            <span className="text-[10px] text-slate-400">主要影响径</span>
          </div>
          <div className="text-base font-bold text-slate-900 tracking-tight">
            {derived.r.toFixed(4)} <span className="text-xs font-normal text-slate-500">m</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">H_u/tanδ0 + H_l/tanφ</div>
        </div>

        {/* 7. W_max Surface */}
        <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-2.5 shadow-2xs col-span-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-blue-700 text-[11px] mb-0.5 font-medium">
            <span>W_max 地表最大下沉</span>
            <ArrowDown className="w-3 h-3 text-blue-600" />
          </div>
          <div className="text-base font-extrabold text-blue-700 tracking-tight">
            {gridResult ? gridResult.maxSurfaceW.toFixed(4) : '--'}{' '}
            <span className="text-xs font-normal text-blue-600">m</span>
          </div>
          <div className="text-[10px] text-slate-500">
            坐标:{' '}
            {gridResult
              ? `(${gridResult.maxSurfaceCoord[0]}, ${gridResult.maxSurfaceCoord[1]})`
              : '--'}
          </div>
        </div>
      </div>
    </div>
  );
};
