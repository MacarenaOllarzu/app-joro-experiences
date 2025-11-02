import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              username,
              city,
            },
          },
        });
        if (error) throw error;
        toast({
          title: "¡Cuenta creada!",
          description: "Bienvenido a JORO",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">JORO</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Inicia sesión" : "Crea tu cuenta"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isLogin
              ? "Ingresa tu mail para ingresar a tu cuenta"
              : "Ingresa tus datos para crear tu cuenta"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de usuario*</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={!isLogin}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad*</Label>
                <Input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required={!isLogin}
                  placeholder="Tu ciudad"
                />
              </div>
            </>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email*</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@dominio.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña*</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            disabled={loading}
          >
            {loading ? "Cargando..." : isLogin ? "Continuar" : "Crear mi cuenta"}
          </Button>

          {isLogin && (
            <div className="flex justify-center gap-4 text-xs">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  toast({
                    title: "Recuperar contraseña",
                    description: "Funcionalidad próximamente disponible",
                  });
                }}
              >
                Olvidé mi contraseña
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setIsLogin(false)}
              >
                Crea tu cuenta
              </button>
            </div>
          )}
        </form>

        {!isLogin && (
          <div className="text-center">
            <button
              onClick={() => setIsLogin(true)}
              className="text-sm text-muted-foreground"
            >
              ¿Ya tienes cuenta?{" "}
              <span className="text-foreground font-medium hover:underline">
                Inicia sesión
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
