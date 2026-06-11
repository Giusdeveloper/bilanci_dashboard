/**
 * EditorLayout — singolo EditorProvider per tutte le route /editor/*.
 */

import { Redirect, Route, Switch } from 'wouter';
import EditorAdminGate from '@/components/EditorAdminGate';
import EditorDashboard from '@/pages/editor/dashboard';
import EditorCEDettaglio from '@/pages/editor/ce-dettaglio';
import EditorCEDettaglioMensile from '@/pages/editor/ce-dettaglio-mensile';
import EditorLedgerBalances from '@/pages/editor/ledger-balances';
import EditorLedgerMappings from '@/pages/editor/ledger-mappings';
import EditorBozze from '@/pages/editor/bozze';
import EditorImport from '@/pages/editor/import';
import EditorPartitari from '@/pages/editor/partitari';

export default function EditorLayout() {
  return (
    <EditorAdminGate title="Editor bilancio">
      <Switch>
        <Route path="/editor/dashboard" component={EditorDashboard} />
        <Route path="/editor/ce-dettaglio" component={EditorCEDettaglio} />
        <Route path="/editor/ce-dettaglio-mensile" component={EditorCEDettaglioMensile} />
        <Route path="/editor/ledger-balances" component={EditorLedgerBalances} />
        <Route path="/editor/ledger-mappings" component={EditorLedgerMappings} />
        <Route path="/editor/partitari" component={EditorPartitari} />
        <Route path="/editor/bozze" component={EditorBozze} />
        <Route path="/editor/import" component={EditorImport} />
        <Route path="/editor">
          <Redirect to="/editor/dashboard" />
        </Route>
      </Switch>
    </EditorAdminGate>
  );
}
