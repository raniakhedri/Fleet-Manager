import { Router as WouterRouter, Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import LogoutPage from "@/pages/logout";
import Dashboard from "@/pages/dashboard";
import DriverDashboard from "@/pages/driver-dashboard";
import VehiclesPage from "@/pages/vehicles";
import LiveMapPage from "@/pages/live-map";
import VehicleDetailsPage from "@/pages/vehicle-details";
import DriversPage from "@/pages/drivers";
import MissionsPage from "@/pages/missions";
import ReportsPage from "@/pages/reports";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ 
  component: Component, 
  adminOnly = false 
}: { 
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  
  if (!token) {
    return <LoginPage />;
  }

  // Check user role
  if (userStr) {
    const user = JSON.parse(userStr);
    const isDriver = user.role === "driver" || user.role === "user";
    
    // Block drivers from accessing admin-only pages
    if (adminOnly && isDriver) {
      return <DriverDashboard />;
    }
    
    // Redirect drivers accessing dashboard to driver dashboard
    if (isDriver && Component === Dashboard) {
      return <DriverDashboard />;
    }
  }

  return <Component />;
}

function AppRouter() {
  const base = import.meta.env.PROD ? '/Fleet-ManagerAhmed' : '';
  return (
    <WouterRouter base={base}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/logout" component={LogoutPage} />
        <Route path="/api/logout" component={LogoutPage} />
        <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} adminOnly={true} />} />
        <Route path="/map" component={() => <ProtectedRoute component={LiveMapPage} adminOnly={true} />} />
        <Route path="/vehicles" component={() => <ProtectedRoute component={VehiclesPage} adminOnly={true} />} />
        <Route path="/vehicles/:id" component={() => <ProtectedRoute component={VehicleDetailsPage} adminOnly={true} />} />
        <Route path="/drivers" component={() => <ProtectedRoute component={DriversPage} adminOnly={true} />} />
        <Route path="/missions" component={() => <ProtectedRoute component={MissionsPage} />} />
        <Route path="/reports" component={() => <ProtectedRoute component={ReportsPage} adminOnly={true} />} />
        <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
