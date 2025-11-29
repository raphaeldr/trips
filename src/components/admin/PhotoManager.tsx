import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Star, Trash2, Video, Edit2, Film, X, ImageIcon, Image as LucideImage } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

// Schema for animated files (video or gif)
const animatedFileSchema = z.object({
  size: z.number().max(50 * 1024 * 1024, { message: "File size must be less than 50MB" }),
  type: z.string().regex(/^(video\/(mp4|webm)|image\/(gif|webp))$/i, {
    message: "Only MP4, WebM video or GIF/WebP animations are allowed",
  }),
});

export const PhotoManager = () => {
  const [editingPhoto, setEditingPhoto] = useState<any | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [uploadingAnimation, setUploadingAnimation] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
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

  // --- Filtering & Pagination ---

  const filteredPhotos = photos?.filter((photo) => {
    if (activeTab === "hero") return photo.is_hero;
    if (activeTab === "videos") return photo.mime_type?.startsWith("video/") || photo.animated_path;
    if (activeTab === "images") return !photo.mime_type?.startsWith("video/");
    return true;
  });

  const totalPages = Math.ceil((filteredPhotos?.length || 0) / itemsPerPage);
  const paginatedPhotos = filteredPhotos?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- Actions ---

  const handleSetHero = async (photoId: string, isCurrentHero: boolean) => {
    if (isCurrentHero) return; // Already hero

    setProcessingId(photoId);
    try {
      // 1. Unset any existing hero
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-4 rounded-lg border shadow-sm gap-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Media Library
            </h3>
            <p className="text-sm text-muted-foreground">Manage your photos, videos, and hero images.</p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            {photos?.length || 0} items
          </Badge>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v);
            setCurrentPage(1);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full sm:w-[400px] grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="hero" className="text-yellow-600 data-[state=active]:text-yellow-700">
              <Star className="w-3.5 h-3.5 mr-1" /> Hero
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {paginatedPhotos?.map((photo) => {
                const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}`;
                const isVideo = photo.mime_type?.startsWith("video/");
                const animatedUrl = photo.animated_path
                  ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${photo.animated_path}`
                  : null;
                const isProcessing = processingId === photo.id;

                return (
                  <Card
                    key={photo.id}
                    className={`group flex flex-col overflow-hidden transition-all duration-300 ${
                      photo.is_hero ? "ring-2 ring-primary shadow-lg scale-[1.01]" : "hover:shadow-md"
                    }`}
                  >
                    {/* Image/Video Thumbnail */}
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {isVideo || animatedUrl ? (
                        <video
                          src={isVideo ? publicUrl : animatedUrl!}
                          poster={isVideo ? undefined : publicUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          loop
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

                      {/* Status Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1.5 pointer-events-none">
                        {photo.is_hero && (
                          <Badge className="bg-primary/90 hover:bg-primary shadow-sm text-[10px] h-5 px-1.5 gap-1 animate-in fade-in zoom-in">
                            <Star className="w-3 h-3 fill-current" /> Hero
                          </Badge>
                        )}
                        {photo.animated_path && (
                          <Badge
                            variant="secondary"
                            className="bg-white/90 shadow-sm text-[10px] h-5 px-1.5 gap-1 text-black backdrop-blur-sm"
                          >
                            <Film className="w-3 h-3" /> Motion
                          </Badge>
                        )}
                      </div>

                      {/* Type Icon */}
                      <div className="absolute top-2 right-2 text-white/90 drop-shadow-md pointer-events-none">
                        {isVideo ? <Video className="w-4 h-4" /> : <LucideImage className="w-4 h-4 opacity-80" />}
                      </div>

                      {/* Loading State Overlay */}
                      {isProcessing && (
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-20">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Card Footer Content */}
                    <div className="flex flex-col flex-1 p-3 gap-3">
                      {/* Location Info */}
                      <div
                        className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0"
                        title={
                          photo.destinations
                            ? `${photo.destinations.name}, ${photo.destinations.country}`
                            : "No location linked"
                        }
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                        <span className="truncate font-medium">
                          {photo.destinations ? photo.destinations.name : "Unassigned"}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-3 gap-2 mt-auto pt-2 border-t border-border/50">
                        <Button
                          variant={photo.is_hero ? "secondary" : "outline"}
                          size="sm"
                          className={`h-8 px-0 text-xs ${photo.is_hero ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200" : ""}`}
                          onClick={() => handleSetHero(photo.id, photo.is_hero || false)}
                          disabled={isProcessing}
                          title={photo.is_hero ? "Unset Hero" : "Set as Hero"}
                        >
                          <Star className={`w-3.5 h-3.5 ${photo.is_hero ? "fill-current" : "mr-1"}`} />
                          {!photo.is_hero && "Hero"}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-0 text-xs hover:bg-muted"
                          onClick={() => setEditingPhoto(photo)}
                          disabled={isProcessing}
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-0 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(photo.id, photo.storage_path, photo.animated_path)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Del
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <div className="flex items-center px-4 text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </div>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}

            {filteredPhotos?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No items found in this category.</div>
            )}
          </TabsContent>
        </Tabs>
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
              <div className="flex gap-4 items-start p-3 bg-muted/30 rounded-lg border">
                <div className="relative w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0 border">
                  {editingPhoto.mime_type?.startsWith("video/") ? (
                    <video
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${editingPhoto.storage_path}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${editingPhoto.storage_path}`}
                      className="w-full h-full object-cover"
                      alt="Preview"
                    />
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate" title={editingPhoto.title}>
                    {editingPhoto.title || "Untitled Media"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(editingPhoto.file_size / 1024 / 1024).toFixed(2)} MB • {editingPhoto.mime_type}
                  </p>
                  {editingPhoto.is_hero && (
                    <div className="flex items-center gap-1 text-[10px] text-yellow-600 font-medium mt-1.5">
                      <Star className="w-3 h-3 fill-current" /> Currently Hero Image
                    </div>
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
                  <div className="space-y-2 pt-4 border-t">
                    <Label className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-primary" />
                      Animated Version (Motion Photo)
                    </Label>
                    <div className="text-xs text-muted-foreground mb-3">
                      Upload a short video loop (MP4/WebM) to bring this photo to life when used as the Hero image.
                    </div>

                    {editingPhoto.animated_path ? (
                      <div className="flex items-center gap-2 p-2 bg-green-50/50 border border-green-100 rounded-md">
                        <Film className="w-4 h-4 text-green-600" />
                        <span className="text-xs flex-1 text-green-700 font-medium">Animation active</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:text-destructive hover:bg-destructive/10 text-muted-foreground"
                          onClick={() => {
                            toast({ description: "To remove animation, please overwrite it or delete the photo." });
                          }}
                          title="Remove animation"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          accept="video/mp4,video/webm,image/gif,image/webp"
                          className="text-xs h-9"
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
