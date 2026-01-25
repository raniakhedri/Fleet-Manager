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
      role: "driver",
      phoneNumber: "",
    }
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        role: profile.role,
        phoneNumber: profile.phoneNumber || "",
      });
    }
  }, [profile, form]);

  const onSubmit = (data: any) => {
    updateProfile.mutate(data);
  };

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
               {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Profile" className="w-16 h-16 rounded-full border-2 border-slate-100" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-2xl">
                  {user?.firstName?.[0]}
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg">{user?.firstName} {user?.lastName}</h3>
                <p className="text-slate-500">{user?.email}</p>
              </div>
            </div>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Input 
                  id="role" 
                  {...form.register("role")} 
                  disabled 
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-400">Le rôle est géré par l'administrateur système.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de Téléphone</Label>
                <Input 
                  id="phone" 
                  placeholder="+33 1 23 45 67 89" 
                  {...form.register("phoneNumber")} 
                />
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={updateProfile.isPending}>
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
