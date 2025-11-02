import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  username: string;
  city: string;
  email: string;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          username: profile.username,
          city: profile.city,
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
        description: error.message,
        variant: "destructive",
      });
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
      />

      <main className="max-w-lg mx-auto p-4">
        <div className="space-y-6">
          <div className="flex flex-col items-center py-8">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-primary">
                {profile?.username.charAt(0).toUpperCase()}
              </span>
            </div>
            {!editing && (
              <>
                <h2 className="text-2xl font-bold">{profile?.username}</h2>
                <p className="text-muted-foreground">{profile?.city}</p>
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={profile?.city || ""}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev ? { ...prev, city: e.target.value } : null
                    )
                  }
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <p className="text-sm">{profile?.email}</p>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-border">
            <Button
              onClick={handleSignOut}
              variant="destructive"
              className="w-full"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
