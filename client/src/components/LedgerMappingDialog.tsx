import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  fetchAnaliticaSuggestions,
  fetchMasterAccounts,
  resolveMasterAccountId,
  upsertLedgerMapping,
  type LedgerMappingRow,
  type MasterAccountOption,
  type LedgerMappingInput,
} from '@/data/ledgerMappings';

export interface LedgerMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  famigliaOptions?: string[];
  initial?: Partial<LedgerMappingRow> & { accountCode?: string; accountDescription?: string | null };
  onSaved?: (row: LedgerMappingRow) => void;
  /** database = upsert diretto; draft = delega al chiamante (editor bozza). */
  persistMode?: 'database' | 'draft';
  onDraftPersist?: (input: LedgerMappingInput) => void;
}

const EMPTY_MASTER = '__none__';
const EMPTY_FAMIGLIA = '__none__';

export default function LedgerMappingDialog({
  open,
  onOpenChange,
  companyId,
  famigliaOptions = [],
  initial,
  onSaved,
  persistMode = 'database',
  onDraftPersist,
}: LedgerMappingDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [masterAccounts, setMasterAccounts] = useState<MasterAccountOption[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [accountCode, setAccountCode] = useState('');
  const [accountDescription, setAccountDescription] = useState('');
  const [famiglia, setFamiglia] = useState('');
  const [analiticaLabel, setAnaliticaLabel] = useState('');
  const [masterAccountId, setMasterAccountId] = useState<string | null>(null);
  const [signMultiplier, setSignMultiplier] = useState('1');
  const [existingId, setExistingId] = useState<string | undefined>();

  const isEdit = persistMode === 'draft'
    ? Boolean(initial?.accountCode?.trim())
    : Boolean(existingId);

  useEffect(() => {
    if (!open || !companyId) return;
    Promise.all([fetchMasterAccounts(), fetchAnaliticaSuggestions(companyId)])
      .then(([masters, labels]) => {
        setMasterAccounts(masters);
        setSuggestions(labels);
      })
      .catch((err) => {
        toast({
          title: 'Errore caricamento dati',
          description: (err as Error).message,
          variant: 'destructive',
        });
      });
  }, [open, companyId, toast]);

  useEffect(() => {
    if (!open) return;
    setExistingId(initial?.id);
    setAccountCode(initial?.accountCode ?? '');
    setAccountDescription(initial?.accountDescription ?? '');
    setFamiglia(initial?.famiglia ?? '');
    setAnaliticaLabel(initial?.analiticaLabel ?? '');
    setMasterAccountId(initial?.masterAccountId ?? null);
    setSignMultiplier(String(initial?.signMultiplier ?? 1));
  }, [open, initial]);

  const filteredSuggestions = useMemo(() => {
    const q = analiticaLabel.trim().toLowerCase();
    if (!q) return suggestions.slice(0, 20);
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 20);
  }, [analiticaLabel, suggestions]);

  const handleAnaliticaBlur = async () => {
    if (!analiticaLabel.trim() || masterAccountId || masterAccounts.length === 0) return;
    try {
      const resolved = await resolveMasterAccountId(companyId, analiticaLabel, masterAccounts);
      if (resolved) setMasterAccountId(resolved);
    } catch {
      // suggerimento opzionale
    }
  };

  const handleSave = async () => {
    if (!accountCode.trim() || !analiticaLabel.trim()) {
      toast({
        title: 'Campi obbligatori',
        description: 'Codice conto e voce analitica sono richiesti.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const input: LedgerMappingInput = {
        id: existingId,
        companyId,
        accountCode: accountCode.trim(),
        accountDescription: accountDescription.trim() || null,
        famiglia: famiglia.trim() || null,
        analiticaLabel: analiticaLabel.trim(),
        masterAccountId,
        signMultiplier: Number(signMultiplier),
        sourceSheet: persistMode === 'draft' ? 'Editor' : 'manual',
      };

      if (persistMode === 'draft') {
        onDraftPersist?.(input);
        toast({ title: isEdit ? 'Mapping aggiornato in bozza' : 'Mapping aggiunto in bozza' });
        onOpenChange(false);
        return;
      }

      const row = await upsertLedgerMapping(input);
      toast({ title: isEdit ? 'Mapping aggiornato' : 'Mapping creato' });
      onSaved?.(row);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Errore salvataggio',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-imm-blue-dark">
            {isEdit ? 'Modifica mapping conto' : 'Nuovo mapping conto'}
          </DialogTitle>
          <DialogDescription>
            Collega un conto contabile del bilancino a una voce analitica del CE.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Codice conto</Label>
            <Input
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
              placeholder="es. 66/05/724"
              disabled={isEdit}
              className="font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Descrizione conto</Label>
            <Input
              value={accountDescription}
              onChange={(e) => setAccountDescription(e.target.value)}
              placeholder="Descrizione dal bilancino"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Famiglia</Label>
            {famigliaOptions.length > 0 ? (
              <Select
                value={famiglia || EMPTY_FAMIGLIA}
                onValueChange={(v) => setFamiglia(v === EMPTY_FAMIGLIA ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona famiglia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_FAMIGLIA}>— Nessuna —</SelectItem>
                  {famigliaOptions.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={famiglia}
                onChange={(e) => setFamiglia(e.target.value)}
                placeholder="Configura famiglie in DB"
              />
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Voce analitica CE</Label>
            <Input
              value={analiticaLabel}
              onChange={(e) => setAnaliticaLabel(e.target.value)}
              onBlur={handleAnaliticaBlur}
              placeholder="es. Consulenze tecniche"
              list="analitica-suggestions"
            />
            <datalist id="analitica-suggestions">
              {filteredSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <p className="text-xs text-imm-blue-dark/50">
              Suggerimenti da mapping CE esistenti e piano dei conti master.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Voce master</Label>
            <Select
              value={masterAccountId ?? EMPTY_MASTER}
              onValueChange={(v) => setMasterAccountId(v === EMPTY_MASTER ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona voce master" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value={EMPTY_MASTER}>— Nessuna / risoluzione automatica —</SelectItem>
                {masterAccounts.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label} ({m.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Moltiplicatore segno</Label>
            <Select value={signMultiplier} onValueChange={setSignMultiplier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 (costi / default)</SelectItem>
                <SelectItem value="-1">-1 (ricavi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-imm-yellow text-imm-blue-dark hover:bg-imm-yellow-dark"
          >
            {saving ? 'Salvataggio...' : 'Salva mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
