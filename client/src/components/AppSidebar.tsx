import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Home, FileText, Calendar, TrendingUp, BarChart3, Database } from "lucide-react";
import { useLocation } from "wouter";

const menuItems = [
  { title: "Dashboard", icon: Home, url: "/" },
  { title: "Source", icon: Database, url: "/source" },
  { title: "CE Dettaglio", icon: FileText, url: "/ce-dettaglio" },
  { title: "CE Dettaglio Mensile", icon: Calendar, url: "/ce-dettaglio-mensile" },
  { title: "CE Sintetico", icon: TrendingUp, url: "/ce-sintetico" },
  { title: "CE Sintetico Mensile", icon: BarChart3, url: "/ce-sintetico-mensile" },
];

export default function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar 
      className="border-r" 
      style={{
        background: "linear-gradient(180deg, hsl(var(--primary)) 0%, #4f46e5 100%)",
      }}
    >
      <SidebarHeader className="p-6">
        <div className="text-2xl font-extrabold text-white mb-1" data-testid="text-sidebar-logo">
          📊 Dashboard Bilanci
        </div>
        <div className="text-sm text-white/80" data-testid="text-sidebar-company">
          Awentia Srl
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    className="text-white/90 hover:text-white hover:bg-white/10 data-[active=true]:bg-white/15 data-[active=true]:text-white data-[active=true]:font-semibold"
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <a href={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
