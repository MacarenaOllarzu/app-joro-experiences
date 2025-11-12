import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Camera, User } from "lucide-react";
import { profileSchema, CHILEAN_CITIES } from "@/lib/validations";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Profile {
  username: string;
  city: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_map_public?: boolean;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadProfile();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        if (data.avatar_url) {
          const { data: signedUrlData } = await supabase.storage
            .from("avatars")
            .createSignedUrl(data.avatar_url, 3600);
          if (signedUrlData) data.avatar_url = signedUrlData.signedUrl;
        }
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setErrors({});

    const validation = profileSchema.safeParse({
      username: profile.username,
      city: profile.city,
      phone: profile.phone || undefined,
    });

    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) newErrors[err.path[0] as string] = err.message;
      });
      setErrors(newErrors);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          username: profile.username,
          city: profile.city,
          phone: profile.phone || null,
          avatar_url: profile.avatar_url,
          is_map_public: profile.is_map_public,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "Tus cambios han sido guardados",
      });
      setEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al guardar los cambios",
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen debe ser menor a 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario autenticado");

      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split("/avatars/").pop();
        if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const avatarPath = fileName;

      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarPath } : null));

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarPath })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Foto actualizada",
        description: "Tu foto de perfil ha sido actualizada",
      });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Error al subir la imagen",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader
        title="Perfil"
        action={
          editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Editar
            </Button>
          )
        }
        showBack
      />

      <main className="max-w-lg mx-auto p-4">
        <div className="space-y-6">
          <div className="flex flex-col items-center py-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-primary" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {!editing && (
              <>
                <h2 className="text-2xl font-bold mt-4">{profile?.username}</h2>
                <p className="text-muted-foreground">{profile?.city}</p>
                {profile?.phone && (
                  <p className="text-sm text-muted-foreground">{profile.phone}</p>
                )}
              </>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de usuario</Label>
                <Input
                  id="username"
                  value={profile?.username || ""}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev ? { ...prev, username: e.target.value } : null
                    )
                  }
                  className={errors.username ? "border-destructive" : ""}
                />
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Select
                  value={profile?.city || ""}
                  onValueChange={(value) =>
                    setProfile((prev) =>
                      prev ? { ...prev, city: value } : null
                    )
                  }
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
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile?.phone || ""}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev ? { ...prev, phone: e.target.value } : null
                    )
                  }
                  placeholder="+56912345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email || ""} disabled />
              </div>

              <Button onClick={handleSave} className="w-full">
                Guardar cambios
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="text-sm">{profile?.email}</p>
                </div>
                {profile?.phone && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Teléfono</Label>
                    <p className="text-sm">{profile.phone}</p>
                  </div>
                )}
              </div>

              {/* ✅ Switch visible solo en vista no editable */}
              <div className="flex items-center justify-between py-4 px-2 border-t border-border">
                <Label htmlFor="is_map_public">Mapa público</Label>
                <Switch
                  checked={profile?.is_map_public || false}
                  onCheckedChange={async (val) => {
                    if (!profile) return;

                    // Actualiza estado local para respuesta instantánea
                    setProfile((prev) => (prev ? { ...prev, is_map_public: val } : null));

                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error("Usuario no autenticado");

                      const { error } = await supabase
                        .from("profiles")
                        .update({ is_map_public: val })
                        .eq("id", user.id);

                      if (error) throw error;

                      toast({
                        title: val ? "Mapa visible 🌍" : "Mapa oculto 🔒",
                        description: val
                          ? "Tu mapa ahora es público para otros usuarios."
                          : "Tu mapa ya no es visible para otros usuarios.",
                      });
                    } catch (error: any) {
                      console.error("Error actualizando mapa público:", error);
                      toast({
                        title: "Error",
                        description: "No se pudo actualizar la visibilidad del mapa.",
                        variant: "destructive",
                      });

                      // Si falla, revertimos el cambio local
                      setProfile((prev) => (prev ? { ...prev, is_map_public: !val } : null));
                    }
                  }}
                  id="is_map_public"
                />
              </div>

            </>
          )}

            <Button
              onClick={handleSignOut}
              variant="destructive"
              className="w-full"
            >
              Cerrar sesión
            </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
