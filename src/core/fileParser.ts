import * as XLSX from 'xlsx';
import { MeasuredPoint } from '../types.ts';

export interface ParseResult {
  success: boolean;
  points: MeasuredPoint[];
  dataType: '合成验证数据' | '现场实测数据';
  warnings: string[];
  errors: string[];
  rawHeaders: string[];
  detectedFormat: '2D' | 'profile' | 'unknown';
}

/**
 * Parses CSV or XLSX file and extracts MeasuredPoint[]
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
    };
  }

  // Determine headers
  const headerRow = rawRows[0].map((h: any) => String(h || '').trim().toLowerCase());
  const rawHeaders = rawRows[0].map((h: any) => String(h || '').trim());

  // Check data type: if file name or point_ids match synthetic validation data
  const isSynthetic =
    (fileName && fileName.includes('合成验证数据')) ||
    (fileName && fileName.includes('synthetic')) ||
    rawHeaders.some((h) => h.includes('合成') || h.includes('synthetic'));

  const dataType: '合成验证数据' | '现场实测数据' = isSynthetic ? '合成验证数据' : '现场实测数据';

  // Find column indices
  let idIdx = headerRow.findIndex((h) => ['point_id', 'id', '点号', 'point', '测点'].includes(h));
  let xIdx = headerRow.findIndex((h) => ['x', '走向坐标', 'x_coord', '走向(m)'].includes(h));
  let yIdx = headerRow.findIndex((h) => ['y', '倾向坐标', 'y_coord', '倾向(m)'].includes(h));
  let sectionIdx = headerRow.findIndex((h) => ['section', '断面', '剖面', 'line'].includes(h));
  let sIdx = headerRow.findIndex((h) => ['s', '断面位置', '里程', 'distance', 'coord'].includes(h));
  let wIdx = headerRow.findIndex((h) =>
    ['w_measured', 'w', 'measured', '沉降', '实测下沉', '下沉值', '沉降值', 'w_meas', 'w_obs'].includes(h)
  );

  let detectedFormat: '2D' | 'profile' | 'unknown' = 'unknown';

  if (sIdx !== -1 && wIdx !== -1) {
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

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0 || row.every((c: any) => c === undefined || c === null || c === '')) {
      continue; // skip empty rows
    }

    const pointId = String(row[idIdx] !== undefined ? row[idIdx] : `PT${r}`).trim();
    const wVal = parseFloat(row[wIdx]);

    if (isNaN(wVal)) {
      warnings.push(`第 ${r + 1} 行测点 ${pointId} 的下沉值不是有效数字，已跳过该行`);
      continue;
    }

    if (detectedFormat === 'profile') {
      const sectionRaw = sectionIdx !== -1 ? String(row[sectionIdx] || 'strike').toLowerCase().trim() : 'strike';
      const isDip = sectionRaw.includes('dip') || sectionRaw.includes('倾向') || sectionRaw.includes('倾');
      const sectionType: 'strike' | 'dip' = isDip ? 'dip' : 'strike';

      const sVal = parseFloat(row[sIdx]);
      if (isNaN(sVal)) {
        warnings.push(`第 ${r + 1} 行测点 ${pointId} 的断面位置 s 不是有效数字，已跳过该行`);
        continue;
      }

      const x = sectionType === 'strike' ? sVal : 0;
      const y = sectionType === 'dip' ? sVal : 0;

      points.push({
        point_id: pointId,
        section: sectionType,
        s: sVal,
        x,
        y,
        w_measured: wVal,
      });
    } else {
      const xVal = parseFloat(row[xIdx]);
      const yVal = parseFloat(row[yIdx]);

      if (isNaN(xVal) || isNaN(yVal)) {
        warnings.push(`第 ${r + 1} 行测点 ${pointId} 的坐标 (x, y) 不是有效数字，已跳过该行`);
        continue;
      }

      points.push({
        point_id: pointId,
        x: xVal,
        y: yVal,
        w_measured: wVal,
      });
    }
  }

  if (points.length === 0) {
    errors.push('未能从文件中提取出任何有效的观测点数据');
  }

  return {
    success: errors.length === 0,
    points,
    dataType,
    warnings,
    errors,
    rawHeaders,
    detectedFormat,
  };
}
