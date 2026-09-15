import React from 'react';
import { BookOpen, ShieldCheck, ArrowRight } from 'lucide-react';

export const PaperBenchmarkCard: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200 rounded-lg p-4 shadow-2xs">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-600 text-white rounded-md shrink-0 shadow-2xs">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-bold text-slate-900 text-sm">
              原论文 1312(1) 工程背景与实测对比基线公开说明
            </h4>
            <span className="px-2 py-0.5 text-[11px] bg-blue-100 text-blue-800 rounded font-medium">
              淮南矿区顾北煤矿 1312(1) 首采工作面
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            原论文中，基于该工作面 ML04 走向观测线的工程对比数据表明：
            <strong>实测最大地表沉降约为 2.58 m</strong>。
            论文给出的模型性能对比为：
            <span className="inline-block mx-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-semibold">
              覆岩耦合模型: MAE = 0.07 m, MRE = 9.46%
            </span>
            对比
            <span className="inline-block mx-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded">
              传统概率积分法: MAE = 0.28 m, MRE = 33.02%
            </span>
            。
          </p>

          <div className="p-2.5 bg-white/80 border border-blue-200/70 rounded text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>严谨学术声明与数据真实性规范</span>
            </div>
            <p className="text-slate-500">
              原论文未随文公开 ML04 观测线全部 69 个测点的离散精确经纬度/局部坐标及每点原始实测值。
              为确保工程数值严谨性，本平台<strong>绝不虚构或捏造未经核实的伪现场测点</strong>；
              平台提供的 69 点验证文件明确标注为<strong>“合成验证数据”</strong>，用于软件全流程精度核验及鲁棒性测试，并在实测比对中以黄色标签醒目标注。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
