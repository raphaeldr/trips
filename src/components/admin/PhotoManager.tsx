import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, MapPin, Star, PlayCircle, Trash2, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const PhotoManager = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    data: photos,
    isLoading: photosLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select(
          `
          *,
          destinations (
            id,
            name,
            country
          )
        `,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: destinations } = useQuery({
    queryKey: ["destinations-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("id, name, country")
        .order("arrival_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (photoId: string, currentDestId?: string) => {
    setEditingId(photoId);
    setSelectedDestId(currentDestId || "none");
  };

  const handleSave = async (photoId: string) => {
    setProcessingId(photoId);
    try {
      const destinationId = selectedDestId === "none" ? null : selectedDestId;

      const { error } = await supabase.from("photos").update({ destination_id: destinationId }).eq("id", photoId);

      if (error) throw error;

      toast({
        title: "Location updated",
        description: "Media linked to destination successfully",
      });

      setEditingId(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update location",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSetHero = async (photoId: string, isCurrentHero: boolean) => {
    if (isCurrentHero) return; // Already hero

    setProcessingId(photoId);
    try {
      // 1. Unset any existing hero
      await supabase.from("photos").update({ is_hero: false }).neq("id", "00000000-0000-0000-0000-000000000000"); // Dummy condition to update all

      // 2. Set new hero
      const { error } = await supabase.from("photos").update({ is_hero: true }).eq("id", photoId);

      if (error) throw error;

      toast({
        title: "Hero Updated",
        description: "This item is now the main background for your homepage.",
      });
      refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (photoId: string, storagePath: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    setProcessingId(photoId);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage.from("photos").remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from DB
      const { error: dbError } = await supabase.from("photos").delete().eq("id", photoId);

      if (dbError) throw dbError;

      toast({ title: "Item deleted" });
      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete item",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (photosLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Media Library</h3>
        <Badge variant="outline" className="text-muted-foreground">
          {photos?.length || 0} items
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {photos?.map((photo) => {
          const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}`;
          const isEditing = editingId === photo.id;
          const isVideo = photo.mime_type?.startsWith("video/");
          const isProcessing = processingId === photo.id;

          return (
            <Card
              key={photo.id}
              className={`overflow-hidden transition-all ${photo.is_hero ? "ring-2 ring-primary shadow-lg scale-[1.02]" : ""}`}
            >
              <div className="relative aspect-video bg-muted group">
                {isVideo ? (
                  <video
                    src={publicUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    onMouseOver={(e) => e.currentTarget.play()}
                    onMouseOut={(e) => e.currentTarget.pause()}
                  />
                ) : (
                  <img src={publicUrl} alt={photo.title || "Photo"} className="w-full h-full object-cover" />
                )}

                {/* Hero Badge */}
                {photo.is_hero && (
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="bg-primary hover:bg-primary gap-1 shadow-md">
                      <Star className="w-3 h-3 fill-current" /> Hero
                    </Badge>
                  </div>
                )}

                {/* Type Indicator */}
                <div className="absolute top-2 right-2 text-white/80 z-10">
                  {isVideo ? <Video className="w-5 h-5 drop-shadow-md" /> : null}
                </div>

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={photo.is_hero ? "secondary" : "default"}
                      onClick={() => handleSetHero(photo.id, photo.is_hero || false)}
                      disabled={isProcessing}
                      className="gap-2"
                    >
                      <Star className={`w-4 h-4 ${photo.is_hero ? "fill-current" : ""}`} />
                      {photo.is_hero ? "Hero" : "Set Hero"}
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(photo.id, photo.storage_path)}
                      disabled={isProcessing}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {isVideo && (
                    <div className="text-xs text-white/80 flex items-center gap-1">
                      <PlayCircle className="w-3 h-3" /> Preview on hover
                    </div>
                  )}
                </div>
              </div>

              <CardContent className="p-3 space-y-3">
                {isEditing ? (
                  <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                    <Label className="text-xs">Destination</Label>
                    <Select value={selectedDestId} onValueChange={setSelectedDestId}>
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Location</SelectItem>
                        {destinations?.map((dest) => (
                          <SelectItem key={dest.id} value={dest.id}>
                            {dest.name}, {dest.country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={() => handleSave(photo.id)}
                        disabled={isProcessing}
                        size="sm"
                        className="flex-1 h-7 text-xs"
                      >
                        Save
                      </Button>
                      <Button onClick={() => setEditingId(null)} variant="outline" size="sm" className="h-7 text-xs">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 flex-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span
                        className="truncate"
                        title={
                          photo.destinations
                            ? `${photo.destinations.name}, ${photo.destinations.country}`
                            : "Unassigned"
                        }
                      >
                        {photo.destinations ? photo.destinations.name : "Unassigned"}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleEdit(photo.id, photo.destination_id || undefined)}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs hover:bg-muted"
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
