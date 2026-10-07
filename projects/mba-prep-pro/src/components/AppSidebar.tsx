import { 
  Home, 
  School, 
  FileText, 
  BarChart3, 
  Mic,
  BookOpen,
  LogOut,
  Settings,
  LifeBuoy
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "School Selection", url: "/schools", icon: School },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Mock Interview", url: "/mock-interview", icon: Mic },
  { title: "Practice Reports", url: "/reports", icon: BarChart3 },
  { title: "Support", url: "/support", icon: LifeBuoy },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { signOut } = useAuth();

  const isActive = (path: string) => currentPath === path;
  const isExpanded = navigationItems.some((item) => isActive(item.url));
  
  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  return (
    <Sidebar
      className={`border-r ${state === "collapsed" ? "w-14" : "w-64"}`}
      collapsible="icon"
    >
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-primary" />
            {state !== "collapsed" && (
              <span className="text-lg font-bold text-foreground">
                MBA Prep Pro
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup className="flex-1">
          {state !== "collapsed" && (
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          )}
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={getNavClass}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {state !== "collapsed" && (
                        <span className="ml-3">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Section */}
        <div className="p-4 border-t mt-auto">
          {state !== "collapsed" ? (
            <SidebarMenuButton 
              onClick={signOut}
              className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className="ml-3">Sign Out</span>
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton 
              onClick={signOut}
              className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
              size="sm"
            >
              <LogOut className="h-5 w-5" />
            </SidebarMenuButton>
          )}
        </div>

        {/* Footer trigger for collapsed state */}
        {state === "collapsed" && (
          <div className="p-2 border-t">
            <SidebarTrigger className="w-full" />
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}