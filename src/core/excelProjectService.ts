import * as XLSX from 'xlsx';
import type { ModelInputs, StratumLayer, MeasuredPoint } from '../types.ts';
import { PRESET_1312_1, DEFAULT_16_STRATA } from '../types.ts';
import { calculateOverburdenFromStrata, normalizeLayerType } from './stratumCalculator.ts';

export interface ProjectExcelParseResult {
  success: boolean;
  projectName?: string;
  inputs?: ModelInputs;
  strata?: StratumLayer[];
  measuredPoints?: MeasuredPoint[];
  errors: string[];
  warnings: string[];
  summary: {
    parametersCount: number;
    strataCount: number;
    measuredPointsCount: number;
    skippedMeasuredPointsCount?: number;
    measuredStatusNote?: string;
    pksRecognized: boolean;
    coalRecognized: boolean;
    calculatedH_l?: number;
    calculatedH_PKS_u?: number;
    calculatedH_PKS_d?: number;
  };
}

export type ParsedExcelResult = ProjectExcelParseResult;

/**
 * Standard required parameter codes
 */
const REQUIRED_PARAM_CODES: Record<string, { name: string; unit: string; min?: number; max?: number }> = {
  d: { name: '工作面走向长度', unit: 'm', min: 0.001 },
  m: { name: '工作面倾向长度', unit: 'm', min: 0.001 },
  M: { name: '采高', unit: 'm', min: 0.001 },
  L_PKS: { name: '主关键层破断块走向长度', unit: 'm', min: 0.001 },
  Kp_res: { name: '残余碎胀系数', unit: '-', min: 1.0 },
  theta_deg: { name: '岩层破断角', unit: '°', min: 0.001, max: 89.999 },
  delta0_deg: { name: '岩层边界角', unit: '°', min: 0.001, max: 89.999 },
  phi_deg: { name: '松散层移动角', unit: '°', min: 0.001, max: 89.999 },
  eta_s: { name: '地表下沉系数', unit: '-', min: 0.001 },
};

/**
 * Parses full Project Excel workbook containing:
 * 1. "项目参数"
 * 2. "地层表"
 * 3. "实测数据" (optional)
 */
