// Automated acceptance test script
import { PRESET_1312_1 } from '../src/types.ts';
import { runModelSelfCheck } from '../src/core/model.ts';

console.log("=== 正在执行采动覆岩运移—地表沉陷耦合预计平台模型自检 ===");

const report = runModelSelfCheck();
console.log(`执行时间: ${report.timestamp}`);
console.log(`测试项目总数: ${report.items.length}\n`);

let passedCount = 0;
let failedCount = 0;

for (const item of report.items) {
  const status = item.passed ? '✓ PASS' : '✗ FAIL';
  const errStr = item.absoluteError !== undefined ? ` (误差: ${item.absoluteError.toExponential(4)}, 容差: ${item.tolerance})` : '';
  console.log(`[${status}] ${item.name}: 计算值=${item.calculatedValue}, 目标值=${item.targetValue}${errStr}`);
  if (item.passed) passedCount++;
  else failedCount++;
}

console.log("\n=======================================================");
console.log(`自检结论: ${report.passedAll ? '全部断言通过！(PASSED ALL)' : '存在未通过断言 (FAILED)'}`);
console.log(`通过: ${passedCount}, 失败: ${failedCount}`);
console.log("=======================================================");

if (!report.passedAll) {
  process.exit(1);
} else {
  process.exit(0);
}
