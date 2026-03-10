import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Loader2, ArrowLeft, CheckCircle2, Eye, EyeOff, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function getApiUrl(path: string) {
  const baseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://fleet-manager-backend-d02b.onrender.com/api" : "http://localhost:3000/api");
  const cleanPath = path.startsWith("/api") ? path.substring(4) : path;
  return `${baseUrl}${cleanPath}`;
}

type View = "form" | "success" | "error";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<View>(() => {
    // Check if token exists on initial load
    const params = new URLSearchParams(window.location.search);
    const hasToken = params.get("token") || window.location.hash.includes("token=");
    return hasToken ? "form" : "error";
  });
  const [errorMessage, setErrorMessage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const hasToken = params.get("token") || window.location.hash.includes("token=");
    return hasToken ? "" : "Le lien de réinitialisation est invalide. Aucun token trouvé dans l'URL.";
  });
  const { toast } = useToast();

  // Extract token from URL query params (handle both direct URL and SPA redirect)
  const getToken = (): string | null => {
    // Try standard query params first
    const params = new URLSearchParams(window.location.search);
    let token = params.get("token");
    if (token) return decodeURIComponent(token);

    // Also try to extract from hash (in case of hash routing)
    if (window.location.hash.includes("token=")) {
      const hashParams = new URLSearchParams(window.location.hash.split("?")[1] || "");
      token = hashParams.get("token");
      if (token) return decodeURIComponent(token);
    }

    return null;
  };
  const token = getToken();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    if (!token) {
      setErrorMessage("Le lien de réinitialisation est invalide. Aucun token trouvé.");
      setView("error");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(getApiUrl("/api/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la réinitialisation");
      }

      setView("success");
    } catch (error: any) {
      setErrorMessage(error.message || "Le lien de réinitialisation est invalide ou a expiré.");
      setView("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream to-cream-200 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gold-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-crimson-400/10 rounded-full blur-3xl"></div>

      <Card className="w-full max-w-md relative border-gold-200/50 shadow-2xl bg-white/95 backdrop-blur">
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-crimson-500 via-gold-500 to-crimson-500 rounded-t-lg"></div>

        {/* ===== RESET FORM VIEW ===== */}
        {view === "form" && (
          <>
            <CardHeader className="space-y-1 text-center pt-8">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-crimson-500 to-crimson-700 p-4 rounded-full shadow-xl shadow-crimson-500/30">
                  <KeyRound className="w-10 h-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">Nouveau mot de passe</CardTitle>
              <CardDescription className="text-gray-600">
                Choisissez un nouveau mot de passe pour votre compte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-gray-700">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Au moins 6 caractères"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isLoading}
                      className="border-gray-200 focus:border-crimson-400 focus:ring-crimson-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-gray-700">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Retapez votre mot de passe"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isLoading}
                      className="border-gray-200 focus:border-crimson-400 focus:ring-crimson-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-crimson-500 to-crimson-600 hover:from-crimson-600 hover:to-crimson-700 shadow-lg shadow-crimson-500/25 border-0 h-11 text-base"
                  disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Réinitialiser le mot de passe
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {/* ===== SUCCESS VIEW ===== */}
        {view === "success" && (
          <>
            <CardHeader className="space-y-1 text-center pt-8">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-full shadow-xl shadow-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">Mot de passe réinitialisé !</CardTitle>
              <CardDescription className="text-gray-600">
                Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-gradient-to-r from-crimson-500 to-crimson-600 hover:from-crimson-600 hover:to-crimson-700 shadow-lg shadow-crimson-500/25 border-0 h-11 text-base"
                onClick={() => setLocation("/login")}
              >
                Se connecter
              </Button>
            </CardContent>
          </>
        )}

        {/* ===== ERROR VIEW ===== */}
        {view === "error" && (
          <>
            <CardHeader className="space-y-1 text-center pt-8">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-red-400 to-red-600 p-4 rounded-full shadow-xl shadow-red-500/30">
                  <XCircle className="w-10 h-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">Lien invalide</CardTitle>
              <CardDescription className="text-gray-600">
                {errorMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-gradient-to-r from-crimson-500 to-crimson-600 hover:from-crimson-600 hover:to-crimson-700 shadow-lg shadow-crimson-500/25 border-0 h-11 text-base"
                onClick={() => setLocation("/login")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}




