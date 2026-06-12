import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Home, FileText, Calendar, TrendingUp, BarChart3, BookOpen, LogOut, Upload, Settings, Link2, Pencil, HelpCircle, ScrollText } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import immentLogo from "@assets/Imment - logo - web_Orizzontale - colori - chiaro.png";
import { EDITOR_SIDEBAR_ACTIVE_CLASS } from "@/lib/editorNavStyles";
import { cn } from "@/lib/utils";

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

const adminEditorItem = {
  title: "Editor bilancio",
  icon: Pencil,
  url: "/editor/dashboard",
  editorHub: true as const,
};

const adminAmministrazioneItems = [
  { title: "Saldi contabili", icon: BookOpen, url: "/ledger-balances" },
  { title: "Mapping conti", icon: Link2, url: "/ledger-mappings" },
  { title: "Registro audit", icon: ScrollText, url: "/settings/audit" },
];

const adminUtilityItems = [
  { title: "Guida utilizzo", icon: HelpCircle, url: "/guida" },
  { title: "Impostazioni", icon: Settings, url: "/settings" },
];

/** Match route attiva; hub editor attivo su tutto /editor/*. */
function isNavActive(
  location: string,
  url: string,
  options?: { editorHub?: boolean },
): boolean {
  if (options?.editorHub) {
    return location === url || location.startsWith("/editor/");
  }
  return location === url;
}

function renderAdminNavItem(
  item: { title: string; icon: typeof Pencil; url: string; editorHub?: boolean },
  location: string,
  editorStyle?: boolean,
) {
  return (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        asChild
        isActive={isNavActive(location, item.url, { editorHub: item.editorHub })}
        className={cn(
          "text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 mb-1 rounded-lg text-[14px] font-sans transition-all",
          editorStyle
            ? EDITOR_SIDEBAR_ACTIVE_CLASS
            : "data-[active=true]:bg-white/15 data-[active=true]:text-white data-[active=true]:font-semibold",
        )}
        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <Link href={item.url} className="flex items-center gap-3">
          <item.icon className="w-5 h-5 opacity-70 group-hover:opacity-100" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, signOut, isAdmin, isEditorStaff } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      setLocation('/');
      window.location.reload();
    } catch (error) {
      console.error('Errore durante il logout:', error);
      setLocation('/');
      window.location.reload();
    }
  };

  return (
    <Sidebar
      className="border-none group-data-[collapsible=icon]:w-16"
      collapsible="icon"
      style={{
        background: "var(--imm-trust-blue-dark)",
        backgroundColor: "var(--imm-trust-blue-dark)",
        boxShadow: "4px 0 12px rgba(14, 45, 84, 0.2)",
      }}
    >
      <SidebarHeader className="px-6 py-8 pb-10 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
        <div className="flex items-start justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
          <div className="group-data-[collapsible=icon]:hidden">
            {/* Imment Logo SVG Inline (Risorsa 135 - Light) */}
            <svg id="Livello_2" data-name="Livello 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 325.98 73.75" className="w-36 h-auto">
              <g id="Livello_1-2" data-name="Livello 1">
                <g>
                  <g>
                    <path style={{fill: '#f3f6f9'}} d="M98.45,18.44h7.27v36.36h-7.27V18.44Z"/>
                    <path style={{fill: '#f3f6f9'}} d="M151.01,54.79v-27.68l-13.56,28.2h-2.6l-13.56-28.2v27.68h-7.27l.05-36.36h10.65l11.43,23.74,11.43-23.74h10.65l.05,36.36h-7.27Z"/>
                    <path style={{fill: '#f3f6f9'}} d="M203.57,54.79v-27.68l-13.56,28.2h-2.6l-13.56-28.2v27.68h-7.27l.05-36.36h10.65l11.43,23.74,11.43-23.74h10.65l.05,36.36h-7.27Z"/>
                    <path style={{fill: '#f3f6f9'}} d="M226.42,25.08v7.01h19.06v6.54h-19.06v9.5h20.31v6.65h-27.58V18.44h27.58v6.65h-20.31Z"/>
                    <path style={{fill: '#f3f6f9'}} d="M286.98,18.44v36.88h-2.6l-22.85-27.11v26.59h-7.27V18.44h8.52l16.93,20.46v-20.46h7.27Z"/>
                    <path style={{fill: '#f3f6f9'}} d="M325.98,25.19h-13.4v29.6h-7.27v-29.6h-13.4v-6.75h34.07v6.75Z"/>
                  </g>
                  <path style={{fill: '#f3f6f9'}} d="M54.26,15.25h-16.9c-1.71,0-3.17-1.09-3.72-2.61l-3.33-9.89c-.51-1.59-2.01-2.75-3.77-2.75-.13,0-.26,0-.38.02C11.45,1.6,0,14.05,0,29.18c0,16.2,13.13,29.33,29.33,29.33h16.91c1.74,0,3.22,1.13,3.75,2.69l3.34,9.92c.55,1.54,2.01,2.63,3.73,2.63.15,0,.3,0,.45-.02,14.67-1.62,26.07-14.05,26.07-29.15,0-16.2-13.13-29.33-29.33-29.33ZM54.26,58.51h-2.33c-1.71,0-3.17-1.08-3.72-2.6l-1.59-4.73c-1.55-4.69-5.97-8.07-11.18-8.07h-6.11c-7.69,0-13.93-6.24-13.93-13.93s6.24-13.93,13.93-13.93h2.34c1.76,0,3.25,1.14,3.76,2.73l1.57,4.66c1.61,4.66,6.03,8.01,11.23,8.01h0s6.02,0,6.02,0c7.69,0,13.93,6.24,13.93,13.93s-6.24,13.93-13.93,13.93Z"/>
                </g>
              </g>
            </svg>
            <div className="text-[10px] text-white/60 font-medium tracking-widest uppercase mt-4 font-heading" data-testid="text-sidebar-subtitle">
              Startup Capital Engine
            </div>
            {user && (
              <div className="text-xs text-white/50 mt-4 font-sans">
                {user.email || user.user_metadata?.email || 'Utente'}
                {isAdmin && (
                  <div className="text-[10px] text-imm-yellow font-bold mt-1 tracking-tighter">
                    ADMINISTRATOR
                  </div>
                )}
              </div>
            )}
          </div>
          <SidebarTrigger className="text-white hover:text-white hover:bg-white/10 rounded-md p-4 h-12 w-12 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10" data-testid="button-sidebar-close" />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isNavActive(location, item.url)}
                    className="text-white/80 hover:text-white hover:bg-white/10 data-[active=true]:bg-white/15 data-[active=true]:text-white data-[active=true]:font-semibold px-4 py-3 mb-1 rounded-lg text-[14px] font-sans transition-all"
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 opacity-70 group-hover:opacity-100" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {isEditorStaff && (
                <>
                  <SidebarGroupLabel className="text-white/40 text-[11px] uppercase tracking-wider px-4 mt-4 mb-1">
                    Amministrazione
                  </SidebarGroupLabel>
                  {adminAmministrazioneItems.map((item) =>
                    renderAdminNavItem(item, location),
                  )}
                  {renderAdminNavItem(adminEditorItem, location, true)}
                  {adminUtilityItems.map((item) =>
                    renderAdminNavItem(item, location),
                  )}
                </>
              )}
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
                  className="text-white/60 hover:text-white hover:bg-white/10 px-4 py-3 mb-1 rounded-lg text-[14px] font-sans transition-all"
                  data-testid="button-logout"
                >
                  <LogOut className="w-5 h-5 opacity-50" />
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