export async function parseProjectExcel(
  data: ArrayBuffer | Uint8Array | File | string,
  fileName?: string
): Promise<ProjectExcelParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let workbook: XLSX.WorkBook;
  try {
    if (typeof data === 'string') {
      workbook = XLSX.read(data, { type: 'string' });
    } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
      workbook = XLSX.read(data, { type: 'array' });
    } else {
      const buf = await data.arrayBuffer();
      workbook = XLSX.read(buf, { type: 'array' });
    }
  } catch (err: any) {
    return {
      success: false,
      errors: [`Excel 文件读取失败: ${err?.message || '文件损坏或格式不受支持'}`],
      warnings: [],
      summary: {
        parametersCount: 0,
        strataCount: 0,
        measuredPointsCount: 0,
        pksRecognized: false,
        coalRecognized: false,
      },
    };
  }

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    return {
      success: false,
      errors: ['工作簿中未找到任何工作表'],
      warnings: [],
      summary: {
        parametersCount: 0,
        strataCount: 0,
        measuredPointsCount: 0,
        pksRecognized: false,
        coalRecognized: false,
      },
    };
  }

  // Find target sheets by name fuzzy match
  const findSheet = (keywords: string[]) => {
    return sheetNames.find((name) => {
      const lower = name.trim().toLowerCase();
      return keywords.some((kw) => lower.includes(kw));
    });
  };

  const paramSheetName = findSheet(['项目参数', '参数', 'param', 'project']);
  const strataSheetName = findSheet(['地层表', '地层', '柱状', 'strata', 'layer']);
  const measuredSheetName = findSheet(['实测数据', '实测', '测点', 'measured', 'point', 'data']);

  // ----------------------------------------------------
  // 1. Parse "项目参数"
  // ----------------------------------------------------
  const parsedParams: Record<string, any> = {};
  let projectName = '导入工程';

  if (!paramSheetName) {
    errors.push('未在 Excel 中找到“项目参数”工作表，请确保包含名为“项目参数”的工作表');
  } else {
    const sheet = workbook.Sheets[paramSheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Look for header row to identify Code Column and Value Column
    let codeCol = -1;
    let valCol = -1;
    let headerRowIdx = -1;

    for (let r = 0; r < Math.min(10, rawRows.length); r++) {
      const row = rawRows[r];
      if (!row || row.length < 2) continue;
      const lowerRow = row.map((cell) => String(cell || '').trim().toLowerCase());
      const cIdx = lowerRow.findIndex(
        (c) => (c === '字段编码' || c === '编码' || c.includes('code') || c === '字段') && c.length < 15
      );
      const vIdx = lowerRow.findIndex(
        (c) => (c === '设定值' || c === '值' || c.includes('value') || c.includes('数值') || c === '输入值') && c.length < 15
      );
      if (cIdx !== -1) {
        headerRowIdx = r;
        codeCol = cIdx;
        valCol = vIdx !== -1 ? vIdx : cIdx + 1;
        break;
      }
    }

    if (codeCol !== -1) {
      // Structured reading via Code Column and Value Column
      for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        const cellVal = String(row[codeCol] || '').trim();
        const lowerVal = cellVal.toLowerCase();
        const rawVal = row[valCol];

        if (cellVal === 'project_name' || cellVal === '工程名称' || lowerVal === 'project') {
          if (rawVal !== undefined && String(rawVal).trim()) {
            projectName = String(rawVal).trim();
          }
          continue;
        }

        for (const code of Object.keys(REQUIRED_PARAM_CODES)) {
          const matchStandard = cellVal === code;
          const matchAlias =
            (code === 'theta_deg' && (cellVal === 'theta' || cellVal === '破断角')) ||
            (code === 'delta0_deg' && (cellVal === 'delta0' || cellVal === '边界角')) ||
            (code === 'phi_deg' && (cellVal === 'phi' || cellVal === '移动角')) ||
            (code === 'L_PKS' && (cellVal === 'LPKS' || lowerVal === 'l_pks')) ||
            (code === 'Kp_res' && (cellVal === 'Kp' || lowerVal === 'kp_res'));

          if (matchStandard || matchAlias) {
            if (rawVal !== undefined && rawVal !== '') {
              const num = Number(rawVal);
              if (!isNaN(num)) {
                parsedParams[code] = num;
              } else {
                errors.push(`项目参数 [${code} (${REQUIRED_PARAM_CODES[code].name})] 必须为数值，读取到: "${rawVal}"`);
              }
            }
          }
        }

        if (cellVal === 'H_l' || cellVal === 'Hl') {
          const v = Number(rawVal);
          if (!isNaN(v) && v > 0) parsedParams['H_l'] = v;
        }
        if (cellVal === 'H_PKS_u' || cellVal === 'H_PKS-u' || cellVal === 'H_PKSu') {
          const v = Number(rawVal);
          if (!isNaN(v) && v > 0) parsedParams['H_PKS_u'] = v;
        }
        if (cellVal === 'H_PKS_d' || cellVal === 'H_PKS-d' || cellVal === 'H_PKSd') {
          const v = Number(rawVal);
          if (!isNaN(v) && v > 0) parsedParams['H_PKS_d'] = v;
        }
      }
    } else {
      // Fallback: Scan rows where cell matches field code, ensuring it's not a unit (e.g. preceded by number)
      for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        for (let c = 0; c < row.length; c++) {
          const cellVal = String(row[c] || '').trim();
          const lowerVal = cellVal.toLowerCase();

          // If current cell is 'm' but left neighbor is a number, it's a unit 'm' (meters), not the field code 'm'!
          const prevVal = c > 0 ? row[c - 1] : undefined;
          if (cellVal === 'm' && prevVal !== undefined && !isNaN(Number(prevVal)) && Number(prevVal) > 0) {
            continue;
          }

          if (cellVal === 'project_name' || cellVal === '工程名称' || lowerVal === 'project') {
            const nextVal = findNextValueInRow(row, c);
            if (nextVal !== undefined && String(nextVal).trim()) {
              projectName = String(nextVal).trim();
            }
          }

          for (const code of Object.keys(REQUIRED_PARAM_CODES)) {
            const matchStandard = cellVal === code;
            const matchAlias =
              (code === 'theta_deg' && (cellVal === 'theta' || cellVal === '破断角')) ||
              (code === 'delta0_deg' && (cellVal === 'delta0' || cellVal === '边界角')) ||
              (code === 'phi_deg' && (cellVal === 'phi' || cellVal === '移动角')) ||
              (code === 'L_PKS' && (cellVal === 'LPKS' || lowerVal === 'l_pks')) ||
              (code === 'Kp_res' && (cellVal === 'Kp' || lowerVal === 'kp_res'));

            if (matchStandard || matchAlias) {
              const nextVal = findNextValueInRow(row, c);
              if (nextVal !== undefined && nextVal !== '') {
                const num = Number(nextVal);
                if (!isNaN(num)) {
                  parsedParams[code] = num;
                } else {
                  errors.push(`项目参数 [${code} (${REQUIRED_PARAM_CODES[code].name})] 必须为数值，读取到: "${nextVal}"`);
                }
              }
            }
          }

          if (cellVal === 'H_l' || cellVal === 'Hl') {
            const v = Number(findNextValueInRow(row, c));
            if (!isNaN(v) && v > 0) parsedParams['H_l'] = v;
          }
          if (cellVal === 'H_PKS_u' || cellVal === 'H_PKS-u' || cellVal === 'H_PKSu') {
            const v = Number(findNextValueInRow(row, c));
            if (!isNaN(v) && v > 0) parsedParams['H_PKS_u'] = v;
          }
          if (cellVal === 'H_PKS_d' || cellVal === 'H_PKS-d' || cellVal === 'H_PKSd') {
            const v = Number(findNextValueInRow(row, c));
            if (!isNaN(v) && v > 0) parsedParams['H_PKS_d'] = v;
          }
        }
      }
    }

    // Check missing required parameters
    for (const [code, info] of Object.entries(REQUIRED_PARAM_CODES)) {
      if (parsedParams[code] === undefined) {
        errors.push(`“项目参数”缺少必填字段: ${code} (${info.name})`);
      } else {
        const val = parsedParams[code];
        if (info.min !== undefined && val < info.min) {
          errors.push(`参数 ${code} (${info.name}) 取值 ${val} 过小，必须 >= ${info.min} ${info.unit}`);
        }
        if (info.max !== undefined && val > info.max) {
          errors.push(`参数 ${code} (${info.name}) 取值 ${val} 过大，必须 <= ${info.max} ${info.unit}`);
        }
      }
    }
  }

  // ----------------------------------------------------
  // 2. Parse "地层表"
  // ----------------------------------------------------
  let parsedStrata: StratumLayer[] = [];
  let strataAnalysis = {
    valid: false,
    H_l: parsedParams['H_l'] || 0,
    H_PKS_u: parsedParams['H_PKS_u'] || 0,
    H_PKS_d: parsedParams['H_PKS_d'] || 0,
    coalThickness: 0,
    pksLayerIndex: -1,
    coalLayerIndex: -1,
    layersWithDepth: [] as StratumLayer[],
  };

  if (!strataSheetName) {
    if (parsedParams['H_l'] && parsedParams['H_PKS_u'] && parsedParams['H_PKS_d']) {
      warnings.push('未在 Excel 中找到“地层表”工作表，使用“项目参数”中直接提供的 H_l, H_PKS-u, H_PKS-d');
    } else {
      errors.push('未找到“地层表”工作表且“项目参数”缺少 H_l / H_PKS-u / H_PKS-d');
    }
  } else {
    const sheet = workbook.Sheets[strataSheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rawRows.length < 2) {
      errors.push('“地层表”工作表至少需要表头行与一行地层数据');
    } else {
      // Find header row
      let headerRowIdx = -1;
      let colIndices = {
        layerNo: -1,
        lithology: -1,
        thickness: -1,
        layerType: -1,
        note: -1,
      };

      for (let r = 0; r < Math.min(5, rawRows.length); r++) {
        const row = rawRows[r];
        if (!row) continue;
        const lowerRow = row.map((cell) => String(cell || '').trim().toLowerCase());

        const thickIdx = lowerRow.findIndex((c) => c.includes('thick') || c.includes('厚度'));
        const lithIdx = lowerRow.findIndex((c) => c.includes('lith') || c.includes('岩性') || c.includes('岩石'));

        if (thickIdx !== -1 || lithIdx !== -1) {
          headerRowIdx = r;
          colIndices.thickness = thickIdx;
          colIndices.lithology = lithIdx;
          colIndices.layerNo = lowerRow.findIndex((c) => c.includes('no') || c.includes('层号') || c.includes('序号') || c.includes('层序'));
          colIndices.layerType = lowerRow.findIndex((c) => c.includes('type') || c.includes('类型'));
          colIndices.note = lowerRow.findIndex((c) => c.includes('note') || c.includes('备注') || c.includes('说明'));
          break;
        }
      }

      if (headerRowIdx === -1 || colIndices.thickness === -1) {
        errors.push('“地层表”未识别到“厚度 (thickness_m)”列名');
      } else {
        const rawLayers: Array<{
          layerNo?: number;
          lithology: string;
          thickness: number;
          layerType?: string;
          notes?: string;
        }> = [];

        for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0 || row.every((c) => c === undefined || c === null || c === '')) {
            continue; // Skip empty rows
          }

          const lithology = colIndices.lithology !== -1 ? String(row[colIndices.lithology] || '').trim() : `岩层_${r}`;
          const rawThick = colIndices.thickness !== -1 ? row[colIndices.thickness] : undefined;
          const thickness = Number(rawThick);
          const rawType = colIndices.layerType !== -1 ? String(row[colIndices.layerType] || '').trim() : '普通岩层';
          const notes = colIndices.note !== -1 ? String(row[colIndices.note] || '').trim() : '';

          if (rawThick === undefined || rawThick === '' || isNaN(thickness)) {
            errors.push(`地层表第 ${r - headerRowIdx} 行 (${lithology || '未命名'}) 厚度非数字: "${rawThick}"`);
          } else if (thickness <= 0) {
            errors.push(`地层表第 ${r - headerRowIdx} 行 (${lithology}) 厚度必须大于 0m，当前为: ${thickness}`);
          }

          rawLayers.push({
            layerNo: r - headerRowIdx,
            lithology,
            thickness: isNaN(thickness) ? 0 : thickness,
            layerType: rawType,
            notes,
          });
        }

        const res = calculateOverburdenFromStrata(rawLayers);
        if (!res.valid) {
          errors.push(...res.errors);
        }
        if (res.warnings.length > 0) {
          warnings.push(...res.warnings);
        }

        parsedStrata = res.layersWithDepth;
        strataAnalysis = res;
      }
    }
  }

  // ----------------------------------------------------
  // 3. Parse "实测数据" (optional)
  // Strictly read only columns A:F (index 0 to 5)
  // Never treat column H or beyond (notes/summary) as measured points
  // ----------------------------------------------------
  const parsedPoints: MeasuredPoint[] = [];
  let skippedMeasuredCount = 0;
  let measuredStatusNote = '';

  if (measuredSheetName) {
    const sheet = workbook.Sheets[measuredSheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rawRows.length > 1) {
      // Look only at columns A:F of header row
      const headerSlice = (rawRows[0] || []).slice(0, 6);
      const lowerRow = headerSlice.map((c) => String(c || '').trim().toLowerCase());

      let idIdx = lowerRow.findIndex((c) => c.includes('point') || c.includes('id') || c.includes('点号') || c.includes('测点'));
      let secIdx = lowerRow.findIndex((c) => c.includes('section') || c.includes('断面') || c.includes('剖面') || c.includes('测线'));
      let xIdx = lowerRow.findIndex((c) => c === 'x_m' || c === 'x' || c.includes('走向'));
      let yIdx = lowerRow.findIndex((c) => c === 'y_m' || c === 'y' || c.includes('倾向'));
      let wIdx = lowerRow.findIndex((c) => c === 'w_measured_m' || c.includes('w') || c.includes('measured') || c.includes('沉降') || c.includes('下沉'));
      let typeIdx = lowerRow.findIndex((c) => c === 'data_type' || c.includes('type') || c.includes('数据类型') || c.includes('类型'));

      // Fallbacks within standard A:F (0~5)
      if (idIdx === -1) idIdx = 0;
      if (secIdx === -1) secIdx = 1;
      if (xIdx === -1) xIdx = 2;
      if (yIdx === -1) yIdx = 3;
      if (wIdx === -1) wIdx = 4;

      for (let r = 1; r < rawRows.length; r++) {
        // Strictly slice only columns A:F (index 0 through 5)
        const row = (rawRows[r] || []).slice(0, 6);
        // Completely blank row check
        if (!row || row.length === 0 || row.every((c) => c === undefined || c === null || String(c).trim() === '')) {
          continue; // skip empty line, do not count
        }

        const ptId = String(row[idIdx] !== undefined ? row[idIdx] : '').trim();
        if (!ptId) {
          skippedMeasuredCount++;
          continue;
        }

        const xVal = Number(row[xIdx]);
        const yVal = Number(row[yIdx]);
        const wVal = Number(row[wIdx]);
        const rawSec = secIdx !== -1 && row[secIdx] !== undefined ? String(row[secIdx]).trim() : '';
        const rawType = typeIdx !== -1 && row[typeIdx] !== undefined ? String(row[typeIdx]).trim() : '';

        if (isNaN(xVal) || isNaN(yVal) || isNaN(wVal) || !isFinite(xVal) || !isFinite(yVal) || !isFinite(wVal)) {
          warnings.push(`实测数据表第 ${r + 1} 行测点 ${ptId} 存在非数值坐标或下沉值，已跳过`);
          skippedMeasuredCount++;
          continue;
        }

        const isSynth =
          rawType.includes('合成') ||
          rawType.includes('模拟') ||
          rawType.includes('synthetic') ||
          (fileName && (fileName.includes('合成') || fileName.includes('模拟')));

        parsedPoints.push({
          point_id: ptId,
          section: rawSec.includes('倾向') || rawSec.toLowerCase() === 'dip' ? 'dip' : rawSec.includes('走向') || rawSec.toLowerCase() === 'strike' ? 'strike' : 'other',
          x: xVal,
          y: yVal,
          w_measured: wVal,
          dataType: isSynth ? '合成测试数据' : '现场实测数据',
        });
      }
    }
  }

  if (parsedPoints.length === 0) {
    measuredStatusNote = '该项目文件未包含逐点实测数据，可另行上传实测CSV/XLSX';
  }

  // ----------------------------------------------------
  // Final Assembly
  // ----------------------------------------------------
  const H_l = strataAnalysis.valid ? strataAnalysis.H_l : parsedParams['H_l'] || PRESET_1312_1.H_l;
  const H_PKS_u = strataAnalysis.valid ? strataAnalysis.H_PKS_u : parsedParams['H_PKS_u'] || PRESET_1312_1.H_PKS_u;
  const H_PKS_d = strataAnalysis.valid ? strataAnalysis.H_PKS_d : parsedParams['H_PKS_d'] || PRESET_1312_1.H_PKS_d;

  const inputs: ModelInputs = {
    caseName: projectName || '导入工程',
    d: parsedParams['d'] || PRESET_1312_1.d,
    m: parsedParams['m'] || PRESET_1312_1.m,
    M: parsedParams['M'] || PRESET_1312_1.M,
    alpha: 5.0,
    miningDepth: H_l + H_PKS_u + 29.5 + H_PKS_d,
    H_PKS_d,
    H_PKS_u,
    H_l,
    Kp_res: parsedParams['Kp_res'] || PRESET_1312_1.Kp_res,
    theta: parsedParams['theta_deg'] || PRESET_1312_1.theta,
    L_PKS: parsedParams['L_PKS'] || PRESET_1312_1.L_PKS,
    delta0: parsedParams['delta0_deg'] || PRESET_1312_1.delta0,
    phi: parsedParams['phi_deg'] || PRESET_1312_1.phi,
    eta_s: parsedParams['eta_s'] || PRESET_1312_1.eta_s,
    grid: { ...PRESET_1312_1.grid },
  };

  const valid = errors.length === 0;

  return {
    success: valid,
    projectName,
    inputs: valid ? inputs : undefined,
    strata: parsedStrata.length > 0 ? parsedStrata : undefined,
    measuredPoints: parsedPoints.length > 0 ? parsedPoints : undefined,
    errors,
    warnings,
    summary: {
      parametersCount: Object.keys(parsedParams).length,
      strataCount: parsedStrata.length,
      measuredPointsCount: parsedPoints.length,
      skippedMeasuredPointsCount: skippedMeasuredCount,
      measuredStatusNote,
      pksRecognized: strataAnalysis.pksLayerIndex !== -1,
      coalRecognized: strataAnalysis.coalLayerIndex !== -1,
      calculatedH_l: strataAnalysis.H_l,
      calculatedH_PKS_u: strataAnalysis.H_PKS_u,
      calculatedH_PKS_d: strataAnalysis.H_PKS_d,
    },
  };
}

