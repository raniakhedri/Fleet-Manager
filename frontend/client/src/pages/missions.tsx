import { useMissions, useUpdateMissionStatus } from "@/hooks/use-missions";
import { useDrivers } from "@/hooks/use-drivers";
import Layout from "@/components/layout";
import UserLayout from "@/components/user-layout";
import { useUser } from "@/hooks/use-user";
import { MissionForm } from "@/components/mission-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, MapPin, Calendar, AlertCircle, CheckCircle2, Clock, XCircle, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

export default function MissionsPage() {
  const { data: missions, isLoading } = useMissions();
  const { data: drivers } = useDrivers();
  const updateStatusMutation = useUpdateMissionStatus();
  const { user, isAdmin } = useUser();
  const { toast } = useToast();
  const previousMissionsCount = useRef<number>(0);
  
  // Find current driver by matching email
  const currentDriver = drivers?.find(d => d.email === user?.email);
  
  // Filter missions: admin sees all, driver sees only theirs
  const displayMissions = isAdmin 
    ? missions 
    : missions?.filter(m => m.driverId === currentDriver?.id);
  
  // Notification system for new missions assigned to driver
  useEffect(() => {
    if (!isAdmin && displayMissions && currentDriver) {
      const currentCount = displayMissions.length;
      
      // Show notification if new mission is added
      if (previousMissionsCount.current > 0 && currentCount > previousMissionsCount.current) {
        const newMissions = currentCount - previousMissionsCount.current;
        toast({
          title: "🎯 Nouvelle Mission Assignée !",
          description: `Vous avez ${newMissions} nouvelle${newMissions > 1 ? 's' : ''} mission${newMissions > 1 ? 's' : ''} assignée${newMissions > 1 ? 's' : ''}.`,
          duration: 5000,
        });
      }
      
      previousMissionsCount.current = currentCount;
    }
  }, [displayMissions, isAdmin, currentDriver, toast]);

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      pending: <Clock className="w-4 h-4" />,
      in_progress: <AlertCircle className="w-4 h-4" />,
      completed: <CheckCircle2 className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />,
    };
    return icons[status];
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-gold-500/15 text-gold-700 hover:bg-gold-500/25",
      in_progress: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25",
      completed: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25",
      cancelled: "bg-rose-500/15 text-rose-700 hover:bg-rose-500/25",
    };
    
    const labels: Record<string, string> = {
      pending: "En attente",
      in_progress: "En cours",
      completed: "Terminée",
      cancelled: "Annulée",
    };
    
    return (
      <Badge className={`border-0 font-medium flex items-center gap-1 ${variants[status] || "bg-slate-100 text-slate-700"}`}>
        {getStatusIcon(status)}
        {labels[status] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      low: "bg-slate-100 text-slate-600",
      normal: "bg-gold-100 text-gold-600",
      high: "bg-orange-100 text-orange-600",
      urgent: "bg-red-100 text-red-600",
    };
    
    const labels: Record<string, string> = {
      low: "Basse",
      normal: "Normale",
      high: "Haute",
      urgent: "Urgente",
    };
    
    return (
      <Badge variant="outline" className={variants[priority] || "bg-slate-100"}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  const LayoutWrapper = isAdmin ? Layout : UserLayout;

  return (
    <LayoutWrapper>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Missions</h1>
          <p className="text-slate-500 mt-2">
            {isAdmin ? "Gérez et suivez toutes les missions." : "Consultez et mettez à jour vos missions assignées."}
          </p>
        </div>
        {isAdmin && (
          <MissionForm trigger={
            <Button>
              <ClipboardList className="w-4 h-4 mr-2" />
              Créer une Mission
            </Button>
          } />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="border-none shadow-md">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))
        ) : missions?.length === 0 ? (
          <Card className="border-none shadow-md col-span-2">
            <CardContent className="py-12 text-center text-slate-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Aucune mission trouvée. {isAdmin ? "Créez votre première mission pour commencer." : "Revenez plus tard pour de nouvelles affectations."}</p>
            </CardContent>
          </Card>
        ) : (
          displayMissions?.map((mission) => (
            <Card key={mission.id} className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{mission.title}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(mission.status)}
                      {mission.priority && getPriorityBadge(mission.priority)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {mission.description && (
                  <p className="text-sm text-slate-600">{mission.description}</p>
                )}
                
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-slate-700">Destination :</div>
                    <div className="text-slate-600">{mission.endLocation}</div>
                  </div>
                </div>

                {mission.scheduledStart && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Prévu : {format(new Date(mission.scheduledStart), "PPp")}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="text-xs text-slate-500">
                    Véhicule #{mission.vehicleId} • Chauffeur #{mission.driverId}
                  </div>
                  {mission.status !== 'completed' && mission.status !== 'cancelled' && (
                    <div className="flex gap-2">
                      {/* Drivers can start their assigned pending missions */}
                      {!isAdmin && mission.status === 'pending' && (
                        <Button 
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => updateStatusMutation.mutate({ id: mission.id, status: 'in_progress' })}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Démarrer
                        </Button>
                      )}
                      {/* Drivers can complete their in-progress missions */}
                      {!isAdmin && mission.status === 'in_progress' && (
                        <Button 
                          size="sm" 
                          variant="default"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => updateStatusMutation.mutate({ id: mission.id, status: 'completed' })}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Terminer
                        </Button>
                      )}
                      {/* Admin can only cancel missions */}
                      {isAdmin && mission.status === 'pending' && (
                        <Button 
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatusMutation.mutate({ id: mission.id, status: 'cancelled' })}
                        >
                          Annuler
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </LayoutWrapper>
  );
}
