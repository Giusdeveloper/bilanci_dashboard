import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { FinancialDataProvider, useFinancialData } from "@/contexts/FinancialDataContext";
import Login from "@/pages/login";
import "@/utils/checkSupabaseData"; // Carica la funzione di verifica
import "@/utils/loadFinancialDataToSupabase"; // Carica la funzione di caricamento dati
import "@/utils/checkSherpa42Data"; // Carica la funzione di diagnostica Sherpa42
import "@/utils/diagnoseSherpa42"; // Carica la funzione di diagnostica rapida Sherpa42
import "@/utils/testSherpa42Load"; // Carica la funzione di test rapido Sherpa42
import "@/utils/inspectSherpa42Data"; // Carica la funzione di ispezione dati Sherpa42
import "@/utils/debugDashboardFlow"; // Carica la funzione di debug completo flusso
import "@/utils/compareCompanies"; // Carica la funzione di confronto Awentia vs Sherpa42
import CompanySelector from "@/components/CompanySelector";
import Dashboard from "@/pages/dashboard";
import CEDettaglio from "@/pages/ce-dettaglio";
import CEDettaglioMensile from "@/pages/ce-dettaglio-mensile";
import CEDettaglioMese from "@/pages/ce-dettaglio-mese";
import CESintetico from "@/pages/ce-sintetico";
import CESinteticoMensile from "@/pages/ce-sintetico-mensile";
import Partitari from "@/pages/partitari";
import GitHubSync from "@/pages/github-sync";
import NotFound from "@/pages/not-found";
import ImportData from "@/pages/import-data"; // Nuova pagina import
import SourcePage from "@/pages/source"; // Nuova pagina source

function Router() {
  const { user, loading, isAdmin } = useAuth();
  const { selectedCompany } = useFinancialData();

  // Mostra loading durante il caricamento dell'autenticazione
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se non è autenticato, mostra la pagina di login
  // NOTA: Se Supabase non è disponibile, l'app funziona in modalità offline
  // e user sarà null. In questo caso, bypassiamo il login per permettere
  // l'uso della dashboard senza autenticazione.
  // Considera Supabase disponibile se l'URL è configurato (anche se è il default)
  const isSupabaseAvailable = !!import.meta.env.VITE_SUPABASE_URL;

  // Se Supabase è configurato e l'utente non è autenticato, mostra il login
  if (!user && isSupabaseAvailable) {
    return <Login />;
  }

  // Se Supabase non è disponibile, usa un utente mock per permettere l'uso dell'app
  const effectiveUser = user || (isSupabaseAvailable ? null : { email: 'offline@local', role: 'admin' } as any);
  const effectiveIsAdmin = isAdmin || !isSupabaseAvailable;

  return (
    <div className="flex-1 w-full overflow-auto">
      <div className="sticky top-0 z-50 bg-background border-b px-4 py-3 md:px-6 md:py-4 flex items-center gap-3 md:hidden">
        <SidebarTrigger data-testid="button-sidebar-toggle" className="min-h-[44px] min-w-[44px]" />
        <h1 className="text-lg font-semibold">Awentia Bilanci</h1>
      </div>
      <div className="p-4 md:p-8">
        {effectiveIsAdmin && <CompanySelector />}
        {!effectiveIsAdmin && selectedCompany && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Azienda:</span>
              <span className="text-sm">{selectedCompany.name}</span>
            </div>
          </div>
        )}
        {!isSupabaseAvailable && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                ⚠️ Modalità offline: Supabase non disponibile. L'app funziona senza autenticazione.
              </span>
            </div>
          </div>
        )}
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/ce-dettaglio" component={CEDettaglio} />
          <Route path="/ce-dettaglio-mensile" component={CEDettaglioMensile} />
          <Route path="/ce-dettaglio-mensile/:mese" component={CEDettaglioMese} />
          <Route path="/ce-sintetico" component={CESintetico} />
          <Route path="/ce-sintetico-mensile" component={CESinteticoMensile} />
          <Route path="/partitari" component={Partitari} />
          <Route path="/source" component={SourcePage} />
          <Route path="/github" component={GitHubSync} />
          <Route path="/import" component={ImportData} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  // Base path per GitHub Pages - Vite fornisce automaticamente BASE_URL
  const basePath = import.meta.env.BASE_URL || "/bilanci_dashboard/";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FinancialDataProvider>
          <WouterRouter base={basePath}>
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex min-h-screen w-full bg-background">
                <AppSidebar />
                <main className="flex-1 w-full overflow-auto">
                  <Router />
                </main>
              </div>
            </SidebarProvider>
          </WouterRouter>
        </FinancialDataProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
