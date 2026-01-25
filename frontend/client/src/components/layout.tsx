import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { 
  LayoutDashboard, 
  Map, 
  Car, 
  Settings, 
  LogOut, 
  Menu,
  ShieldCheck,
  Shield,
  Users,
  UserCircle,
  ClipboardList,
  BarChart3,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLocation as useWouterLocation } from "wouter";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useWouterLocation();
  const { user, isAdmin } = useUser();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/Fleet-Manager/login";
  };

  const navItems = [
    { href: "/dashboard", label: "Tableau de Bord", icon: LayoutDashboard },
    ...(isAdmin ? [
      { href: "/map", label: "Carte en Direct", icon: Map },
      { href: "/vehicles", label: "Flotte", icon: Car },
      { href: "/drivers", label: "Chauffeurs", icon: UserCircle },
      { href: "/missions", label: "Missions", icon: ClipboardList },
      { href: "/reports", label: "Rapports", icon: BarChart3 },
      { href: "/settings", label: "Paramètres Admin", icon: Settings }
    ] : [
      { href: "/missions", label: "Mes Missions", icon: ClipboardList },
      { href: "/profile", label: "Mon Profil", icon: User },
    ]),
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">FleetGuard</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 font-semibold" 
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )} onClick={() => setIsMobileOpen(false)}>
              <item.icon className={cn(
                "w-5 h-5 transition-transform group-hover:scale-110",
                isActive ? "text-primary-foreground" : "text-slate-500 group-hover:text-white"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="User" className="w-10 h-10 rounded-full border-2 border-slate-700" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700">
              <span className="font-bold text-slate-400">{user?.firstName?.[0] || user?.username?.[0]?.toUpperCase() || "U"}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName} {user?.lastName || user?.username}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            {isAdmin && (
              <Badge variant="default" className="mt-1 text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 z-50">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" className="md:hidden fixed top-4 left-4 z-50 p-2">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-slate-900 border-r-slate-800">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
          {children}
        </div>
      </main>
    </div>
  );
}
