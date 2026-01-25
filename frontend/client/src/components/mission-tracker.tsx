import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Square, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Map as MapIcon
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom icons
const startIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background: #22c55e; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const endIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Driver position icon is integrated into startIcon for simplicity

// Tunisia cities coordinates lookup
const cityCoordinates: Record<string, [number, number]> = {
  "tunis": [36.8065, 10.1815],
  "sfax": [34.7406, 10.7603],
  "sousse": [35.8254, 10.6084],
  "kairouan": [35.6781, 10.0963],
  "bizerte": [37.2744, 9.8739],
  "gabès": [33.8815, 10.0982],
  "gabes": [33.8815, 10.0982],
  "ariana": [36.8625, 10.1956],
  "gafsa": [34.4250, 8.7842],
  "monastir": [35.7643, 10.8113],
  "ben arous": [36.7533, 10.2189],
  "kasserine": [35.1676, 8.8365],
  "médenine": [33.3549, 10.5055],
  "medenine": [33.3549, 10.5055],
  "nabeul": [36.4513, 10.7357],
  "tataouine": [32.9297, 10.4518],
  "béja": [36.7256, 9.1817],
  "beja": [36.7256, 9.1817],
  "jendouba": [36.5011, 8.7803],
  "mahdia": [35.5047, 11.0622],
  "siliana": [36.0849, 9.3708],
  "le kef": [36.1826, 8.7148],
  "kef": [36.1826, 8.7148],
  "tozeur": [33.9197, 8.1339],
  "hammamet": [36.4000, 10.6167],
  "djerba": [33.8076, 10.8451],
  "zaghouan": [36.4029, 10.1429],
  "kébili": [33.7050, 8.9650],
  "kebili": [33.7050, 8.9650],
};