function findNextValueInRow(row: any[], startIdx: number): any {
  for (let c = startIdx + 1; c < row.length; c++) {
    const val = row[c];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return val;
    }
  }
  return undefined;
}

/**
 * Generates the standard Blank Excel Template for download
 */
export function generateBlankProjectWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. 项目参数 Sheet
  const paramData = [
    ['采动覆岩运移与地表沉陷耦合预计平台 - 项目参数表'],
    ['说明：黄色单元格由用户填写数值，请勿修改字段编码'],
    [],
    ['参数名称', '字段编码', '设定值', '单位', '填写说明与要求'],
    ['工程项目名称', 'project_name', '通用采煤工作面预计工程', '-', '可选，如：X矿X工作面'],
    ['工作面走向长度', 'd', 630.0, 'm', '必填，采空区走向长度，要求 > 0'],
    ['工作面倾向长度', 'm', 205.0, 'm', '必填，采空区倾向长度，要求 > 0'],
    ['采高', 'M', 3.6, 'm', '必填，采煤厚度，要求 > 0'],
    ['主关键层破断块走向长度', 'L_PKS', 30.7, 'm', '必填，根据关键层力学特征确定，要求 > 0'],
    ['主关键层下方岩层残余碎胀系数', 'Kp_res', 1.0, '-', '必填，岩层破碎残余碎胀系数，要求 >= 1.0'],
    ['岩层破断角', 'theta_deg', 75.0, '°', '必填，取值区间 (0°, 90°)'],
    ['岩层边界角', 'delta0_deg', 46.2, '°', '必填，取值区间 (0°, 90°)'],
    ['松散层移动角', 'phi_deg', 45.0, '°', '必填，取值区间 (0°, 90°)'],
    ['地表下沉系数', 'eta_s', 1.1, '-', '必填，地表充分采动下沉系数，要求 > 0'],
  ];

  const wsParams = XLSX.utils.aoa_to_sheet(paramData);
  wsParams['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsParams, '项目参数');

  // 2. 地层表 Sheet
  const strataData = [
    ['layer_no', 'lithology', 'thickness_m', 'layer_type', 'note'],
    [1, '松散层上部粘土', 200.0, '松散层', '松散沉积物'],
    [2, '松散层下部砂砾', 240.0, '松散层', '松散层底部，H_l总和=440m'],
    [3, '基岩风化带', 21.7, '普通岩层', '主关键层上方基岩，H_PKS-u=21.7m'],
    [4, '坚硬砂岩 (主关键层)', 29.5, '主关键层', '必须且只能有1个主关键层'],
    [5, '砂质泥岩', 36.8, '普通岩层', '关键层至煤层顶板，H_PKS-d=36.8m'],
    [6, '目标开采煤层', 3.6, '煤层', '必须且只能有1个目标煤层'],
    [7, '泥岩底板', 10.0, '普通岩层', '下伏岩层'],
  ];

  const wsStrata = XLSX.utils.aoa_to_sheet(strataData);
  wsStrata['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsStrata, '地层表');

  // 3. 实测数据 Sheet (Empty with headers)
  const measuredData = [
    ['point_id', 'section', 'x_m', 'y_m', 'w_measured_m', 'data_type'],
    ['# 说明: 测点编号', '剖面类型 (strike/dip)', '走向坐标(m)', '倾向坐标(m)', '实测下沉(m，向下为正)', '数据类型 (现场实测数据/合成测试数据)'],
  ];

  const wsMeasured = XLSX.utils.aoa_to_sheet(measuredData);
  wsMeasured['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsMeasured, '实测数据');

  return wb;
}

/**
 * Generates the complete 16-stratum standard example workbook
 */
export function generateSampleProjectWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. 项目参数 Sheet
  const paramData = [
    ['采动覆岩运移与地表沉陷耦合预计平台 - 项目参数表'],
    ['说明：本表由标准示例工程导出，黄色单元格对应模型直接输入参数'],
    [],
    ['参数名称', '字段编码', '设定值', '单位', '填写说明与要求'],
    ['工程项目名称', 'project_name', '示例工程：深厚松散层非充分采动', '-', '标准算例'],
    ['工作面走向长度', 'd', 630.0, 'm', '工作面采空区走向几何跨度'],
    ['工作面倾向长度', 'm', 205.0, 'm', '工作面采空区倾向几何跨度'],
    ['采高', 'M', 3.6, 'm', '煤层采出厚度'],
    ['主关键层破断块走向长度', 'L_PKS', 30.7, 'm', '主关键层极限破断断块步距'],
    ['主关键层下方岩层残余碎胀系数', 'Kp_res', 1.0, '-', '残余碎胀系数，标准算例为 1.0'],
    ['岩层破断角', 'theta_deg', 75.0, '°', '覆岩极限破断角'],
    ['岩层边界角', 'delta0_deg', 46.2, '°', '基岩主要影响边界角'],
    ['松散层移动角', 'phi_deg', 45.0, '°', '表土松散层主要影响移动角'],
    ['地表下沉系数', 'eta_s', 1.1, '-', '地表下沉系数'],
  ];

  const wsParams = XLSX.utils.aoa_to_sheet(paramData);
  wsParams['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsParams, '项目参数');

  // 2. 地层表 Sheet (16 layers)
  const strataData = [
    ['layer_no', 'lithology', 'thickness_m', 'layer_type', 'note'],
    ...DEFAULT_16_STRATA.map((layer) => [
      layer.layerNo,
      layer.lithology,
      layer.thickness,
      layer.layerType || '普通岩层',
      layer.notes || '',
    ]),
  ];

  const wsStrata = XLSX.utils.aoa_to_sheet(strataData);
  wsStrata['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsStrata, '地层表');

  // 3. 实测数据 Sheet (默认保持空，仅含标准表头，避免误充当现场实测)
  const measuredData: (string | number)[][] = [
    ['point_id', 'section', 'x_m', 'y_m', 'w_measured_m', 'data_type'],
    ['# 说明: 测点编号', '剖面类型 (strike/dip/other)', '走向坐标(m)', '倾向坐标(m)', '实测下沉(m，向下为正)', '数据类型 (现场实测数据)'],
  ];

  const wsMeasured = XLSX.utils.aoa_to_sheet(measuredData);
  wsMeasured['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsMeasured, '实测数据');

  return wb;
}

/**
 * Generates and triggers download of blank project template
 */
export function generateBlankTemplateWorkbook(): void {
  const wb = generateBlankProjectWorkbook();
  XLSX.writeFile(wb, '采动覆岩沉陷耦合预计_项目空白模板.xlsx');
}

/**
 * Exports current project state to a multi-sheet Excel file
 */
export function exportProjectToExcel(project: {
  projectName: string;
  inputs: ModelInputs;
  strata: StratumLayer[];
  measuredPoints?: MeasuredPoint[];
}): void {
  const wb = XLSX.utils.book_new();

  // 1. 项目参数 Sheet
  const paramData: (string | number)[][] = [
    ['采动覆岩运移与地表沉陷耦合预计平台 - 项目参数表'],
    ['说明：黄色单元格对应模型直接输入参数'],
    [],
    ['参数名称', '字段编码', '设定值', '单位', '填写说明与要求'],
    ['工程项目名称', 'project_name', project.projectName || '通用工作面工程', '-', ''],
    ['工作面走向长度', 'd', project.inputs.d, 'm', '采空区走向长度'],
    ['工作面倾向长度', 'm', project.inputs.m, 'm', '采空区倾向长度'],
    ['采高', 'M', project.inputs.M, 'm', '采厚'],
    ['主关键层破断块走向长度', 'L_PKS', project.inputs.L_PKS, 'm', '主关键层破断步距'],
    ['主关键层下方岩层残余碎胀系数', 'Kp_res', project.inputs.Kp_res, '-', '残余碎胀系数 >= 1.0'],
    ['岩层破断角', 'theta_deg', project.inputs.theta, '°', '破断角'],
    ['岩层边界角', 'delta0_deg', project.inputs.delta0, '°', '基岩边界角'],
    ['松散层移动角', 'phi_deg', project.inputs.phi, '°', '松散层移动角'],
    ['地表下沉系数', 'eta_s', project.inputs.eta_s, '-', '地表下沉系数'],
  ];
  const wsParams = XLSX.utils.aoa_to_sheet(paramData);
  wsParams['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsParams, '项目参数');

  // 2. 地层表 Sheet
  const strataData: (string | number)[][] = [
    ['layer_no', 'lithology', 'thickness_m', 'layer_type', 'note'],
    ...project.strata.map((layer) => [
      layer.layerNo,
      layer.lithology,
      layer.thickness,
      layer.layerType || '普通岩层',
      layer.notes || '',
    ]),
  ];
  const wsStrata = XLSX.utils.aoa_to_sheet(strataData);
  wsStrata['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsStrata, '地层表');

  // 3. 实测数据 Sheet (if any)
  if (project.measuredPoints && project.measuredPoints.length > 0) {
    const measuredDataRows: (string | number)[][] = [
      ['point_id', 'section', 'x_m', 'y_m', 'w_measured_m', 'data_type'],
      ...project.measuredPoints.map((p) => [
        p.point_id,
        p.section || 'strike',
        p.x,
        p.y,
        p.w_measured,
        '现场实测数据',
      ]),
    ];
    const wsMeasured = XLSX.utils.aoa_to_sheet(measuredDataRows);
    wsMeasured['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsMeasured, '实测数据');
  }

  XLSX.writeFile(wb, `${project.projectName || '采动沉陷预计'}_项目参数与地层表.xlsx`);
}

/**
 * Triggers browser download of a workbook
 */
export function downloadWorkbook(wb: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(wb, fileName);
}
