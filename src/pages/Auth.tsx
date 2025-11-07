import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import { signupSchema, loginSchema, CHILEAN_CITIES } from "@/lib/validations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    setErrors({});
    setLoading(true);

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({
          email,
          password,
        });

        if (!validation.success) {
          const newErrors: Record<string, string> = {};
          validation.error.issues.forEach((err) => {
            if (err.path[0]) newErrors[err.path[0] as string] = err.message;
          });
          setErrors(newErrors);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        navigate("/dashboard");
      } else {
        const validation = signupSchema.safeParse({
          email,
          password,
          username,
          city,
        });

        if (!validation.success) {
          const newErrors: Record<string, string> = {};
          validation.error.issues.forEach((err) => {
            if (err.path[0]) newErrors[err.path[0] as string] = err.message;
          });
          setErrors(newErrors);
          setLoading(false);
          return;
        }

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
      const errorMsg =
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos"
          : error.message;
      toast({
        title: "Error",
        description: errorMsg,
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
              ? "Ingresa tu email para ingresar a tu cuenta"
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
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrors((prev) => ({ ...prev, username: "" }));
                  }}
                  required={!isLogin}
                  placeholder="Tu nombre"
                  className={errors.username ? "border-destructive" : ""}
                />
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad*</Label>
                <Select
                  value={city}
                  onValueChange={(value) => {
                    setCity(value);
                    setErrors((prev) => ({ ...prev, city: "" }));
                  }}
                  required={!isLogin}
                >
                  <SelectTrigger
                    className={errors.city ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Selecciona tu ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHILEAN_CITIES.map((cityName) => (
                      <SelectItem key={cityName} value={cityName}>
                        {cityName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.city && (
                  <p className="text-xs text-destructive">{errors.city}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email*</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  required={!isLogin}
                  placeholder="email@dominio.com"
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>
            </>
          )}

          {isLogin && (
            <div className="space-y-2">
              <Label htmlFor="login-email">Email*</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: "" }));
                }}
                required
                placeholder="email@dominio.com"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña*</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: "" }));
                }}
                required
                placeholder="••••••••"
                className={errors.password ? "border-destructive" : ""}
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
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
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
              <ForgotPasswordDialog />
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
