/**
 * Barrel del core ETL bilanci. Punto di import unico per script e Edge Function.
 */
export * from './types.ts';
export * from './workbook.ts';
export * from './profiles.ts';
export * from './detect.ts';
export * from './extract.ts';
export * from './mapping.ts';
export * from './validate.ts';
export * from './pipeline.ts';
export * from './extractBilancino.ts';
export * from './pipelineBilancino.ts';
export * from './ledgerMappingStubs.ts';
export * from './bilancinoRollup.ts';
export * from './ceProfiles/index.ts';
export * from './bilancinoPublishGate.ts';
export * from './recalculatePreview.ts';
export * from './loadPlan.ts';
export * from './hash.ts';
export { buildMasterChart } from './seed/masterChart.ts';
export type { MasterAccountSeed } from './seed/masterChart.ts';
export {
  GENERIC_MAPPINGS,
  SHERPA42_SPECIFIC_MAPPINGS,
  mappingsForCompany,
} from './seed/accountMappings.ts';
