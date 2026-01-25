import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Map, Smartphone, BarChart3, ArrowRight, Download, Check } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export default function LandingPage() {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-slate-900">FleetGuard</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* PWA Install Button */}
            {isInstalled ? (
              <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 bg-emerald-50" disabled>
                <Check className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Installée</span>
              </Button>
            ) : isInstallable ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={installApp}
                className="text-primary border-primary/30 hover:bg-primary/10"
              >
                <Download className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Installer l'App</span>
                <span className="sm:hidden">App</span>
              </Button>
            ) : null}
            
            <Link href="/login">
              <Button>Connexion</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-display font-bold text-slate-900 mb-6 tracking-tight">
            Gestion de Flotte Intelligente <br />
            <span className="text-primary">Plus simple que jamais.</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            Suivez vos véhicules, gérez vos chauffeurs et optimisez vos itinéraires avec notre solution GPS de nouvelle génération.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                Commencer Maintenant <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
          
          {/* Abstract Dashboard Preview */}
          <div className="mt-20 mx-auto max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 p-4 rotate-1 hover:rotate-0 transition-transform duration-500">
             {/* Use an Unsplash placeholder here, but styled nicely */}
             <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100">
                {/* Descriptive comment for Unsplash URL: abstract map dashboard ui technology */}
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070" 
                  alt="Aperçu du Tableau de Bord" 
                  className="object-cover w-full h-full opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
             </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Map className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">GPS en Temps Réel</h3>
              <p className="text-slate-600">Suivez chaque véhicule de votre flotte avec des mises à jour en direct et l'historique des trajets.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Analyses de Flotte</h3>
              <p className="text-slate-600">Surveillez la consommation de carburant, le kilométrage et les performances des chauffeurs en un coup d'œil.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Compatible Mobile</h3>
              <p className="text-slate-600">Gérez votre flotte depuis n'importe où avec notre tableau de bord entièrement responsive.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <ShieldCheck className="w-6 h-6 text-white" />
            <span className="font-display font-bold text-white text-xl">FleetGuard</span>
          </div>
          <p>© 2024 FleetGuard Inc. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
