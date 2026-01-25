import { useState } from "react";
import { useDrivers, useUpdateDriver } from "@/hooks/use-drivers";
import { useUser } from "@/hooks/use-user";
import UserLayout from "@/components/user-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Camera, Mail, Phone, CreditCard, Calendar, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ProfilePage() {
  const { data: drivers } = useDrivers();
  const { user } = useUser();
  const { toast } = useToast();
  const updateMutation = useUpdateDriver();
  
  // Find current driver
  const currentDriver = drivers?.find(d => d.email === user?.email);
  
  const [isEditing, setIsEditing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(currentDriver?.phoneNumber || "");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentDriver) return;
    
    try {
      await updateMutation.mutateAsync({
        id: currentDriver.id,
        phoneNumber: phoneNumber,
      });
      
      toast({
        title: "Succès",
        description: "Profil mis à jour avec succès",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Échec de la mise à jour du profil",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-emerald-500/15 text-emerald-700 border-0",
      inactive: "bg-slate-500/15 text-slate-700 border-0",
      on_leave: "bg-amber-500/15 text-amber-700 border-0",
    };
    
    const labels: Record<string, string> = {
      active: "Actif",
      inactive: "Inactif",
      on_leave: "En congé",
    };
    
    return (
      <Badge className={variants[status] || "bg-slate-100 text-slate-700 border-0"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (!currentDriver) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-slate-500">Chargement du profil...</p>
        </div>
      </UserLayout>
    );
  }

  const initials = `${currentDriver.firstName[0]}${currentDriver.lastName[0]}`.toUpperCase();

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Mon Profil</h1>
          <p className="text-slate-500 mt-2">Gérez vos informations personnelles et paramètres</p>
        </div>

        {/* Profile Card */}
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                    <AvatarImage src={profileImage || undefined} alt={currentDriver.firstName} />
                    <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="profile-image" 
                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                    <input 
                      id="profile-image" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
                {getStatusBadge(currentDriver.status)}
              </div>

              {/* Info Section */}
              <div className="flex-1 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {currentDriver.firstName} {currentDriver.lastName}
                  </h2>
                  <p className="text-slate-500 mt-1">Chauffeur</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input 
                      value={currentDriver.email} 
                      disabled 
                      className="bg-slate-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Téléphone
                    </Label>
                    <Input 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-slate-50" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-600 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Numéro de Permis
                    </Label>
                    <Input 
                      value={currentDriver.licenseNumber} 
                      disabled 
                      className="bg-slate-50 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-600 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Expiration du Permis
                    </Label>
                    <Input 
                      value={currentDriver.licenseExpiry ? format(new Date(currentDriver.licenseExpiry), "PP") : "Non défini"} 
                      disabled 
                      className="bg-slate-50"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                      Modifier le Profil
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={handleSaveProfile} 
                        disabled={updateMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsEditing(false);
                          setPhoneNumber(currentDriver.phoneNumber);
                        }}
                      >
                        Annuler
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Informations du Compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Membre depuis</span>
                <span className="font-medium">
                  {currentDriver.createdAt ? format(new Date(currentDriver.createdAt), "PP") : "Inconnu"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Statut du Compte</span>
                <span className="font-medium text-emerald-600">Actif</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Véhicule Assigné</span>
                <span className="font-medium">
                  {currentDriver.assignedVehicleId ? `Véhicule #${currentDriver.assignedVehicleId}` : "Non assigné"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Statistiques Rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Total Missions</span>
                <span className="font-bold text-blue-600">0</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Terminées</span>
                <span className="font-bold text-emerald-600">0</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Taux de Réussite</span>
                <span className="font-bold text-slate-900">-</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UserLayout>
  );
}
