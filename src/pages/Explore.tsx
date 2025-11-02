import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface Objective {
  id: string;
  title: string;
  description: string;
  image_url: string;
  total_items: number;
  category_id: string;
}

const Explore = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadCategories();
    loadObjectives();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    if (data) {
      setCategories(data);
      setSelectedCategory(data[0]?.slug || "");
    }
  };

  const loadObjectives = async () => {
    const { data } = await supabase
      .from("objectives")
      .select("*")
      .order("title");
    if (data) setObjectives(data);
  };

  const filteredObjectives = objectives.filter((obj) => {
    const matchesCategory = selectedCategory
      ? obj.category_id ===
        categories.find((c) => c.slug === selectedCategory)?.id
      : true;
    const matchesSearch = obj.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Explorar objetivos" />

      <main className="max-w-lg mx-auto">
        <div className="sticky top-14 z-30 bg-background border-b border-border">
          <Tabs
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            className="w-full"
          >
            <TabsList className="w-full justify-start rounded-none border-0 bg-transparent h-auto p-0">
              {categories.map((category) => (
                <TabsTrigger
                  key={category.slug}
                  value={category.slug}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar objetivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {filteredObjectives.map((objective) => (
            <button
              key={objective.id}
              onClick={() => navigate(`/objective/${objective.id}`)}
              className="w-full group"
            >
              <div className="relative h-48 rounded-2xl overflow-hidden">
                <img
                  src={objective.image_url}
                  alt={objective.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="font-bold text-lg mb-1">{objective.title}</h3>
                  {objective.description && (
                    <p className="text-sm text-white/90">
                      {objective.description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Explore;
