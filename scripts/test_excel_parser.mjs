import fs from 'fs';
import path from 'path';
import { parseProjectExcel } from '../src/core/excelProjectService.ts';

async function test() {
  const fileBuf = fs.readFileSync('./public/examples/开采沉陷预计平台_项目导入示例.xlsx');
  const res = await parseProjectExcel(fileBuf, '开采沉陷预计平台_项目导入示例.xlsx');
  console.log('Parse result success:', res.success);
  console.log('Project name:', res.projectName);
  console.log('Errors:', res.errors);
  console.log('Warnings:', res.warnings);
  console.log('Summary:', res.summary);
  if (res.inputs) {
    console.log('d:', res.inputs.d, 'm:', res.inputs.m, 'M:', res.inputs.M);
    console.log('H_l:', res.inputs.H_l, 'H_PKS_u:', res.inputs.H_PKS_u, 'H_PKS_d:', res.inputs.H_PKS_d);
    console.log('L_PKS:', res.inputs.L_PKS, 'Kp_res:', res.inputs.Kp_res, 'theta:', res.inputs.theta);
  }
  if (!res.success || res.errors.length > 0) {
    process.exit(1);
  }
}

test();
