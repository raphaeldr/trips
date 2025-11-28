import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Star, Trash2, Video, Edit2, Film, Image as ImageIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

// Schema for animated files (video or gif)
const animatedFileSchema = z.object({
  size: z.number().max(50 * 1024 * 1024, { message: "File size must be less than 50MB" }),
  type: z
    .string()
    .regex(/^(video\/(mp4|webm)|image\/(gif|webp))$/i, {
      message: "Only MP4, WebM video or GIF/WebP animations are allowed",
    }),
});

export const PhotoManager = () => {
  const [editingPhoto, setEditingPhoto] = useState<any | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [uploadingAnimation, setUploadingAnimation] = useState(false);
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

  // --- Actions ---

  const handleSetHero = async (photoId: string, isCurrentHero: boolean) => {
    if (isCurrentHero) return; // Already hero

    setProcessingId(photoId);
    try {
      // 1. Unset any existing hero (DB trigger might handle this, but being explicit is safe)
      await supabase.from("photos").update({ is_hero: false }).neq("id", "00000000-0000-0000-0000-000000000000");

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

  const handleDelete = async (photoId: string, storagePath: string, animatedPath?: string) => {
    if (!confirm("Are you sure you want to delete this media?")) return;

    setProcessingId(photoId);
    try {
      const filesToRemove = [storagePath];
      if (animatedPath) filesToRemove.push(animatedPath);

      // Delete from storage
      const { error: storageError } = await supabase.storage.from("photos").remove(filesToRemove);
      if (storageError) throw storageError;

      // Delete from DB
      const { error: dbError } = await supabase.from("photos").delete().eq("id", photoId);
      if (dbError) throw dbError;

      toast({ title: "Item deleted" });
      refetch();
      if (editingPhoto?.id === photoId) setEditingPhoto(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete item: " + error.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveDestination = async (photoId: string, destId: string) => {
    try {
      const destinationId = destId === "none" ? null : destId;
      const { error } = await supabase.from("photos").update({ destination_id: destinationId }).eq("id", photoId);

      if (error) throw error;

      toast({ title: "Location updated" });
      refetch();
      // Update local state to reflect change immediately in dialog
      setEditingPhoto((prev: any) => ({ ...prev, destination_id: destinationId }));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update location",
      });
    }
  };

  const handleAnimatedUpload = async (e: React.ChangeEvent<HTMLInputElement>, photoId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      animatedFileSchema.parse({ size: file.size, type: file.type });
    } catch (validationError: any) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validationError.errors?.[0]?.message || "Invalid file",
      });
      return;
    }

    setUploadingAnimation(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/animated/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("photos").upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("photos")
        .update({ animated_path: fileName })
        .eq("id", photoId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Animated version attached to photo",
      });
      refetch();
      setEditingPhoto(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setUploadingAnimation(false);
    }
  };

  if (photosLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
        <div>
          <h3 className="text-lg font-semibold">Media Library</h3>
          <p className="text-sm text-muted-foreground">Manage your photos, videos, and hero images.</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {photos?.length || 0} items
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {photos?.map((photo) => {
          const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}`;
          const isVideo = photo.mime_type?.startsWith("video/");
          const isProcessing = processingId === photo.id;

          return (
            <Card
              key={photo.id}
              className={`group relative overflow-hidden transition-all duration-300 ${
                photo.is_hero ? "ring-2 ring-primary shadow-lg scale-[1.02] z-10" : "hover:shadow-md"
              }`}
            >
              {/* Image Thumbnail */}
              <div className="aspect-[4/3] bg-muted relative">
                {isVideo ? (
                  <video
                    src={publicUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    onMouseOver={(e) => e.currentTarget.play()}
                    onMouseOut={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                ) : (
                  <img
                    src={publicUrl}
                    alt={photo.title || "Travel photo"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                )}

                {/* Overlays */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                {/* Top Status Icons */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {photo.is_hero && (
                    <Badge className="bg-primary/90 hover:bg-primary shadow-sm text-[10px] h-5 px-1.5 gap-1">
                      <Star className="w-3 h-3 fill-current" /> Hero
                    </Badge>
                  )}
                  {photo.animated_path && (
                    <Badge
                      variant="secondary"
                      className="bg-white/90 shadow-sm text-[10px] h-5 px-1.5 gap-1 text-black"
                    >
                      <Film className="w-3 h-3" /> Motion
                    </Badge>
                  )}
                </div>

                <div className="absolute top-2 right-2 text-white/90 drop-shadow-md">
                  {isVideo && <Video className="w-4 h-4" />}
                </div>

                {/* Loading State Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-20">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}

                {/* Hover Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200 flex justify-between items-center gap-2">
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant={photo.is_hero ? "secondary" : "default"}
                      className={`h-8 w-8 rounded-full shadow-sm ${photo.is_hero ? "bg-white text-yellow-500 hover:bg-white/90" : "bg-white/20 hover:bg-primary backdrop-blur-md"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetHero(photo.id, photo.is_hero || false);
                      }}
                      title={photo.is_hero ? "Currently Hero Image" : "Set as Hero Image"}
                    >
                      <Star className={`w-4 h-4 ${photo.is_hero ? "fill-current" : ""}`} />
                    </Button>

                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8 rounded-full shadow-sm opacity-90 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(photo.id, photo.storage_path, photo.animated_path);
                      }}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 px-3 text-xs bg-white/90 hover:bg-white text-black shadow-sm backdrop-blur-md"
                    onClick={() => setEditingPhoto(photo)}
                  >
                    <Edit2 className="w-3 h-3 mr-1.5" /> Edit
                  </Button>
                </div>
              </div>

              {/* Minimal Info Footer */}
              <div className="p-3 bg-card border-t text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{photo.destinations ? photo.destinations.name : "No location"}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPhoto} onOpenChange={(open) => !open && setEditingPhoto(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Media Details</DialogTitle>
            <DialogDescription>Update location or add motion effects to this photo.</DialogDescription>
          </DialogHeader>

          {editingPhoto && (
            <div className="space-y-6 py-4">
              {/* Preview */}
              <div className="flex gap-4 items-start">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0 border">
                  <img
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${editingPhoto.storage_path}`}
                    className="w-full h-full object-cover"
                    alt="Preview"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{editingPhoto.title || "Untitled Media"}</p>
                  <p className="text-xs text-muted-foreground">
                    {(editingPhoto.file_size / 1024 / 1024).toFixed(2)} MB • {editingPhoto.mime_type}
                  </p>
                  {editingPhoto.is_hero && (
                    <Badge
                      variant="outline"
                      className="mt-2 text-[10px] border-yellow-500/50 text-yellow-600 bg-yellow-50"
                    >
                      <Star className="w-3 h-3 mr-1 fill-yellow-500" /> Hero Image
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Linked Location</Label>
                  <Select
                    value={editingPhoto.destination_id || "none"}
                    onValueChange={(val) => handleSaveDestination(editingPhoto.id, val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a destination..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific location</SelectItem>
                      {destinations?.map((dest) => (
                        <SelectItem key={dest.id} value={dest.id}>
                          {dest.name}, {dest.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!editingPhoto.mime_type?.startsWith("video/") && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-primary" />
                      Animated Version (Motion Photo)
                    </Label>
                    <div className="text-xs text-muted-foreground mb-2">
                      Upload a short video loop (MP4/WebM) to bring this photo to life when used as the Hero image.
                    </div>

                    {editingPhoto.animated_path ? (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
                        <Film className="w-4 h-4" />
                        <span className="text-xs flex-1 truncate">Animation active</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:text-destructive"
                          onClick={() => {
                            // Logic to remove animation could go here
                            toast({ description: "To remove animation, please overwrite it or delete the photo." });
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          accept="video/mp4,video/webm,image/gif,image/webp"
                          className="text-xs"
                          disabled={uploadingAnimation}
                          onChange={(e) => handleAnimatedUpload(e, editingPhoto.id)}
                        />
                        {uploadingAnimation && (
                          <div className="flex items-center px-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPhoto(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
