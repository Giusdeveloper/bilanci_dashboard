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
import { Home, FileText, Calendar, TrendingUp, BarChart3, PanelLeftClose } from "lucide-react";
import { useLocation } from "wouter";
import awentiaLogo from "@assets/awentia-logo-standard_1760537986689.png";

const menuItems = [
  { title: "Dashboard", icon: Home, url: "/" },
  { title: "CE Dettaglio", icon: FileText, url: "/ce-dettaglio" },
  { title: "CE Dettaglio Mensile", icon: Calendar, url: "/ce-dettaglio-mensile" },
  { title: "CE Sintetico", icon: TrendingUp, url: "/ce-sintetico" },
  { title: "CE Sintetico Mensile", icon: BarChart3, url: "/ce-sintetico-mensile" },
];

export default function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar 
      className="border-none [&>div]:!bg-gradient-to-b [&>div]:!from-indigo-500 [&>div]:!to-indigo-600 group-data-[collapsible=icon]:w-16"
      collapsible="icon"
      style={{
        background: "linear-gradient(180deg, #6366f1 0%, #4f46e5 100%) !important",
        boxShadow: "4px 0 12px rgba(0,0,0,0.1)",
      }}
    >
      <SidebarHeader className="px-6 py-6 pb-8 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
        <div className="flex items-start justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
          <div className="group-data-[collapsible=icon]:hidden">
            <img 
              src={awentiaLogo} 
              alt="Awentia Logo" 
              className="w-40 h-auto brightness-0 invert"
              data-testid="img-sidebar-logo"
            />
            <div className="text-sm text-white/80 font-medium mt-3" data-testid="text-sidebar-subtitle">
              Dashboard Bilanci 2025
            </div>
          </div>
          <SidebarTrigger className="text-white/80 hover:text-white hover:bg-white/10 rounded-md p-4 h-12 w-12 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10" data-testid="button-sidebar-close" />
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
                    className="text-white/90 hover:text-white hover:bg-white/10 data-[active=true]:bg-white/15 data-[active=true]:text-white data-[active=true]:font-semibold data-[active=true]:border-l-[3px] data-[active=true]:border-l-white px-4 py-3.5 mb-2 rounded-[10px] text-[15px]"
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <a href={item.url} className="flex items-center gap-3">
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
