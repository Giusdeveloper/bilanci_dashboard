// Retro-compatibilità: la logica di mapping è stata estratta in un modulo PURO
// condiviso (`shared/domain/labelMapping`). Qui ri-esportiamo per non rompere
// gli import esistenti, senza duplicare il dizionario.
export { EXCEL_ROW_MAP, getCanonicalKey } from '../../../shared/domain/labelMapping';

export interface CEDettaglioData {
    progressivo2025: Record<string, number>;
    progressivo2024: Record<string, number>;
}

export interface CEDettaglioMensileData {
    progressivo2025: Record<string, number[] | string[]>;
}

export interface CESinteticoData {
    progressivo2025: Record<string, number>;
    progressivo2024: Record<string, number>;
}

export interface CESinteticoMensileData {
    progressivo2025: Record<string, number[] | string[]>;
}
