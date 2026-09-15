import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  RotateCw,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { AcceptanceTestReport } from '../types.ts';
import { runModelSelfCheck } from '../core/model.ts';

interface AcceptanceTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AcceptanceTestModal: React.FC<AcceptanceTestModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [report, setReport] = useState<AcceptanceTestReport | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !report) {
      setReport(runModelSelfCheck());
    }
  }, [isOpen, report]);

  if (!isOpen) return null;

  const handleRerun = () => {
    setReport(runModelSelfCheck());
  };

  const handleCopy = () => {
    if (!report) return;
    let text = `=== 采动覆岩运移与地表沉陷耦合预计平台 模型自检报告 ===\n`;
    text += `测试时间: ${report.timestamp}\n`;
    text += `结论: ${report.passedAll ? '全部断言通过 (PASSED)' : '存在未通过断言 (FAILED)'}\n\n`;
    for (const item of report.items) {
      text += `[${item.passed ? 'PASS' : 'FAIL'}] ${item.name}\n`;
      text += `  说明: ${item.description}\n`;
      text += `  计算值: ${item.calculatedValue}, 目标值: ${item.targetValue}\n`;
      if (item.absoluteError !== undefined) {
        text += `  绝对误差: ${item.absoluteError.toExponential(4)}, 容差: ${item.tolerance}\n`;
      }
      text += `\n`;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                report?.passedAll
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                模型自检与验收测试套件 (Acceptance Test Suite)
              </h3>
              <p className="text-xs text-slate-500">
                严格比对标准基准算例 6 项派生参数、5 个关键层点、10 个地表沉降点及对称性/收敛性
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRerun}
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
              title="重新运行自检"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
              title="复制测试报告文本"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Status Banner */}
        {report && (
          <div
            className={`px-4 py-3 flex items-center justify-between border-b ${
              report.passedAll
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                : 'bg-red-50/70 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              {report.passedAll ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>
                {report.passedAll
                  ? '验收合格：全部 24 项数学与物理断言均通过严格容差验证！'
                  : '未全部通过：部分数值断言超出容差限制，请检查实现'}
              </span>
            </div>
            <div className="text-xs font-mono">
              通过: {report.items.filter((i) => i.passed).length} / {report.items.length}
            </div>
          </div>
        )}

        {/* Test Items Table */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <table className="w-full text-xs text-left border border-slate-200 rounded-lg">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-3 py-2">测试项 / 断言名称</th>
                <th className="px-3 py-2 text-right">计算值</th>
                <th className="px-3 py-2 text-right">基准目标值</th>
                <th className="px-3 py-2 text-right">绝对误差</th>
                <th className="px-3 py-2 text-right">容差限</th>
                <th className="px-3 py-2 text-center">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {report?.items.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    !item.passed ? 'bg-red-50/50' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-sans">
                    <div className="font-semibold text-slate-800">{item.name}</div>
                    <div className="text-[11px] text-slate-400">{item.description}</div>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700 font-medium">
                    {item.calculatedValue}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500">
                    {item.targetValue}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {item.absoluteError !== undefined
                      ? item.absoluteError.toExponential(3)
                      : '--'}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-400">
                    {item.tolerance !== undefined
                      ? `≤ ${item.tolerance}`
                      : '--'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {item.passed ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                        FAIL
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">
            测试时间: {report?.timestamp ? new Date(report.timestamp).toLocaleString() : '--'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-medium transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