// Geocode a location name to coordinates
async function geocodeLocation(locationName: string): Promise<[number, number] | null> {
  const normalizedName = locationName.toLowerCase().trim();
  
  // Check local lookup first
  if (cityCoordinates[normalizedName]) {
    return cityCoordinates[normalizedName];
  }
  
  // Try Nominatim API for Tunisia
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}, Tunisia&limit=1`
    );
    const data = await response.json();
    if (data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
  
  return null;
}

// Component to fit map bounds
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

// Component to follow driver position
function FollowDriver({ position, shouldFollow }: { position: [number, number] | null; shouldFollow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (position && shouldFollow) {
      map.setView(position, 14, { animate: true });
    }
  }, [position, shouldFollow, map]);
  return null;
}

interface Mission {
  id: number;
  title: string;
  description: string | null;
  endLocation: string;
  status: string;
  priority: string;
  vehicleId: number;
  driverId: number;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
}

interface MissionTrackerProps {
  mission: Mission;
  onStart: () => void;
  onComplete: () => void;
  isUpdating?: boolean;
}

export function MissionTracker({ mission, onStart, onComplete, isUpdating }: MissionTrackerProps) {
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
  const [driverPosition, setDriverPosition] = useState<[number, number] | null>(null);
  const [initialPosition, setInitialPosition] = useState<[number, number] | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [traveledPath, setTraveledPath] = useState<[number, number][]>([]);
  const [isLoadingCoords, setIsLoadingCoords] = useState(true);
  const [followDriver, setFollowDriver] = useState(true);
  
  const watchIdRef = useRef<number | null>(null);

  // Get driver's current position on mount and geocode destination
  useEffect(() => {
    async function loadCoordinates() {
      setIsLoadingCoords(true);
      
      // Get destination coordinates
      const end = await geocodeLocation(mission.endLocation);
      setEndCoords(end);
      
      // Get driver's current position as starting point
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const currentPos: [number, number] = [position.coords.latitude, position.coords.longitude];
            setInitialPosition(currentPos);
            setDriverPosition(currentPos);
            
            // Create route path from current position to destination
            if (end) {
              setRoutePath([currentPos, end]);
            }
            setIsLoadingCoords(false);
          },
          (error) => {
            console.error("Error getting initial position:", error);
            // Default to center of Tunisia if geolocation fails
            const defaultPos: [number, number] = [34.0, 9.5];
            setInitialPosition(defaultPos);
            if (end) {
              setRoutePath([defaultPos, end]);
            }
            setIsLoadingCoords(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        setIsLoadingCoords(false);
      }
    }
    loadCoordinates();
  }, [mission.endLocation]);

  // Start GPS tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setTrackingError("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }

    setIsTracking(true);
    setTrackingError(null);
    setTraveledPath([]);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPos: [number, number] = [position.coords.latitude, position.coords.longitude];
        setDriverPosition(newPos);
        setTraveledPath(prev => [...prev, newPos]);
        
        // Here you could send the position to the backend
        // sendPositionToBackend(mission.id, newPos);
      },
      (error) => {
        console.error("Geolocation error:", error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setTrackingError("Permission de localisation refusée. Veuillez l'autoriser dans votre navigateur.");
            break;
          case error.POSITION_UNAVAILABLE:
            setTrackingError("Position non disponible. Vérifiez votre GPS.");
            break;
          case error.TIMEOUT:
            setTrackingError("Délai d'attente dépassé pour la localisation.");
            break;
          default:
            setTrackingError("Erreur de géolocalisation.");
        }
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [mission.id]);

  // Stop GPS tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Handle mission start
  const handleStart = () => {
    startTracking();
    onStart();
  };

  // Handle mission complete
  const handleComplete = () => {
    stopTracking();
    onComplete();
  };

  // Calculate map bounds
  const mapBounds = initialPosition && endCoords 
    ? L.latLngBounds([initialPosition, endCoords])
    : null;

  const isInProgress = mission.status === "in_progress";
  const isPending = mission.status === "pending";

  return (
    <Card className="overflow-hidden shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <MapIcon className="w-5 h-5" />
              {mission.title}
            </CardTitle>
            <p className="text-indigo-100 text-sm mt-1">{mission.description}</p>
          </div>
          <Badge className={
            isInProgress ? "bg-amber-500 text-white" : 
            isPending ? "bg-blue-400 text-white" : 
            "bg-emerald-500 text-white"
          }>
            {isInProgress ? "En cours" : isPending ? "En attente" : "Terminée"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Map */}
        <div className="h-[400px] relative">
          {isLoadingCoords ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="text-sm text-slate-600 mt-2">Chargement de la carte...</p>
              </div>
            </div>
          ) : !endCoords ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm text-slate-600 mt-2">Impossible de localiser la destination</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={initialPosition || [34.0, 9.5]}
              zoom={10}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <FitBounds bounds={mapBounds} />
              <FollowDriver position={driverPosition} shouldFollow={followDriver && isTracking} />

              {/* Route line */}
              <Polyline
                positions={routePath}
                color="#6366f1"
                weight={4}
                opacity={0.6}
                dashArray="10, 10"
              />

              {/* Traveled path */}
              {traveledPath.length > 1 && (
                <Polyline
                  positions={traveledPath}
                  color="#22c55e"
                  weight={4}
                  opacity={0.9}
                />
              )}

              {/* End marker (destination) */}
              <Marker position={endCoords} icon={endIcon}>
                <Popup>
                  <strong>🏁 Destination</strong><br />
                  {mission.endLocation}
                </Popup>
              </Marker>

              {/* Driver marker (current position - green) */}
              {driverPosition && (
                <Marker position={driverPosition} icon={startIcon}>
                  <Popup>
                    <strong>📍 Votre position</strong><br />
                    Lat: {driverPosition[0].toFixed(5)}<br />
                    Lng: {driverPosition[1].toFixed(5)}
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          )}

          {/* Tracking indicator */}
          {isTracking && (
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 z-[1000]">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">GPS Actif</span>
            </div>
          )}

          {/* Follow toggle */}
          {isTracking && (
            <Button
              size="sm"
              variant={followDriver ? "default" : "outline"}
              className="absolute bottom-4 right-4 z-[1000]"
              onClick={() => setFollowDriver(!followDriver)}
            >
              <Navigation className="w-4 h-4 mr-1" />
              {followDriver ? "Suivi actif" : "Centrer"}
            </Button>
          )}
        </div>

        {/* Location info */}
        <div className="p-4 bg-slate-50 border-t">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-medium">DESTINATION</p>
              <p className="text-base font-medium text-slate-700">{mission.endLocation}</p>
            </div>
          </div>
          {driverPosition && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span>Position actuelle: {driverPosition[0].toFixed(4)}, {driverPosition[1].toFixed(4)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {trackingError && (
          <div className="p-4 bg-red-50 border-t border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">{trackingError}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="p-4 border-t">
          {isPending && (
            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6"
              onClick={handleStart}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              Démarrer la Mission
            </Button>
          )}

          {isInProgress && (
            <div className="space-y-3">
              {!isTracking && (
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={startTracking}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Activer le GPS
                </Button>
              )}
              
              {isTracking && (
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={stopTracking}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Arrêter le suivi GPS
                </Button>
              )}

              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6"
                onClick={handleComplete}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                )}
                Terminer la Mission
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Pulse animation for driver marker */}
      <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          70% {
            box-shadow: 0 0 0 15px rgba(59, 130, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }
      `}</style>
    </Card>
  );
}
