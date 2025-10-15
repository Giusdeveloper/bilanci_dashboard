import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import Dashboard from "@/pages/dashboard";
import CEDettaglio from "@/pages/ce-dettaglio";
import CEDettaglioMensile from "@/pages/ce-dettaglio-mensile";
import CESintetico from "@/pages/ce-sintetico";
import CESinteticoMensile from "@/pages/ce-sintetico-mensile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/ce-dettaglio" component={CEDettaglio} />
      <Route path="/ce-dettaglio-mensile" component={CEDettaglioMensile} />
      <Route path="/ce-sintetico" component={CESintetico} />
      <Route path="/ce-sintetico-mensile" component={CESinteticoMensile} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties} defaultOpen={false}>
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <main className="flex-1 w-full overflow-auto">
              <div className="sticky top-0 z-50 bg-background border-b px-4 py-3 md:px-6 md:py-4 flex items-center gap-3">
                <SidebarTrigger data-testid="button-sidebar-toggle" className="md:hidden min-h-[44px] min-w-[44px]" />
                <h1 className="text-lg font-semibold md:hidden">Awentia Bilanci</h1>
              </div>
              <div className="p-4 md:p-8">
                <Router />
              </div>
            </main>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
