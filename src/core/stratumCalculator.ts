import type { StratumLayer } from '../types.ts';

export type LayerType = '松散层' | '普通岩层' | '主关键层' | '亚关键层' | '煤层';

export interface StratumAnalysisResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  H_l: number;
  H_PKS_u: number;
  H_PKS_d: number;
  coalThickness: number;
  pksLayerIndex: number;
  coalLayerIndex: number;
  layersWithDepth: StratumLayer[];
}

/**
 * Standardize layer type name string
 */
export function normalizeLayerType(rawType: string): LayerType {
  const trimmed = (rawType || '').trim();
  if (trimmed.includes('松散') || trimmed.toLowerCase().includes('loose')) return '松散层';
  if (trimmed.includes('主关键') || trimmed.toUpperCase() === 'PKS') return '主关键层';
  if (trimmed.includes('亚关键') || trimmed.toUpperCase() === 'SKS') return '亚关键层';
  if (trimmed.includes('煤') || trimmed.toLowerCase().includes('coal')) return '煤层';
  return '普通岩层';
}

/**
 * Analyzes the stratigraphic column and calculates H_l, H_PKS-u, H_PKS-d
 *
 * Rules:
 * - H_l: Sum of thicknesses of consecutive top layers marked as "松散层"
 * - H_PKS-u: Bedrock thickness between loose strata bottom and primary key stratum (PKS) top
 * - H_PKS-d: Rock strata thickness between PKS bottom and target coal seam top
 * - Unique PKS requirement: Exactly 1 "主关键层"
 * - Unique Coal seam requirement: Exactly 1 target "煤层"
 * - Order requirement: PKS must be strictly above target coal seam
 */
