import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Home, FileText, Calendar, TrendingUp, BarChart3, PanelLeftClose, BookOpen, LogOut, Upload } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import immentLogo from "@assets/Imment - logo - web_Orizzontale - colori - chiaro.png";

const menuItems = [
  { title: "Dashboard", icon: Home, url: "/" },
  { title: "Source", icon: FileText, url: "/source" },
  { title: "CE Dettaglio", icon: FileText, url: "/ce-dettaglio" },
  { title: "CE Dettaglio Mensile", icon: Calendar, url: "/ce-dettaglio-mensile" },
  { title: "CE Sintetico", icon: TrendingUp, url: "/ce-sintetico" },
  { title: "CE Sintetico Mensile", icon: BarChart3, url: "/ce-sintetico-mensile" },
  { title: "Partitari", icon: BookOpen, url: "/partitari" },
  { title: "Importa Dati", icon: Upload, url: "/import" },
];

export default function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, signOut, isAdmin } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      // Reindirizza alla pagina di login dopo il logout
      setLocation('/');
      // Forza un reload per assicurarsi che lo stato venga aggiornato
      window.location.reload();
    } catch (error) {
      console.error('Errore durante il logout:', error);
      // Anche in caso di errore, reindirizza
      setLocation('/');
      window.location.reload();
    }
  };

  return (
    <Sidebar
      className="border-none group-data-[collapsible=icon]:w-16"
      collapsible="icon"
      style={{
        background: "linear-gradient(180deg, #335C96 0%, #17334F 100%)",
        backgroundColor: "#335C96",
        boxShadow: "4px 0 12px rgba(23, 51, 79, 0.2)",
      }}
    >
      <SidebarHeader className="px-6 py-6 pb-8 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
        <div className="flex items-start justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
          <div className="group-data-[collapsible=icon]:hidden">
            <img
              src={immentLogo}
              alt="Imment Logo"
              className="w-40 h-auto"
              data-testid="img-sidebar-logo"
            />
            <div className="text-sm text-white/95 font-medium mt-3" data-testid="text-sidebar-subtitle">
              Dashboard Bilanci 2025
            </div>
            {user && (
              <div className="text-xs text-white/80 mt-2">
                {user.email || user.user_metadata?.email || 'Utente'}
                {isAdmin && (
                  <div className="text-xs text-yellow-300 font-semibold mt-1">
                    ADMIN
                  </div>
                )}
              </div>
            )}
          </div>
          <SidebarTrigger className="text-white hover:text-white hover:bg-white/20 rounded-md p-4 h-12 w-12 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10" data-testid="button-sidebar-close" />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="text-white hover:text-white hover:bg-white/20 data-[active=true]:bg-white/25 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:border-l-[3px] data-[active=true]:border-l-white px-4 py-3.5 mb-2 rounded-[10px] text-[15px]"
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="text-white hover:text-white hover:bg-white/20 px-4 py-3.5 mb-2 rounded-[10px] text-[15px]"
                  data-testid="button-logout"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
