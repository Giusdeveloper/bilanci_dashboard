/**
 * EditorShell — barra condivisa editor periodo (Sprint 4–5).
 */

import { Link, useLocation } from 'wouter';
import PageHeader from '@/components/PageHeader';
import EditorPeriodLockBanner from '@/components/EditorPeriodLockBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Calculator, HelpCircle, Save, Send } from 'lucide-react';
import { formatCurrency } from '@/data/financialData';
import {
  DRAFT_PREVIEW_KPIS,
  DRAFT_STATUS_LABELS,
} from '@/data/draftEdits';
import { EDITOR_MONTH_LABELS, useEditor } from '@/contexts/EditorContext';
import {
  EDITOR_NAV_ACTIVE_CLASS,
  EDITOR_NAV_INACTIVE_CLASS,
  isEditorNavActive,
} from '@/lib/editorNavStyles';
import { cn } from '@/lib/utils';

const EDITOR_NAV = [
  { href: '/editor/dashboard', label: 'Dashboard' },
  { href: '/editor/ce-dettaglio', label: 'CE Dettaglio' },
  { href: '/editor/ce-dettaglio-mensile', label: 'CE Mensile' },
  { href: '/editor/ledger-balances', label: 'Saldi' },
  { href: '/editor/ledger-mappings', label: 'Mapping' },
  { href: '/editor/bozze', label: 'Bozze' },
  { href: '/editor/import', label: 'Import' },
] as const;

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'published') return 'default';
  if (status === 'draft') return 'secondary';
  if (status === 'rejected') return 'destructive';
  return 'outline';
}

interface EditorShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function EditorShell({ title, subtitle, children }: EditorShellProps) {
  const [location] = useLocation();
  const {
    companyName,
    years,
    months,
    year,
    month,
    setYear,
    setMonth,
    activeDraft,
    periodLockWarnings,
    preview,
    hasPeriodBalances,
    loading,
    saving,
    publishing,
    recalculating,
    modifiedCount,
    mappingModifiedCount,
    manualFactModifiedCount,
    totalModifiedCount,
    handleRecalculate,
    handleSaveDraft,
    handlePublishPeriod,
  } = useEditor();

  const publishBlocked = preview?.publishGate?.blocked ?? false;
  const hasLockWarnings = periodLockWarnings.length > 0;

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500 font-sans">
      <PageHeader
        title={title}
        subtitle={subtitle ?? `Editor periodo — ${companyName}`}
      />

      <div className="flex flex-wrap gap-2 items-center">
        {EDITOR_NAV.map((item) => {
          const isActive = isEditorNavActive(location, item.href);
          return (
            <Button
              key={item.href}
              asChild
              variant="outline"
              size="sm"
              className={cn(isActive ? EDITOR_NAV_ACTIVE_CLASS : EDITOR_NAV_INACTIVE_CLASS)}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          );
        })}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-imm-blue-dark/70 hover:text-imm-blue-dark hover:bg-imm-neutral-mid/60 ml-auto"
        >
          <Link href="/guida" className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            Guida
          </Link>
        </Button>
      </div>

      <EditorPeriodLockBanner warnings={periodLockWarnings} />

      <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-heading text-imm-blue-dark text-lg">Periodo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1 min-w-[120px]">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Anno</Label>
            <Select value={year?.toString() ?? ''} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Anno" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[140px]">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Mese</Label>
            <Select value={month?.toString() ?? ''} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Mese" /></SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={String(m)}>{EDITOR_MONTH_LABELS[m] ?? m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {activeDraft && (
            <Badge variant={statusBadgeVariant(activeDraft.status)}>
              {DRAFT_STATUS_LABELS[activeDraft.status]} — {activeDraft.title ?? activeDraft.id.slice(0, 8)}
            </Badge>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={handleRecalculate}
          disabled={recalculating || loading || !hasPeriodBalances}
        >
          <Calculator className="w-4 h-4 mr-2" />
          {recalculating ? 'Ricalcolo...' : 'Ricalcola'}
        </Button>
        <Button onClick={handleSaveDraft} disabled={saving || loading || totalModifiedCount === 0}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvataggio...' : 'Salva bozza'}
        </Button>
        <Button
          variant="default"
          className="bg-imm-signal-teal hover:bg-imm-signal-teal/90"
          onClick={handlePublishPeriod}
          disabled={
            publishing
            || loading
            || (!activeDraft && totalModifiedCount === 0)
            || publishBlocked
            || hasLockWarnings
          }
        >
          <Send className="w-4 h-4 mr-2" />
          {publishing ? 'Pubblicazione...' : 'Pubblica periodo'}
        </Button>
        {totalModifiedCount > 0 && (
          <span className="text-sm text-imm-blue-dark/60 self-center">
            {modifiedCount > 0 && `${modifiedCount} sald${modifiedCount === 1 ? 'o' : 'i'}`}
            {modifiedCount > 0 && mappingModifiedCount > 0 && ' · '}
            {mappingModifiedCount > 0 && `${mappingModifiedCount} mapping`}
            {manualFactModifiedCount > 0 && `${manualFactModifiedCount > 0 && (modifiedCount > 0 || mappingModifiedCount > 0) ? ' · ' : ''}${manualFactModifiedCount} override CE`}
          </span>
        )}
      </div>

      {preview && (
        <Card className="border-none shadow-lg bg-white/70">
          <CardHeader>
            <CardTitle className="font-heading text-imm-blue-dark text-lg">Anteprima KPI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {DRAFT_PREVIEW_KPIS.map(({ label, key }) => (
                <div key={key}>
                  <div className="text-xs text-imm-blue-dark/60 uppercase font-bold">{label}</div>
                  <div className="text-lg font-bold text-imm-blue-dark">
                    {preview.kpis[key] != null ? formatCurrency(preview.kpis[key]) : '—'}
                  </div>
                </div>
              ))}
            </div>
            {preview.warnings.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-imm-blue-dark/60 uppercase">Avvisi</div>
                {preview.warnings.map((w, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-sm rounded-lg p-2 ${
                      w.severity === 'error'
                        ? 'bg-red-50 text-red-800'
                        : w.severity === 'warning'
                          ? 'bg-amber-50 text-amber-900'
                          : 'bg-imm-neutral-base text-imm-blue-dark/80'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{w.message}</span>
                  </div>
                ))}
              </div>
            )}
            {preview.publishGate?.blocked && (
              <div className="text-sm text-red-800 bg-red-50 rounded-lg p-3">
                Pubblicazione bloccata: quadratura KPI non valida.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {children}
    </div>
  );
}
