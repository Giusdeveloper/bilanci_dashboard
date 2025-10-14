import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import Dashboard from "@/pages/dashboard";
import Source from "@/pages/source";
import CEDettaglio from "@/pages/ce-dettaglio";
import CEDettaglioMensile from "@/pages/ce-dettaglio-mensile";
import CESintetico from "@/pages/ce-sintetico";
import CESinteticoMensile from "@/pages/ce-sintetico-mensile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/source" component={Source} />
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
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <main className="flex-1 p-8 overflow-auto">
              <Router />
            </main>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
