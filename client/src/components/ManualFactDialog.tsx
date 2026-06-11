/**
 * ManualFactDialog — override CE mirato (Sprint 6 manual_fact).
 */

import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/data/financialData';

export interface ManualFactDialogTarget {
  categoryCode: string;
  voce: string;
  publishedAmount: number | null;
  currentAmount: number | null;
}

interface ManualFactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ManualFactDialogTarget | null;
  onSave: (value: number, motivazione: string) => void;
  onClear?: () => void;
}

export default function ManualFactDialog({
  open,
  onOpenChange,
  target,
  onSave,
  onClear,
}: ManualFactDialogProps) {
  const [value, setValue] = useState('');
  const [motivazione, setMotivazione] = useState('');

  useEffect(() => {
    if (!target) return;
    const base = target.currentAmount ?? target.publishedAmount;
    setValue(base != null ? String(base) : '');
    setMotivazione('');
  }, [target]);

  const parsed = Number(value.replace(',', '.'));
  const canSave = target && Number.isFinite(parsed) && motivazione.trim().length >= 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override CE manuale</DialogTitle>
          <DialogDescription>
            {target ? (
              <>
                Voce <strong>{target.voce}</strong> ({target.categoryCode}) — override del progressivo
                YTD in anteprima. Richiede motivazione per l&apos;audit trail.
              </>
            ) : (
              'Seleziona una voce foglia CE.'
            )}
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-4 py-2">
            <div className="text-sm text-imm-blue-dark/70">
              Pubblicato:{' '}
              <span className="font-mono font-medium">
                {target.publishedAmount != null ? formatCurrency(target.publishedAmount) : '—'}
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-fact-value">Nuovo importo progressivo</Label>
              <Input
                id="manual-fact-value"
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-fact-motivazione">Motivazione</Label>
              <Textarea
                id="manual-fact-motivazione"
                placeholder="Es. rettifica concordata con cliente, nota di rettifica..."
                value={motivazione}
                onChange={(e) => setMotivazione(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {onClear && target && (
            <Button type="button" variant="ghost" onClick={onClear}>
              Rimuovi override
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => {
              if (!target || !canSave) return;
              onSave(parsed, motivazione.trim());
              onOpenChange(false);
            }}
          >
            Applica override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
