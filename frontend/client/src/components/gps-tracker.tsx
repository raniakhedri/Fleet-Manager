import { useState, useEffect, useRef, useCallback } from "react";
import { useUpdateGpsPosition } from "@/hooks/use-gps-tracking";
import { useVehicles } from "@/hooks/use-vehicles";
import { useDrivers } from "@/hooks/use-drivers";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Navigation, MapPin, Gauge, Power, Radio, RadioTower, AlertTriangle } from "lucide-react";

/**
 * GPS Tracker panel for drivers.
 * Uses the browser Geolocation API to continuously send the driver's position
 * to the backend, which broadcasts it via WebSocket to operateurs/superadmins.
 */
export function GpsTracker() {
  const { user } = useUser();
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const updateGps = useUpdateGpsPosition();

  const [tracking, setTracking] = useState(false);
  const [engineOn, setEngineOn] = useState(true);
  const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number; speed: number; heading: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendCount, setSendCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);

  // Find the driver and their assigned vehicle
  const currentDriver = drivers?.find((d: any) => d.email === user?.email);
  const assignedVehicle = vehicles?.find((v: any) => v.currentDriverId === currentDriver?.id);

  const sendPosition = useCallback(
    (position: GeolocationPosition) => {
      if (!assignedVehicle) return;

      const data = {
        vehicleId: assignedVehicle.id,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        speed: (position.coords.speed ?? 0) * 3.6, // m/s → km/h
        heading: position.coords.heading ?? 0,
        engineOn,
      };

      setLastPosition({
        lat: data.lat,
        lng: data.lng,
        speed: data.speed,
        heading: data.heading,
      });

      updateGps.mutate(data);
      setSendCount((c) => c + 1);
      setError(null);
    },
    [assignedVehicle, engineOn, updateGps],
  );

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    if (!assignedVehicle) {
      setError("Aucun véhicule ne vous est affecté.");
      return;
    }

    setError(null);
    setTracking(true);

    // Get an immediate position
    navigator.geolocation.getCurrentPosition(sendPosition, (err) => {
      setError(`Erreur GPS : ${err.message}`);
    });

    // Then watch for continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      sendPosition,
      (err) => {
        setError(`Erreur GPS : ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      },
    );
  }, [assignedVehicle, sendPosition]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // If no vehicle is assigned, show a message
  if (!assignedVehicle) {
    return (
      <Card className="border-none shadow-md bg-gradient-to-br from-slate-50 to-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <RadioTower className="w-4 h-4 text-slate-400" />
            Suivi GPS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-500 text-sm py-4">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p>Aucun véhicule ne vous est affecté.</p>
            <p className="text-xs mt-1">Contactez votre opérateur pour qu'il vous assigne un véhicule.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <RadioTower className="w-4 h-4 text-blue-600" />
            Suivi GPS — {assignedVehicle.name}
          </CardTitle>
          <Badge
            className={
              tracking
                ? "bg-emerald-500/15 text-emerald-700 border-0 animate-pulse"
                : "bg-slate-200 text-slate-500 border-0"
            }
          >
            {tracking ? "En cours" : "Arrêté"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle tracking */}
        <div className="flex items-center justify-between">
          <Button
            onClick={tracking ? stopTracking : startTracking}
            className={tracking ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}
          >
            <Radio className="w-4 h-4 mr-2" />
            {tracking ? "Arrêter le suivi" : "Démarrer le suivi"}
          </Button>
          <div className="flex items-center gap-2">
            <Switch
              id="engine-toggle"
              checked={engineOn}
              onCheckedChange={setEngineOn}
            />
            <Label htmlFor="engine-toggle" className="text-xs text-slate-600">
              <Power className="w-3 h-3 inline mr-1" />
              Moteur
            </Label>
          </div>
        </div>

        {/* Position info */}
        {lastPosition && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-red-500" />
              <span>
                {lastPosition.lat.toFixed(5)}, {lastPosition.lng.toFixed(5)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Gauge className="w-4 h-4 text-blue-500" />
              <span>{lastPosition.speed.toFixed(0)} km/h</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Navigation className="w-4 h-4 text-emerald-500" style={{ transform: `rotate(${lastPosition.heading}deg)` }} />
              <span>{lastPosition.heading.toFixed(0)}°</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Radio className="w-4 h-4 text-purple-500" />
              <span>{sendCount} envois</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-xs text-red-500 bg-red-50 p-2 rounded flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
