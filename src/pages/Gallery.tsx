import { Navigation } from "@/components/Navigation";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { PhotoFilters } from "@/components/gallery/PhotoFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
const Gallery = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const {
    toast
  } = useToast();
  const {
    data: photos,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["photos"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("photos").select("*").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data;
    }
  });

  // Extract all unique tags
  const allTags = Array.from(new Set(photos?.flatMap(photo => photo.ai_tags || []).filter(Boolean) || [])).sort();

  // Filter and sort photos
  const filteredPhotos = photos?.filter(photo => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesCaption = photo.ai_caption?.toLowerCase().includes(query);
      const matchesTitle = photo.title?.toLowerCase().includes(query);
      const matchesTags = photo.ai_tags?.some(tag => tag.toLowerCase().includes(query));
      if (!matchesCaption && !matchesTitle && !matchesTags) return false;
    }

    // Tag filter
    if (selectedTags.length > 0) {
      const photoTags = photo.ai_tags || [];
      const hasAllSelectedTags = selectedTags.every(tag => photoTags.includes(tag));
      if (!hasAllSelectedTags) return false;
    }
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case "date-asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "date-desc":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "location":
        if (!a.latitude || !b.latitude) return 0;
        return a.latitude - b.latitude;
      default:
        return 0;
    }
  });
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const handleReset = () => {
    setSearchQuery("");
    setSortBy("date-desc");
    setSelectedTags([]);
  };
  const handleAutoTagAll = async () => {
    const untaggedPhotos = photos?.filter(photo => !photo.ai_tags || photo.ai_tags.length === 0);
    if (!untaggedPhotos || untaggedPhotos.length === 0) {
      toast({
        title: "All photos tagged!",
        description: "All photos already have AI tags."
      });
      return;
    }
    toast({
      title: "Tagging photos...",
      description: `Processing ${untaggedPhotos.length} photos. This may take a minute.`
    });
    let successCount = 0;
    for (const photo of untaggedPhotos) {
      try {
        const {
          error
        } = await supabase.functions.invoke("tag-photo", {
          body: {
            photoId: photo.id
          }
        });
        if (!error) successCount++;
      } catch (error) {
        console.error("Error tagging photo:", error);
      }
    }
    await refetch();
    toast({
      title: "Tagging complete!",
      description: `Successfully tagged ${successCount} of ${untaggedPhotos.length} photos.`
    });
  };
  return <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20 container mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground mb-2">
              Photo gallery
            </h1>
            <p className="text-muted-foreground">
              {filteredPhotos?.length || 0} photos
              {selectedTags.length > 0 && ` • ${selectedTags.length} filter(s) active`}
            </p>
          </div>
          
          {photos && photos.some(p => !p.ai_tags || p.ai_tags.length === 0) && <Button onClick={handleAutoTagAll} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Auto-tag All Photos
            </Button>}
        </div>

        <PhotoFilters searchQuery={searchQuery} onSearchChange={setSearchQuery} sortBy={sortBy} onSortChange={setSortBy} selectedTags={selectedTags} onTagToggle={handleTagToggle} availableTags={allTags} onReset={handleReset} />

        <div className="mt-8">
          {isLoading ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
            </div> : filteredPhotos && filteredPhotos.length > 0 ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPhotos.map(photo => <PhotoCard key={photo.id} id={photo.id} storagePath={photo.storage_path} title={photo.title} description={photo.description} aiCaption={photo.ai_caption} aiTags={photo.ai_tags} latitude={photo.latitude} longitude={photo.longitude} takenAt={photo.taken_at} cameraMake={photo.camera_make} cameraModel={photo.camera_model} isHero={photo.is_hero} onHeroToggle={refetch} />)}
            </div> : <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                {searchQuery || selectedTags.length > 0 ? "No photos match your filters" : "No photos yet. Upload some photos from the admin panel!"}
              </p>
            </div>}
        </div>
      </div>
    </div>;
};
export default Gallery;