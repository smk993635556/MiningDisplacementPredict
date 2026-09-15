import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// 1. Project Parameters
const paramData = [
  ['采动覆岩运移与地表沉陷耦合预计平台 - 项目参数表'],
  ['说明：黄色单元格由用户填写数值，请勿修改字段编码'],
  [],
  ['参数名称', '字段编码', '设定值', '单位', '填写说明与要求'],
  ['工程项目名称', 'project_name', '示例工程：深厚松散层非充分采动', '-', '标准算例'],
  ['工作面走向长度', 'd', 630.0, 'm', '采空区走向跨度，要求 > 0'],
  ['工作面倾向长度', 'm', 205.0, 'm', '采空区倾向跨度，要求 > 0'],
  ['采高', 'M', 3.6, 'm', '煤层开采厚度，要求 > 0'],
  ['主关键层破断块走向长度', 'L_PKS', 30.7, 'm', '主关键层极限断块步距，要求 > 0'],
  ['主关键层下方岩层残余碎胀系数', 'Kp_res', 1.0, '-', '残余碎胀系数，要求 >= 1.0'],
  ['岩层破断角', 'theta_deg', 75.0, '°', '覆岩极限破断角，(0°, 90°)'],
  ['岩层边界角', 'delta0_deg', 46.2, '°', '基岩主要影响边界角，(0°, 90°)'],
  ['松散层移动角', 'phi_deg', 45.0, '°', '松散层主要影响移动角，(0°, 90°)'],
  ['地表下沉系数', 'eta_s', 1.1, '-', '地表下沉系数，要求 > 0'],
];

// 2. Strata Table (16 layers)
const strataData = [
  ['layer_no', 'lithology', 'thickness_m', 'layer_type', 'note'],
  [1, '第四系冲洪积粉质粘土', 60.0, '松散层', '上部松散沉积物'],
  [2, '新近系上部粘土互层', 120.0, '松散层', '隔水粘土层'],
  [3, '新近系中部富水砂砾层', 140.0, '松散层', '主要含水层'],
  [4, '新近系下部钙质粘土', 120.0, '松散层', '松散层底部隔水层，松散层总厚 H_l=440m'],
  [5, '风化带泥质粉砂岩', 9.2, '普通岩层', '基岩面风化带'],
  [6, '中粒石英砂岩', 12.5, '普通岩层', '主关键层上方基岩，H_PKS-u=21.7m'],
  [7, '坚硬细粒砂岩 (主关键层)', 29.5, '主关键层', '主关键层 PKS，破断步距 L_PKS=30.7m'],
  [8, '灰黑色砂质泥岩', 6.8, '普通岩层', '关键层下伏岩层'],
  [9, '中细粒砂岩 (亚关键层)', 10.5, '亚关键层', '亚关键层 SKS'],
  [10, '互层粉砂岩', 5.0, '普通岩层', '粉砂互层'],
  [11, '炭质泥岩夹层', 4.5, '普通岩层', '泥质岩层'],
  [12, '细粒砂岩', 6.0, '普通岩层', '砂岩顶板'],
  [13, '泥岩直接顶板', 4.0, '普通岩层', '煤层直接顶，H_PKS-d=36.8m'],
  [14, '目标开采煤层', 3.6, '煤层', '采高 M=3.6m'],
  [15, '炭质泥岩直接底', 2.4, '普通岩层', '煤层直接底'],
  [16, '坚硬细砂岩老底', 15.0, '普通岩层', '老底岩层'],
];

// 3. Measured points (69 points)
const measuredData = [
  ['point_id', 'section', 'x_m', 'y_m', 'w_measured_m', 'data_type'],
];

// Check if synthetic points file exists in public/examples
const existingCsvPath = path.resolve('./public/examples/合成验证数据_严格公式_69点.csv');
if (fs.existsSync(existingCsvPath)) {
  const content = fs.readFileSync(existingCsvPath, 'utf8');
  const lines = content.trim().split('\n');
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim());
    if (parts.length >= 4) {
      const pointId = parts[0];
      const section = parts[1];
      const s = Number(parts[2]);
      const w = Number(parts[3]);
      const x = section === 'dip' ? 0 : s;
      const y = section === 'dip' ? s : 0;
      measuredData.push([
        pointId,
        section,
        x,
        y,
        w,
        '合成测试数据',
      ]);
    }
  }
}

// Build Workbook
const wb = XLSX.utils.book_new();

const wsParams = XLSX.utils.aoa_to_sheet(paramData);
wsParams['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 45 }];
XLSX.utils.book_append_sheet(wb, wsParams, '项目参数');

const wsStrata = XLSX.utils.aoa_to_sheet(strataData);
wsStrata['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
XLSX.utils.book_append_sheet(wb, wsStrata, '地层表');

const wsMeasured = XLSX.utils.aoa_to_sheet(measuredData);
wsMeasured['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }];
XLSX.utils.book_append_sheet(wb, wsMeasured, '实测数据');

const outPath = path.resolve('./public/examples/开采沉陷预计平台_项目导入示例.xlsx');
XLSX.writeFile(wb, outPath);
console.log('Successfully generated:', outPath);

// Also generate blank template
const wbTemplate = XLSX.utils.book_new();
const blankParamData = paramData.map((row, idx) => {
  if (idx >= 4) {
    const copy = [...row];
    if (copy[1] !== 'project_name') copy[2] = '';
    return copy;
  }
  return row;
});
const wsBlankParams = XLSX.utils.aoa_to_sheet(blankParamData);
wsBlankParams['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 45 }];
XLSX.utils.book_append_sheet(wbTemplate, wsBlankParams, '项目参数');

const blankStrataData = [
  ['layer_no', 'lithology', 'thickness_m', 'layer_type', 'note'],
  [1, '松散层（表土）', '', '松散层', '所有连续顶部松散层累加为 H_l'],
  [2, '基岩', '', '普通岩层', '松散层与主关键层之间基岩累加为 H_PKS-u'],
  [3, '坚硬岩层 (主关键层)', '', '主关键层', '必须且只能指定1个主关键层'],
  [4, '煤层顶板岩层', '', '普通岩层', '主关键层与煤层之间岩层累加为 H_PKS-d'],
  [5, '目标开采煤层', '', '煤层', '必须且只能指定1个目标煤层'],
];
const wsBlankStrata = XLSX.utils.aoa_to_sheet(blankStrataData);
wsBlankStrata['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
XLSX.utils.book_append_sheet(wbTemplate, wsBlankStrata, '地层表');

const blankMeasuredData = [
  ['point_id', 'section', 'x_m', 'y_m', 'w_measured_m', 'data_type'],
];
const wsBlankMeasured = XLSX.utils.aoa_to_sheet(blankMeasuredData);
wsBlankMeasured['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }];
XLSX.utils.book_append_sheet(wbTemplate, wsBlankMeasured, '实测数据');

const templatePath = path.resolve('./public/examples/开采沉陷预计平台_项目导入模板.xlsx');
XLSX.writeFile(wbTemplate, templatePath);
console.log('Successfully generated template:', templatePath);
