import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { 
  ShieldCheck,
  ClipboardList,
  User,
  LogOut,
  Menu,
  X,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/Fleet-Manager/login";
  };

  const navItems = [
    { href: "/dashboard", label: "Accueil", icon: Home },
    { href: "/missions", label: "Mes Missions", icon: ClipboardList },
    { href: "/profile", label: "Profil", icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Navbar - Similar to Landing Page */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-slate-900">FleetGuard</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "gap-2 rounded-full px-5",
                      isActive 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* User Info & Logout - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                <span className="font-bold text-primary text-sm">{user?.firstName?.[0] || "U"}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500">Chauffeur</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2 rounded-full border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 shadow-lg">
            <div className="px-4 py-4 space-y-2">
              {/* User Info - Mobile */}
              <div className="flex items-center gap-3 pb-4 mb-2 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                  <span className="font-bold text-primary">{user?.firstName?.[0] || "U"}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500">Chauffeur</p>
                </div>
              </div>

              {/* Nav Items - Mobile */}
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                        isActive 
                          ? "bg-primary text-white" 
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}

              {/* Logout - Mobile */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 w-full text-left mt-2"
              >
                <LogOut className="w-5 h-5" />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content - Vertical Flow */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500 slide-in-from-bottom-4">
          {children}
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <ShieldCheck className="w-5 h-5 text-white" />
            <span className="font-display font-bold text-white">FleetGuard</span>
          </div>
          <p className="text-sm">© 2026 FleetGuard Inc. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
