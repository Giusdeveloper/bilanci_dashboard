/**
 * Registro audit — consultazione azioni sensibili (Sprint 6).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { Shield, RefreshCw } from 'lucide-react';
import {
  auditActionLabel,
  fetchAuditLog,
  type AuditLogEntry,
} from '@/data/auditLog';
import { EDITOR_MONTH_LABELS } from '@/contexts/EditorContext';

const ALL = '__all__';

export default function SettingsAuditPage() {
  const { isAdmin, isEditorStaff } = useAuth();
  const { companies } = useFinancialData();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState<string>(ALL);
  const [action, setAction] = useState<string>(ALL);
  const [periodYear, setPeriodYear] = useState<string>('');
  const [periodMonth, setPeriodMonth] = useState<string>(ALL);
  const [userFilter, setUserFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuditLog({
        companyId: companyId !== ALL ? companyId : undefined,
        action: action !== ALL ? action : undefined,
        periodYear: periodYear ? Number(periodYear) : undefined,
        periodMonth: periodMonth !== ALL ? Number(periodMonth) : undefined,
      });
      setEntries(data);
    } catch (err) {
      setError((err as Error).message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, action, periodYear, periodMonth]);

  useEffect(() => {
    if (isEditorStaff) void load();
  }, [isEditorStaff, load]);

  const actionOptions = useMemo(() => {
    const set = new Set(entries.map((e) => e.action));
    return Array.from(set).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (!userFilter.trim()) return entries;
    const q = userFilter.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (e.actorEmail?.toLowerCase().includes(q) ?? false)
        || (e.actorId?.toLowerCase().includes(q) ?? false),
    );
  }, [entries, userFilter]);

  const tableData = useMemo(
    () =>
      filteredEntries.map((e) => ({
        createdAt: new Date(e.createdAt).toLocaleString('it-IT'),
        company: e.companyName ?? '—',
        period:
          e.periodYear != null
            ? `${e.periodMonth != null ? `${EDITOR_MONTH_LABELS[e.periodMonth] ?? e.periodMonth} ` : ''}${e.periodYear}`
            : '—',
        action: auditActionLabel(e.action),
        user: e.actorEmail ?? e.actorId ?? '—',
        entity: e.entityType ? `${e.entityType}${e.entityId ? ` · ${e.entityId.slice(0, 8)}` : ''}` : '—',
      })),
    [filteredEntries],
  );

  if (!isEditorStaff) {
    return (
      <div className="flex items-center justify-center h-[60vh] p-6">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold font-heading text-imm-blue-dark">Accesso negato</h2>
          <p className="text-muted-foreground">Il registro audit è riservato al personale operativo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500 font-sans">
      <PageHeader
        title="Registro audit"
        subtitle="Trail append-only di import, publish e modifiche sensibili"
      />

      <Card className="border-none shadow-lg bg-white/60">
        <CardContent className="pt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Azienda</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Tutte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutte</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Azione</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue placeholder="Tutte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutte</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>{auditActionLabel(a)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Anno</Label>
            <Input
              type="number"
              placeholder="es. 2025"
              value={periodYear}
              onChange={(e) => setPeriodYear(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Mese</Label>
            <Select value={periodMonth} onValueChange={setPeriodMonth}>
              <SelectTrigger><SelectValue placeholder="Tutti" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutti</SelectItem>
                {EDITOR_MONTH_LABELS.slice(1).map((label, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Utente (email)</Label>
            <Input
              placeholder="Filtra per email..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => void load()} disabled={loading} className="w-full">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <Card><CardContent className="p-8 text-center text-imm-blue-dark/60">Caricamento...</CardContent></Card>
      ) : (
        <DataTable
          title="Eventi audit"
          columns={[
            { key: 'createdAt', label: 'Data/ora' },
            { key: 'company', label: 'Azienda' },
            { key: 'period', label: 'Periodo' },
            { key: 'action', label: 'Azione' },
            { key: 'user', label: 'Utente' },
            { key: 'entity', label: 'Entità' },
          ]}
          data={tableData}
        />
      )}

      {!loading && !error && filteredEntries.length === 0 && (
        <p className="text-sm text-imm-blue-dark/60 text-center">Nessun evento corrisponde ai filtri selezionati.</p>
      )}

      {!isAdmin && (
        <p className="text-xs text-imm-blue-dark/50">
          Accesso in modalità amministrazione: sola consultazione del registro audit.
        </p>
      )}
    </div>
  );
}
