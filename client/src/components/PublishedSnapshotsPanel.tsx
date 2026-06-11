/**
 * PublishedSnapshotsPanel — elenco versioni pubblicate e rollback (Sprint 7.3).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useEditor } from '@/contexts/EditorContext';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { EDITOR_MONTH_LABELS } from '@/contexts/EditorContext';
import {
  fetchPublishedSnapshots,
  rollbackToSnapshot,
  type PublishedSnapshot,
} from '@/data/publishedSnapshots';
import { History } from 'lucide-react';

export default function PublishedSnapshotsPanel() {
  const { selectedCompany } = useFinancialData();
  const { year, month, reloadPeriod } = useEditor();
  const { toast } = useToast();
  const [snapshots, setSnapshots] = useState<PublishedSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [confirmSnapshot, setConfirmSnapshot] = useState<PublishedSnapshot | null>(null);

  const loadSnapshots = useCallback(async () => {
    if (!selectedCompany || year == null || month == null) {
      setSnapshots([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchPublishedSnapshots(selectedCompany.id, year, month);
      setSnapshots(rows);
    } catch (err) {
      toast({
        title: 'Errore caricamento versioni',
        description: (err as Error).message,
        variant: 'destructive',
      });
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, year, month, toast]);

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  const handleRollback = async () => {
    if (!confirmSnapshot) return;
    setRollingBack(true);
    try {
      const result = await rollbackToSnapshot(confirmSnapshot.id);
      toast({
        title: 'Versione ripristinata',
        description: `Ripristinata v${result.version}: ${result.facts_restored} facts, ${result.layout_restored} righe layout.`,
      });
      setConfirmSnapshot(null);
      await loadSnapshots();
      await reloadPeriod();
    } catch (err) {
      toast({
        title: 'Errore rollback',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setRollingBack(false);
    }
  };

  if (year == null || month == null) {
    return null;
  }

  return (
    <>
      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-center gap-2">
          <History className="w-5 h-5 text-imm-blue-dark/70" />
          <CardTitle className="font-heading text-imm-blue-dark text-lg">
            Versioni pubblicate — {EDITOR_MONTH_LABELS[month]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-imm-blue-dark/60">Caricamento versioni...</div>
          ) : snapshots.length === 0 ? (
            <div className="p-6 text-sm text-imm-blue-dark/60">
              Nessuno snapshot per questo periodo. Gli snapshot vengono creati ad ogni «Pubblica periodo».
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-imm-neutral-base">
                  <TableHead>Versione</TableHead>
                  <TableHead>Pubblicata il</TableHead>
                  <TableHead>Hash facts</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((snap, idx) => (
                  <TableRow key={snap.id}>
                    <TableCell>
                      <Badge variant={idx === 0 ? 'default' : 'outline'}>v{snap.version}</Badge>
                      {idx === 0 && <span className="ml-2 text-xs text-muted-foreground">(corrente)</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(snap.publishedAt).toLocaleString('it-IT')}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{snap.factsHash}</TableCell>
                    <TableCell className="text-right">
                      {idx > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmSnapshot(snap)}
                        >
                          Ripristina versione
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmSnapshot != null} onOpenChange={(open) => !open && setConfirmSnapshot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ripristinare la versione v{confirmSnapshot?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              Verranno sovrascritti i financial_facts e il report_layout del periodo{' '}
              {month != null ? EDITOR_MONTH_LABELS[month] : ''} {year} con i dati dello snapshot selezionato.
              L&apos;operazione viene registrata nell&apos;audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rollingBack}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRollback()} disabled={rollingBack}>
              {rollingBack ? 'Ripristino...' : 'Conferma ripristino'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
