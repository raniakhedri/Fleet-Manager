import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile, useUpdateProfile } from "@/hooks/use-user-profile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useEffect } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useUserProfile();
  const updateProfile = useUpdateProfile();

  const form = useForm({
    defaultValues: {
      role: "",
      phoneNumber: "",
    }
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        role: profile.role || "user",
        phoneNumber: profile.phoneNumber || "",
      });
    }
  }, [profile, form]);

  const onSubmit = (data: any) => {
    updateProfile.mutate({
      role: data.role,
      phoneNumber: data.phoneNumber,
    });
  };

  // Get display name from profile or user
  const displayName = profile?.firstName && profile?.lastName 
    ? `${profile.firstName} ${profile.lastName}` 
    : user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : profile?.email || user?.email || "Utilisateur";
  
  const displayEmail = profile?.email || user?.email || "";
  const displayRole = profile?.role === "admin" ? "Administrateur" : profile?.role === "driver" ? "Chauffeur" : profile?.role || "Utilisateur";
  const profileImage = profile?.profileImageUrl || user?.profileImageUrl;
  const initials = (profile?.firstName?.[0] || user?.firstName?.[0] || displayEmail[0] || "U").toUpperCase();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-crimson-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold font-display text-slate-900 mb-8">Paramètres</h1>

        <Card className="border-none shadow-md mb-8">
          <CardHeader>
            <CardTitle>Profil Utilisateur</CardTitle>
            <CardDescription>Gérez les paramètres et préférences de votre compte.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
               {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-16 h-16 rounded-full border-2 border-slate-100" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-crimson-500 to-crimson-700 flex items-center justify-center text-white font-bold text-2xl">
                  {initials}
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg">{displayName}</h3>
                <p className="text-slate-500">{displayEmail}</p>
              </div>
            </div>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Input 
                  id="role" 
                  value={displayRole}
                  disabled 
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-400">Le rôle est géré par l'administrateur système.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de Téléphone</Label>
                <Input 
                  id="phone" 
                  placeholder="+216 XX XXX XXX" 
                  {...form.register("phoneNumber")} 
                />
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={updateProfile.isPending} className="bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-700 hover:to-crimson-800">
                  {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer les Modifications
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
