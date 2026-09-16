import * as XLSX from 'xlsx';
import { MeasuredPoint } from '../types.ts';

export interface ParseResult {
  success: boolean;
  points: MeasuredPoint[];
  dataType: '合成测试数据' | '现场实测数据';
  warnings: string[];
  errors: string[];
  rawHeaders: string[];
  detectedFormat: '2D' | 'profile' | 'unknown';
  validCount: number;
  skippedCount: number;
}

/**
 * Parses CSV or XLSX file and extracts MeasuredPoint[]
 * Strictly adheres to standard fields:
 * point_id, section, x_m, y_m, w_measured_m, data_type
 */
export async function parseMeasurementFile(
  file: File | ArrayBuffer | string,
  fileName?: string
): Promise<ParseResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let workbook: XLSX.WorkBook;

  try {
    if (typeof file === 'string') {
      workbook = XLSX.read(file, { type: 'string' });
    } else if (file instanceof ArrayBuffer) {
      workbook = XLSX.read(file, { type: 'array' });
    } else {
      const buffer = await file.arrayBuffer();
      workbook = XLSX.read(buffer, { type: 'array' });
    }
  } catch (err: any) {
    return {
      success: false,
      points: [],
      dataType: '现场实测数据',
      warnings: [],
      errors: [`文件解析失败: ${err?.message || '无法读取文件内容'}`],
      rawHeaders: [],
      detectedFormat: 'unknown',
      validCount: 0,
      skippedCount: 0,
    };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      success: false,
      points: [],
      dataType: '现场实测数据',
      warnings: [],
      errors: ['工作簿中未找到任何工作表'],
      rawHeaders: [],
      detectedFormat: 'unknown',
      validCount: 0,
      skippedCount: 0,
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rawRows.length < 2) {
    return {
      success: false,
      points: [],
      dataType: '现场实测数据',
      warnings: [],
      errors: ['数据表必须至少包含标题行和一行数据'],
      rawHeaders: [],
      detectedFormat: 'unknown',
      validCount: 0,
      skippedCount: 0,
    };
  }

  // Determine headers
  const headerRow = rawRows[0].map((h: any) => String(h || '').trim().toLowerCase());
  const rawHeaders = rawRows[0].map((h: any) => String(h || '').trim());

  // Check data type: if file name or point_ids match synthetic validation data
  const isSynthetic =
    (fileName && (fileName.includes('合成验证数据') || fileName.includes('模拟测试数据') || fileName.includes('synthetic'))) ||
    rawHeaders.some((h) => h.includes('合成') || h.includes('模拟') || h.includes('synthetic'));

  const dataType: '合成测试数据' | '现场实测数据' = isSynthetic ? '合成测试数据' : '现场实测数据';

  // Find column indices with standard specifications:
  // point_id, section, x_m, y_m, w_measured_m, data_type
  let idIdx = headerRow.findIndex((h) => ['point_id', 'id', '点号', 'point', '测点', '测点编号'].includes(h));
  let xIdx = headerRow.findIndex((h) => ['x_m', 'x', '走向坐标', 'x_coord', '走向(m)', '走向坐标(m)', 'x坐标'].includes(h));
  let yIdx = headerRow.findIndex((h) => ['y_m', 'y', '倾向坐标', 'y_coord', '倾向(m)', '倾向坐标(m)', 'y坐标'].includes(h));
  let sectionIdx = headerRow.findIndex((h) => ['section', '测线类型', '断面', '剖面', 'line', '测线'].includes(h));
  let sIdx = headerRow.findIndex((h) => ['s', '断面位置', '里程', 'distance', 'coord', '位置(m)'].includes(h));
  let wIdx = headerRow.findIndex((h) =>
    ['w_measured_m', 'w_measured', 'w', 'measured', '沉降', '实测下沉', '实测下沉值', '下沉值', '沉降值', 'w_meas', 'w_obs', '下沉量(m)'].includes(h)
  );

  let detectedFormat: '2D' | 'profile' | 'unknown' = 'unknown';

  if (sIdx !== -1 && wIdx !== -1 && (xIdx === -1 || yIdx === -1)) {
    detectedFormat = 'profile';
  } else if (xIdx !== -1 && yIdx !== -1 && wIdx !== -1) {
    detectedFormat = '2D';
  } else if (wIdx !== -1 && (xIdx !== -1 || sIdx !== -1)) {
    detectedFormat = 'profile';
    if (sIdx === -1) sIdx = xIdx;
  } else {
    // Fallback: guess by column count
    if (rawRows[0].length >= 4) {
      if (headerRow.includes('section') || headerRow.includes('s')) {
        detectedFormat = 'profile';
      } else {
        detectedFormat = '2D';
      }
    } else if (rawRows[0].length >= 3) {
      detectedFormat = 'profile';
    }
  }

  // Fallbacks if indices still not found
  if (idIdx === -1) idIdx = 0;
  if (wIdx === -1) wIdx = rawRows[0].length - 1;

  if (detectedFormat === '2D') {
    if (xIdx === -1) xIdx = 1;
    if (yIdx === -1) yIdx = 2;
  } else if (detectedFormat === 'profile') {
    if (sectionIdx === -1 && rawRows[0].length >= 4) sectionIdx = 1;
    if (sIdx === -1) sIdx = sectionIdx !== -1 ? 2 : 1;
  }

  const points: MeasuredPoint[] = [];
  let skippedCount = 0;

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    // Rule: Entirely empty lines MUST NOT be counted towards observations
    if (!row || row.length === 0 || row.every((c: any) => c === undefined || c === null || String(c).trim() === '')) {
      continue; // completely blank line, silently skip and do not count
    }

    const pointIdRaw = row[idIdx] !== undefined ? String(row[idIdx]).trim() : '';
    if (!pointIdRaw) {
      warnings.push(`第 ${r + 1} 行测点编号为空，已跳过`);
      skippedCount++;
      continue;
    }

    const wVal = parseFloat(row[wIdx]);
    if (isNaN(wVal) || !isFinite(wVal)) {
      warnings.push(`第 ${r + 1} 行测点 ${pointIdRaw} 的下沉值不是有效数值，已跳过`);
      skippedCount++;
      continue;
    }

    if (detectedFormat === 'profile') {
      const sectionRaw = sectionIdx !== -1 ? String(row[sectionIdx] || 'strike').toLowerCase().trim() : 'strike';
      const isDip = sectionRaw.includes('dip') || sectionRaw.includes('倾向') || sectionRaw.includes('倾');
      const isOther = sectionRaw.includes('other') || sectionRaw.includes('其他');
      const sectionType = isDip ? 'dip' : isOther ? 'other' : 'strike';

      const sVal = parseFloat(row[sIdx]);
      if (isNaN(sVal) || !isFinite(sVal)) {
        warnings.push(`第 ${r + 1} 行测点 ${pointIdRaw} 的断面位置 s 不是有效数值，已跳过`);
        skippedCount++;
        continue;
      }

      const x = sectionType === 'strike' ? sVal : 0;
      const y = sectionType === 'dip' ? sVal : 0;

      points.push({
        point_id: pointIdRaw,
        section: sectionType,
        s: sVal,
        x,
        y,
        w_measured: wVal,
        dataType,
      });
    } else {
      const xVal = parseFloat(row[xIdx]);
      const yVal = parseFloat(row[yIdx]);

      if (isNaN(xVal) || isNaN(yVal) || !isFinite(xVal) || !isFinite(yVal)) {
        warnings.push(`第 ${r + 1} 行测点 ${pointIdRaw} 的走向/倾向坐标不是有效数值，已跳过`);
        skippedCount++;
        continue;
      }

      const sectionRaw = sectionIdx !== -1 ? String(row[sectionIdx] || '').toLowerCase().trim() : '';
      let section: string = 'other';
      if (sectionRaw.includes('strike') || sectionRaw.includes('走向') || Math.abs(yVal) < 1e-3) {
        section = 'strike';
      } else if (sectionRaw.includes('dip') || sectionRaw.includes('倾向') || Math.abs(xVal) < 1e-3) {
        section = 'dip';
      }

      points.push({
        point_id: pointIdRaw,
        section,
        x: xVal,
        y: yVal,
        w_measured: wVal,
        dataType,
      });
    }
  }

  if (points.length === 0) {
    errors.push('未能从文件中提取出任何有效的观测点数据');
  }

  return {
    success: errors.length === 0 && points.length > 0,
    points,
    dataType,
    warnings,
    errors,
    rawHeaders,
    detectedFormat,
    validCount: points.length,
    skippedCount,
  };
}
