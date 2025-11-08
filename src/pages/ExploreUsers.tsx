import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ExploreUsers = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) setCurrentUserId(data.user.id);
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (search.trim() === "") {
      setResults([]);
      return;
    }

    async function searchUsers() {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${search}%`);

      if (!data) {
        setResults([]);
        return;
      }

      const withSignedUrls = await Promise.all(
        data.map(async (user) => {
          if (user.avatar_url) {
            const { data: signed } = await supabase.storage
              .from("avatars")
              .createSignedUrl(user.avatar_url, 3600);
            return { ...user, avatar_url: signed?.signedUrl || null };
          }
          return user;
        })
      );

      setResults(withSignedUrls);
    }

    searchUsers();
  }, [search]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Buscar Usuarios" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        <Input
          placeholder="Buscar por nombre de usuario"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="space-y-4">
          {results.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              currentUserId={currentUserId}
            />
          ))}

          {search !== "" && results.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No se encontraron usuarios.
            </p>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

const UserCard = ({ user, currentUserId }) => {
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    async function check() {
      if (!currentUserId) return;

      const { data } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", currentUserId)
        .eq("following_id", user.id);

      setIsFollowing(!!data?.length);
    }
    check();
  }, [currentUserId, user.id]);

  const follow = async (e) => {
    e.stopPropagation(); // evita abrir el perfil
    await supabase.from("follows").insert({
      follower_id: currentUserId,
      following_id: user.id,
    });
    setIsFollowing(true);
  };

  const unfollow = async (e) => {
    e.stopPropagation(); // evita abrir el perfil
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", currentUserId)
      .eq("following_id", user.id);

    setIsFollowing(false);
  };

  return (
    <div
      className="flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm cursor-pointer hover:bg-accent transition"
      onClick={() =>
        navigate(`/user/${user.id}`, { state: { fromExplore: true } })
      }

    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-primary" />
          )}
        </div>
        <span className="font-medium">{user.username}</span>
      </div>

      {isFollowing ? (
        <Button variant="outline" onClick={unfollow}>
          Siguiendo
        </Button>
      ) : (
        <Button onClick={follow}>Seguir</Button>
      )}
    </div>
  );
};

export default ExploreUsers;

