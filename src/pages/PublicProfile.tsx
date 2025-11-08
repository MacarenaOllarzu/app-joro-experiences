import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";



const PublicProfile = () => {
  const { id } = useParams(); // "id" puede ser un userId o "me"
  const navigate = useNavigate();
  const location = useLocation();
  const cameFromExplore = location.state?.fromExplore === true;

  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Obtener usuario actual
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id || "";
      setCurrentUserId(uid);

      // Si la ruta es /user/me → convertir a tu ID real
      if (id === "me") {
        setProfileId(uid);
      } else {
        setProfileId(id || null);
      }
    }

    loadUser();
  }, [id]);

  // Cargar perfil + followers/ following
  useEffect(() => {
    if (!profileId) return;

    async function fetchProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (!data) return;

      // Firmar avatar
      if (data.avatar_url) {
        const { data: signed } = await supabase.storage
          .from("avatars")
          .createSignedUrl(data.avatar_url, 3600);
        data.avatar_url = signed?.signedUrl || null;
      }

      setProfile(data);
    }

    async function checkFollowing() {
      if (!currentUserId || !profileId) return;

      const { data } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", currentUserId)
        .eq("following_id", profileId);

      setIsFollowing(!!data?.length);
    }

    async function loadCounts() {
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileId);

      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileId);

      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
    }

    fetchProfile();
    checkFollowing();
    loadCounts();
  }, [profileId, currentUserId]);

  async function follow() {
    await supabase.from("follows").insert({
      follower_id: currentUserId,
      following_id: profileId,
    });
    setIsFollowing(true);
    setFollowersCount((prev) => prev + 1);
  }

  async function unfollow() {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", currentUserId)
      .eq("following_id", profileId);

    setIsFollowing(false);
    setFollowersCount((prev) => prev - 1);
  }

  if (!profile) {
    return <div className="p-6 text-center">Cargando...</div>;
  }

  const isMyProfile = currentUserId === profileId;

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader
        title={profile.username}
        action={
          isMyProfile ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/profile")}
            >
              Editar
            </Button>
          ) : null
        }
        showBack={cameFromExplore}
      />


      <main className="max-w-lg mx-auto p-4 space-y-6">

        {/* Avatar */}
        <div className="flex flex-col items-center py-6">
          <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-primary" />
            )}
          </div>

          {/* Nombre, ciudad */}
          <h2 className="text-xl font-bold mt-3">{profile.username}</h2>
          <p className="text-muted-foreground">{profile.city}</p>

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

          {/* Seguir / Siguiendo */}
          {!isMyProfile && (
            <Button
              className="mt-4"
              onClick={isFollowing ? unfollow : follow}
              variant={isFollowing ? "outline" : "default"}
            >
              {isFollowing ? "Siguiendo" : "Seguir"}
            </Button>
      
          )}

          {/* ✅ Línea separadora bonita */}
          <div className="w-full border-t border-border my-8"></div>
          
          <Button
            onClick={() => navigate(`/world-map/${profileId}`)}
            variant="outline"
            className="w-full"
          >
            🗺️ Ver Mapa Mundial
          </Button>

        </div>
      
      </main>
          
      <BottomNav />
    </div>
  );
};

export default PublicProfile;
