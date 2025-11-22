import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Star } from "lucide-react";
import { z } from "zod";

export const HeroPhotoManager = () => {
  const { toast } = useToast();
  const [uploadingAnimated, setUploadingAnimated] = useState(false);

  const animatedFileSchema = z.object({
    size: z.number().max(50 * 1024 * 1024, { message: "Animated file size must be less than 50MB" }),
    type: z.string().regex(/^(video\/(mp4|webm)|image\/(gif|webp))$/i, { message: "Only MP4, WebM video or GIF/WebP animations are allowed" })
  });

  const { data: photos, isLoading, refetch } = useQuery({
    queryKey: ['allPhotos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const heroPhoto = photos?.find(p => p.is_hero);

  const handleSetHero = async (photoId: string) => {
    try {
      // First, unset all hero photos
      await supabase
        .from('photos')
        .update({ is_hero: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Then set the new hero photo
      const { error } = await supabase
        .from('photos')
        .update({ is_hero: true })
        .eq('id', photoId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Hero photo updated",
      });

      refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleAnimatedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !heroPhoto) return;

    try {
      animatedFileSchema.parse({ size: file.size, type: file.type });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: validationError.errors[0].message,
        });
        return;
      }
    }

    setUploadingAnimated(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/animated/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('photos')
        .update({ animated_path: fileName })
        .eq('id', heroPhoto.id);

      if (updateError) throw updateError;

      toast({
        title: "Success!",
        description: "Animated version uploaded successfully",
      });

      refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload animated version",
      });
    } finally {
      setUploadingAnimated(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {heroPhoto ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Star className="w-5 h-5 fill-current" />
            <p className="font-medium">Current Hero Photo</p>
          </div>
          
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            {heroPhoto.animated_path ? (
              <video
                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${heroPhoto.animated_path}`}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${heroPhoto.storage_path}`}
                alt={heroPhoto.title || 'Hero photo'}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="animated-upload" className="text-sm font-medium">
              Upload Animated Version (MP4, WebM, GIF, WebP)
            </Label>
            <div className="flex gap-2">
              <Input
                id="animated-upload"
                type="file"
                accept="video/mp4,video/webm,image/gif,image/webp"
                onChange={handleAnimatedUpload}
                disabled={uploadingAnimated}
              />
              {uploadingAnimated && (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Max 50MB. The animation should be subtle and loop seamlessly.
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center p-8 border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground mb-4">No hero photo set. Select one from your photos below:</p>
        </div>
      )}

      {photos && photos.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">All Photos</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <img
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}`}
                  alt={photo.title || 'Photo'}
                  className="w-full aspect-video object-cover rounded-lg"
                />
                <Button
                  size="sm"
                  variant={photo.is_hero ? "default" : "secondary"}
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleSetHero(photo.id)}
                >
                  {photo.is_hero ? (
                    <Star className="w-4 h-4 fill-current" />
                  ) : (
                    "Set as Hero"
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
