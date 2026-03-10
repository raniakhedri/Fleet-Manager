import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, ArrowLeft, Star, Mail, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function getApiUrl(path: string) {
  const baseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://fleet-manager-backend-d02b.onrender.com/api" : "http://localhost:3000/api");
  const cleanPath = path.startsWith("/api") ? path.substring(4) : path;
  return `${baseUrl}${cleanPath}`;
}

type View = "login" | "forgot" | "forgot-sent";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<View>("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(getApiUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Store JWT token
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast({
        title: "Connexion réussie",
        description: `Bienvenue, ${data.user.firstName || data.user.email} !`,
      });

      // Redirect to dashboard
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Échec de connexion",
        description: error.message || "Identifiants invalides",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(getApiUrl("/api/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de l'envoi");
      }

      setView("forgot-sent");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email de réinitialisation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream to-cream-200 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gold-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-crimson-400/10 rounded-full blur-3xl"></div>
      
      {/* Back to home */}
      <Link href="/" className="absolute top-6 left-6">
        <Button variant="ghost" className="text-gray-600 hover:text-crimson-600">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </Link>
      
      <Card className="w-full max-w-md relative border-gold-200/50 shadow-2xl bg-white/95 backdrop-blur">
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-crimson-500 via-gold-500 to-crimson-500 rounded-t-lg"></div>
        
        {/* ===== LOGIN VIEW ===== */}
        {view === "login" && (
          <>
            <CardHeader className="space-y-1 text-center pt-8">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="bg-gradient-to-br from-crimson-500 to-crimson-700 p-4 rounded-full shadow-xl shadow-crimson-500/30">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gold-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Star className="w-2 h-2 text-white fill-white" />
                  </div>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-crimson-600 to-crimson-800 bg-clip-text text-transparent">FleetGuard</CardTitle>
              <CardDescription className="text-gray-600">Connectez-vous à votre compte pour continuer</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nom@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="border-gray-200 focus:border-crimson-400 focus:ring-crimson-400"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-gray-700">Mot de passe</Label>
                    <button
                      type="button"
                      onClick={() => { setForgotEmail(email); setView("forgot"); }}
                      className="text-xs text-crimson-600 hover:text-crimson-700 hover:underline font-medium transition-colors"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="border-gray-200 focus:border-crimson-400 focus:ring-crimson-400"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-crimson-500 to-crimson-600 hover:from-crimson-600 hover:to-crimson-700 shadow-lg shadow-crimson-500/25 border-0 h-11 text-base"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Se Connecter
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {/* ===== FORGOT PASSWORD VIEW ===== */}
        {view === "forgot" && (
          <>
            <CardHeader className="space-y-1 text-center pt-8">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-gold-400 to-gold-600 p-4 rounded-full shadow-xl shadow-gold-500/30">
                  <Mail className="w-10 h-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">Mot de passe oublié ?</CardTitle>
              <CardDescription className="text-gray-600">
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-gray-700">Adresse email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="nom@exemple.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="border-gray-200 focus:border-crimson-400 focus:ring-crimson-400"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-crimson-500 to-crimson-600 hover:from-crimson-600 hover:to-crimson-700 shadow-lg shadow-crimson-500/25 border-0 h-11 text-base"
                  disabled={isLoading || !forgotEmail}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Envoyer le lien de réinitialisation
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-gray-500 hover:text-crimson-600"
                  onClick={() => setView("login")}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour à la connexion
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {/* ===== EMAIL SENT SUCCESS VIEW ===== */}
        {view === "forgot-sent" && (
          <>
            <CardHeader className="space-y-1 text-center pt-8">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-4 rounded-full shadow-xl shadow-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">Email envoyé !</CardTitle>
              <CardDescription className="text-gray-600">
                Si un compte est associé à <strong className="text-slate-800">{forgotEmail}</strong>, vous recevrez un email avec un lien pour réinitialiser votre mot de passe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">📧 Vérifiez votre boîte de réception</p>
                <p>Le lien expire dans <strong>1 heure</strong>. Pensez à vérifier vos spams si vous ne voyez pas l'email.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-gray-500 hover:text-crimson-600"
                onClick={() => setView("login")}
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
