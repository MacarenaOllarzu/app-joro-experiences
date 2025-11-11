import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";

type Profile = {
id: string;
username: string | null;
city?: string | null;
phone?: string | null;
avatar_url?: string | null;
is_map_public?: boolean | null;
};

const PublicProfile = () => {
const { id } = useParams();
const navigate = useNavigate();
const location = useLocation();
const cameFromExplore = location.state?.fromExplore === true;

const [currentUserId, setCurrentUserId] = useState("");
const [currentUsername, setCurrentUsername] = useState("");
const [profileId, setProfileId] = useState<string | null>(null);

const [profile, setProfile] = useState<Profile | null>(null);
const [isFollowing, setIsFollowing] = useState(false);

const [followersCount, setFollowersCount] = useState(0);
const [followingCount, setFollowingCount] = useState(0);
const [loading, setLoading] = useState(true);

// Cargar usuario actual y resolver "me"
useEffect(() => {
(async () => {
const { data } = await supabase.auth.getUser();
const uid = data?.user?.id ?? "";
if (!uid) return;
setCurrentUserId(uid);

const { data: me } = await supabase
.from("profiles")
.select("username")
.eq("id", uid)
.single();

if (me?.username) setCurrentUsername(me.username);
setProfileId(id === "me" ? uid : id || null);
})();
}, [id]);

// Cargar perfil, relación follow y contadores
useEffect(() => {
if (!profileId || !currentUserId) return;

(async () => {
setLoading(true);

// Perfil
const { data: p } = await supabase
.from("profiles")
.select("*")
.eq("id", profileId)
.single();

if (p) {
// firmar avatar si existe
if (p.avatar_url) {
const { data: signed } = await supabase.storage
.from("avatars")
.createSignedUrl(p.avatar_url, 3600);
p.avatar_url = signed?.signedUrl ?? null;
}
setProfile(p as Profile);
}

// ¿ya sigo?
const { data: rel } = await supabase
.from("follows")
.select("id")
.eq("follower_id", currentUserId)
.eq("following_id", profileId)
.maybeSingle();
setIsFollowing(!!rel);

// Contadores
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

// FOLLOW (seguidor = currentUserId, seguido = profileId)
async function follow() {
if (isMyProfile || !currentUserId || !profileId) return;

// 1. Evitar duplicado en follows
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

// --- 1. INSERTAR en 'follows' Y OBTENER el ID de la RELACIÓN ---
const { data: followData, error: insErr } = await supabase
.from("follows")
.insert({
follower_id: currentUserId, // seguidor (actor)
following_id: profileId,    // seguido (dueño del feed)
})
.select("id"); // <-- SOLICITAMOS EL ID ÚNICO

if (insErr || !followData || followData.length === 0) {
console.error("Error al crear la relación follow:", insErr);
alert(`Error al seguir (follows): ${insErr?.message || 'Error desconocido.'}`);
return;
}

const followRelationshipId = followData[0].id; // El ID de la relación de seguimiento

// --- 2. Crear notificación usando el ID de la relación ---
const { error: notifErr } = await supabase.from("activity_feed").insert({
user_id: profileId,                // recibe la notificación (seguido)
actor_id: currentUserId,            // quien sigue (seguidor)
activity_type: "new_follower",
objective_title: "Nuevo seguidor",
item_name: currentUsername || null,

// 🔥 CAMBIO CLAVE 1: Usamos la nueva columna para la eliminación en cascada
follow_relationship_id: followRelationshipId, 

// 🔥 CAMBIO CLAVE 2: Enviamos valores UUID a objective_id/objective_item_id para 
      // satisfacer la restricción NOT NULL de tu BD, usando los IDs de los usuarios.
objective_id: profileId, 
objective_item_id: currentUserId,
});

    if (notifErr) {
        console.error("Error al crear la notificación:", notifErr);
        alert(`Error al crear notificación: ${notifErr.message}.`);
        return;
    }

setIsFollowing(true);
setFollowersCount((c) => c + 1);
}

// UNFOLLOW (borra relación y DEJA que la DB borre la notificación)
async function unfollow() {
if (!currentUserId || !profileId) return;

// 1. Borrar follow. La restricción ON DELETE CASCADE hace el resto.
const { error: delRelErr } = await supabase
.from("follows")
.delete()
.eq("follower_id", currentUserId)
.eq("following_id", profileId);

if (delRelErr) {
console.error("Error al borrar la relación follow:", delRelErr);
return;
}

// El código de borrado de la notificación se elimina.

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
<AppHeader title={profile.username ?? "Perfil"} showBack={cameFromExplore} />

<main className="max-w-lg mx-auto p-4 space-y-6">
<div className="flex flex-col items-center py-6">
<div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border">
{profile.avatar_url ? (
<img src={profile.avatar_url} className="w-full h-full object-cover" />
) : (
<User className="w-12 h-12 text-primary" />
)}
</div>

<h2 className="text-xl font-bold mt-3">{profile.username}</h2>
{profile.city && <p className="text-muted-foreground">{profile.city}</p>}
{profile.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}

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