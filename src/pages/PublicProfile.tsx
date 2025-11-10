import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const cameFromExplore = location.state?.fromExplore === true;

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);

  const [profile, setProfile] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // ✅ Cargar usuario actual
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? "";
      if (!uid) return;

      setCurrentUserId(uid);

      // cargar username del usuario actual
      const { data: me } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", uid)
        .single();

      if (me?.username) setCurrentUsername(me.username);

      // resolver "me"
      setProfileId(id === "me" ? uid : id || null);
    })();
  }, [id]);

  // ✅ Cargar perfil, contadores y follow status
  useEffect(() => {
    if (!profileId || !currentUserId) return;

    (async () => {
      setLoading(true);

      // cargar perfil
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (p) {
        if (p.avatar_url) {
          const { data: signed } = await supabase.storage
            .from("avatars")
            .createSignedUrl(p.avatar_url, 3600);
          p.avatar_url = signed?.signedUrl ?? null;
        }
        setProfile(p);
      }

      // verificar follow
      const { data: rel } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", profileId)
        .maybeSingle();

      setIsFollowing(!!rel);

      // contadores
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileId);

      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileId);

      setFollowersCount(followers ?? 0);
      setFollowingCount(following ?? 0);

      setLoading(false);
    })();
  }, [profileId, currentUserId]);

  const isMyProfile =
    Boolean(currentUserId && profileId && currentUserId === profileId);

  // ✅ SEGUIR
  async function follow() {
    if (isMyProfile) return; // nunca debería pasar, pero seguridad extra
    if (!currentUserId || !profileId) return;

    // evitar duplicado
    const { data: already } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUserId)
      .eq("following_id", profileId)
      .maybeSingle();

    if (already) {
      setIsFollowing(true);
      return;
    }

    // insertar follow
    const { error } = await supabase.from("follows").insert({
      follower_id: currentUserId,
      following_id: profileId,
    });
    if (error) {
      console.error(error);
      return;
    }

    setIsFollowing(true);
    setFollowersCount((c) => c + 1);

    // ✅ CREAR actividad tipo NEW_FOLLOWER
    await supabase.from("activity_feed").insert({
      user_id: profileId,                // receptor
      activity_type: "new_follower",
      objective_item_id: currentUserId,  // quién sigue
      item_name: currentUsername,        // nombre del seguidor
    });
  }

  // ✅ DEJAR DE SEGUIR
  async function unfollow() {
    if (!currentUserId || !profileId) return;

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", currentUserId)
      .eq("following_id", profileId);

    if (error) {
      console.error(error);
      return;
    }

    setIsFollowing(false);
    setFollowersCount((c) => Math.max(0, c - 1));
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <AppHeader title="Perfil" />
        <main className="max-w-lg mx-auto p-4">Cargando…</main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader
        title={profile.username}
        showBack={cameFromExplore}
        action={
          isMyProfile ? (
            <Button size="sm" variant="ghost" onClick={() => navigate("/profile")}>
              Ver mis datos
            </Button>
          ) : null
        }
      />

      <main className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex flex-col items-center py-6">
          <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-primary" />
            )}
          </div>

          <h2 className="text-xl font-bold mt-3">{profile.username}</h2>
          {profile.city && <p className="text-muted-foreground">{profile.city}</p>}
          {profile.phone && (
            <p className="text-sm text-muted-foreground">{profile.phone}</p>
          )}

          {/* Seguidores / Siguiendo */}
          <div className="flex gap-6 mt-4 text-center">
            <div>
              <p className="text-lg font-bold">{followersCount}</p>
              <p className="text-xs text-muted-foreground">Seguidores</p>
            </div>
            <div>
              <p className="text-lg font-bold">{followingCount}</p>
              <p className="text-xs text-muted-foreground">Siguiendo</p>
            </div>
          </div>

          {/* ✅ BOTÓN SEGUIR SOLO SI NO ES MI PERFIL */}
          {!isMyProfile && (
            <Button
              className="mt-4"
              onClick={isFollowing ? unfollow : follow}
              variant={isFollowing ? "outline" : "default"}
            >
              {isFollowing ? "Siguiendo" : "Seguir"}
            </Button>
          )}

          <div className="w-full border-t border-border my-8" />

          {profile.is_map_public && (
            <Button
              onClick={() => navigate(`/world-map/${profileId}`)}
              variant="outline"
              className="w-full"
            >
              🗺️ Ver Mapa Mundial
            </Button>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default PublicProfile;
