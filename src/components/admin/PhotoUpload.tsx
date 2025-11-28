import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, Video } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ExifReader from "exifreader";
import { z } from "zod";

interface PhotoUploadProps {
  onUploadComplete?: () => void;
}

export const PhotoUpload = ({ onUploadComplete }: PhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedDestId, setSelectedDestId] = useState<string>("none");
  const { toast } = useToast();

  const { data: destinations } = useQuery({
    queryKey: ["destinations-upload-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("id, name, country")
        .order("arrival_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Increased limit to 50MB for videos
  const fileSchema = z.object({
    size: z.number().max(50 * 1024 * 1024, { message: "File size must be less than 50MB" }),
    type: z.string().regex(/^(image\/(jpeg|jpg|png|webp|heic)|video\/(mp4|webm))$/i, {
      message: "Supported formats: JPEG, PNG, WebP, HEIC, MP4, WebM",
    }),
  });

  const extractExifData = async (file: File) => {
    // Skip EXIF for videos
    if (file.type.startsWith("video/")) return {};

    try {
      const tags = await ExifReader.load(file);

      let latitude = null;
      let longitude = null;

      if (tags.GPSLatitude && tags.GPSLongitude) {
        const latRef = tags.GPSLatitudeRef?.description || "N";
        const lonRef = tags.GPSLongitudeRef?.description || "E";

        latitude = tags.GPSLatitude.description;
        longitude = tags.GPSLongitude.description;

        if (latRef === "S") latitude = -latitude;
        if (lonRef === "W") longitude = -longitude;
      }

      const dateTaken = tags.DateTimeOriginal?.description || tags.DateTime?.description || null;

      const cameraMake = tags.Make?.description || null;
      const cameraModel = tags.Model?.description || null;
      const width = tags.ImageWidth?.value || null;
      const height = tags.ImageHeight?.value || null;

      return {
        latitude,
        longitude,
        taken_at: dateTaken ? new Date(dateTaken.replace(/:/g, "-").replace(" ", "T")) : null,
        camera_make: cameraMake,
        camera_model: cameraModel,
        width,
        height,
      };
    } catch (error) {
      return {};
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        fileSchema.parse({ size: file.size, type: file.type });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: `${file.name}: ${validationError.errors[0].message}`,
          });
          return;
        }
      }
    }

    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const file of Array.from(files)) {
        const exifData = await extractExifData(file);
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from("photos").upload(fileName, file);

        if (uploadError) throw uploadError;

        const photoData: any = {
          user_id: user.id,
          destination_id: selectedDestId === "none" ? null : selectedDestId,
          storage_path: fileName,
          title: file.name,
          mime_type: file.type,
          file_size: file.size,
          description: null,
          ...exifData,
        };

        const { error: dbError } = await supabase.from("photos").insert(photoData);

        if (dbError) throw dbError;
      }

      toast({
        title: "Success!",
        description: `${files.length} items uploaded successfully.`,
      });

      if (onUploadComplete) onUploadComplete();
      e.target.value = "";
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload files. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Link to Destination (Optional)</Label>
        <Select value={selectedDestId} onValueChange={setSelectedDestId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a destination for this batch..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No specific destination</SelectItem>
            {destinations?.map((dest) => (
              <SelectItem key={dest.id} value={dest.id}>
                {dest.name}, {dest.country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Selected destination will be applied to all photos and videos in this batch.
        </p>
      </div>

      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors group">
        <Label htmlFor="photo-upload" className="cursor-pointer block h-full w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground mb-1">
                {uploading ? "Uploading..." : "Click to upload media"}
              </p>
              <p className="text-sm text-muted-foreground">
                Photos (JPEG, PNG, WebP) or Videos (MP4, WebM) up to 50MB.
              </p>
            </div>
          </div>
          <Input
            id="photo-upload"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,video/mp4,video/webm"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </Label>
      </div>

      {uploading && (
        <div className="flex items-center justify-center gap-2 text-primary animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Processing & uploading media...</span>
        </div>
      )}
    </div>
  );
};
