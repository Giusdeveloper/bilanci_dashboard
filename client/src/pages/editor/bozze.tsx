/**
 * Editor — Elenco bozze e riapertura periodo (Sprint 5.5).
 */

import { Link } from 'wouter';
import EditorShell from '@/components/EditorShell';
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
import { DRAFT_STATUS_LABELS } from '@/data/draftEdits';
import { EDITOR_MONTH_LABELS, useEditor } from '@/contexts/EditorContext';

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'published') return 'default';
  if (status === 'draft') return 'secondary';
  if (status === 'rejected') return 'destructive';
  return 'outline';
}

export default function EditorBozzePage() {
  const { recentDrafts, loadDraftFromList, activeDraft } = useEditor();

  return (
    <EditorShell title="Bozze" subtitle="Elenco bozze per azienda — riapri un periodo in editing">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="font-heading text-imm-blue-dark text-lg">Tutte le bozze</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentDrafts.length === 0 ? (
            <div className="p-6 text-sm text-imm-blue-dark/60">Nessuna bozza per questa azienda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-imm-neutral-base">
                  <TableHead>Titolo</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Aggiornata</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDrafts.map((d) => (
                  <TableRow key={d.id} className={activeDraft?.id === d.id ? 'bg-imm-signal-teal/5' : undefined}>
                    <TableCell>{d.title ?? '—'}</TableCell>
                    <TableCell>
                      {d.month != null ? `${EDITOR_MONTH_LABELS[d.month]} ${d.year}` : d.year}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(d.status)}>
                        {DRAFT_STATUS_LABELS[d.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-imm-blue-dark/60">
                      {new Date(d.updatedAt).toLocaleString('it-IT')}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {(d.status === 'draft' || d.status === 'pending_review') && (
                        <Button variant="ghost" size="sm" onClick={() => loadDraftFromList(d)}>
                          Riapri periodo
                        </Button>
                      )}
                      {d.status === 'draft' && (
                        <Link href="/editor/ledger-balances">
                          <Button variant="outline" size="sm">Modifica</Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </EditorShell>
  );
}