export function calculateOverburdenFromStrata(
  strata: Array<{
    layerNo?: number;
    lithology: string;
    thickness: number;
    layerType?: string;
    notes?: string;
  }>
): StratumAnalysisResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Filter out completely empty or invalid rows
  const validRows = strata.filter((row) => {
    return row && (row.lithology?.trim() || !isNaN(row.thickness) || row.layerType?.trim());
  });

  if (validRows.length === 0) {
    return {
      valid: false,
      errors: ['地层表为空，请至少录入一层地层数据'],
      warnings: [],
      H_l: 0,
      H_PKS_u: 0,
      H_PKS_d: 0,
      coalThickness: 0,
      pksLayerIndex: -1,
      coalLayerIndex: -1,
      layersWithDepth: [],
    };
  }

  // 2. Validate thicknesses and count PKS / Coal
  const pksIndices: number[] = [];
  const coalIndices: number[] = [];
  const normalizedLayers: StratumLayer[] = [];

  let cumulative = 0;

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    const thickness = Number(row.thickness);

    if (isNaN(thickness) || thickness <= 0) {
      errors.push(`第 ${i + 1} 层 (${row.lithology || '未命名前地层'}) 厚度无效或 ≤ 0: ${row.thickness}`);
    }

    const type = normalizeLayerType(row.layerType || '普通岩层');
    cumulative += isNaN(thickness) || thickness < 0 ? 0 : thickness;

    if (type === '主关键层') {
      pksIndices.push(i);
    } else if (type === '煤层') {
      coalIndices.push(i);
    }

    normalizedLayers.push({
      layerNo: i + 1,
      lithology: (row.lithology || `岩层_${i + 1}`).trim(),
      thickness: isNaN(thickness) ? 0 : thickness,
      cumulativeDepth: cumulative,
      keyStratumType: type === '主关键层' ? 'PKS' : type === '亚关键层' ? 'SKS' : 'normal',
      layerType: type,
      notes: row.notes || '',
    });
  }

  // 3. Check PKS count
  if (pksIndices.length === 0) {
    errors.push('地层表中未指定“主关键层”，必须且仅能指定 1 个主关键层');
  } else if (pksIndices.length > 1) {
    errors.push(`地层表中检测到 ${pksIndices.length} 个“主关键层”（第 ${pksIndices.map((x) => x + 1).join('、')} 层），模型仅允许 1 个唯一主关键层`);
  }

  // 4. Check Coal seam count
  if (coalIndices.length === 0) {
    errors.push('地层表中未指定目标“煤层”，必须且仅能指定 1 个目标煤层');
  } else if (coalIndices.length > 1) {
    errors.push(`地层表中检测到 ${coalIndices.length} 个目标“煤层”（第 ${coalIndices.map((x) => x + 1).join('、')} 层），请仅保留 1 个开采煤层`);
  }

  const pksIdx = pksIndices.length === 1 ? pksIndices[0] : -1;
  const coalIdx = coalIndices.length === 1 ? coalIndices[0] : -1;

  if (pksIdx !== -1 && coalIdx !== -1 && pksIdx >= coalIdx) {
    errors.push(`主关键层 (第 ${pksIdx + 1} 层) 必须位于目标煤层 (第 ${coalIdx + 1} 层) 上方`);
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      H_l: 0,
      H_PKS_u: 0,
      H_PKS_d: 0,
      coalThickness: coalIdx !== -1 ? normalizedLayers[coalIdx].thickness : 0,
      pksLayerIndex: pksIdx,
      coalLayerIndex: coalIdx,
      layersWithDepth: normalizedLayers,
    };
  }

  // 5. Calculate H_l: Sum of thicknesses of consecutive top layers marked as "松散层"
  let H_l = 0;
  let topLooseCount = 0;
  for (let i = 0; i < normalizedLayers.length; i++) {
    if (normalizedLayers[i].layerType === '松散层') {
      H_l += normalizedLayers[i].thickness;
      topLooseCount++;
    } else {
      break; // stop at first non-loose layer
    }
  }

  if (H_l <= 0) {
    warnings.push('地层表顶部未识别到“松散层”，松散层厚度 H_l 计为 0m');
  }

  // Check if there are non-consecutive loose layers deeper down
  for (let i = topLooseCount; i < normalizedLayers.length; i++) {
    if (normalizedLayers[i].layerType === '松散层') {
      warnings.push(`第 ${i + 1} 层标记为“松散层”，但位于基岩层之下，未计入顶部松散层 H_l`);
    }
  }

  // 6. Calculate H_PKS_u: Bedrock thickness between bottom of loose layer and top of PKS
  let H_PKS_u = 0;
  for (let i = topLooseCount; i < pksIdx; i++) {
    H_PKS_u += normalizedLayers[i].thickness;
  }

  if (H_PKS_u <= 0) {
    errors.push('主关键层上方基岩厚度 H_PKS-u 计算值为 0，主关键层不能紧贴松散层顶界面');
  }

  // 7. Calculate H_PKS_d: Thickness between bottom of PKS and top of Coal seam
  let H_PKS_d = 0;
  for (let i = pksIdx + 1; i < coalIdx; i++) {
    H_PKS_d += normalizedLayers[i].thickness;
  }

  if (H_PKS_d <= 0) {
    errors.push('主关键层下界面至煤层顶板距离 H_PKS-d 计算值为 0，主关键层不能直接紧贴煤层');
  }

  const coalThickness = normalizedLayers[coalIdx].thickness;

  // Round results to 3 decimals to avoid floating point artifacts
  H_l = Math.round(H_l * 1000) / 1000;
  H_PKS_u = Math.round(H_PKS_u * 1000) / 1000;
  H_PKS_d = Math.round(H_PKS_d * 1000) / 1000;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    H_l,
    H_PKS_u,
    H_PKS_d,
    coalThickness,
    pksLayerIndex: pksIdx,
    coalLayerIndex: coalIdx,
    layersWithDepth: normalizedLayers,
  };
}

export const calculateStratumInputs = calculateOverburdenFromStrata;

