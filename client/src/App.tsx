import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useFinancialData } from "@/hooks/useFinancialData";
import Login from "@/pages/login";
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
import CEDettaglioMensilePuntuale2025 from "@/pages/ce-dettaglio-mensile-puntuale-2025";
import CEDettaglioMensileProgressivo2024 from "@/pages/ce-dettaglio-mensile-progressivo-2024";
import CEDettaglioMensilePuntuale2024 from "@/pages/ce-dettaglio-mensile-puntuale-2024";
import CESinteticoMensilePuntuale from "@/pages/ce-sintetico-mensile-puntuale";

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
  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex-1 w-full overflow-auto">
      <div className="sticky top-0 z-50 bg-background border-b px-4 py-3 md:px-6 md:py-4 flex items-center gap-3 md:hidden">
        <SidebarTrigger data-testid="button-sidebar-toggle" className="min-h-[44px] min-w-[44px]" />
        <h1 className="text-lg font-semibold">Awentia Bilanci</h1>
      </div>
      <div className="p-4 md:p-8">
        {isAdmin && <CompanySelector />}
        {!isAdmin && selectedCompany && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Azienda:</span>
              <span className="text-sm">{selectedCompany.name}</span>
            </div>
          </div>
        )}
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/ce-dettaglio" component={CEDettaglio} />
          <Route path="/ce-dettaglio-mensile" component={CEDettaglioMensile} />
          <Route path="/ce-dettaglio-mensile/puntuale-2025" component={CEDettaglioMensilePuntuale2025} />
          <Route path="/ce-dettaglio-mensile/progressivo-2024" component={CEDettaglioMensileProgressivo2024} />
          <Route path="/ce-dettaglio-mensile/puntuale-2024" component={CEDettaglioMensilePuntuale2024} />
          <Route path="/ce-dettaglio-mensile/:mese" component={CEDettaglioMese} />
          <Route path="/ce-sintetico" component={CESintetico} />
          <Route path="/ce-sintetico-mensile" component={CESinteticoMensile} />
          <Route path="/ce-sintetico-mensile/puntuale" component={CESinteticoMensilePuntuale} />
          <Route path="/partitari" component={Partitari} />
          <Route path="/github" component={GitHubSync} />
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
        <WouterRouter base={basePath}>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex min-h-screen w-full bg-background">
              <AppSidebar />
              <main className="flex-1 w-full overflow-auto">
                <div className="sticky top-0 z-50 bg-background border-b px-4 py-3 md:px-6 md:py-4 flex items-center gap-3 md:hidden">
                  <SidebarTrigger data-testid="button-sidebar-toggle" className="min-h-[44px] min-w-[44px]" />
                  <h1 className="text-lg font-semibold">Awentia Bilanci</h1>
                </div>
                <div className="p-4 md:p-8">
                  <Router />
                </div>
              </main>
            </div>
          </SidebarProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
