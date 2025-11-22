import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2 } from "lucide-react";
import ExifReader from "exifreader";
import { z } from "zod";

interface PhotoUploadProps {
  destinationId?: string;
  onUploadComplete?: () => void;
}

export const PhotoUpload = ({ destinationId, onUploadComplete }: PhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fileSchema = z.object({
    size: z.number().max(10 * 1024 * 1024, { message: "File size must be less than 10MB" }),
    type: z.string().regex(/^image\/(jpeg|jpg|png|webp|heic)$/i, { message: "Only JPEG, PNG, WebP, and HEIC images are allowed" })
  });

  const extractExifData = async (file: File) => {
    try {
      const tags = await ExifReader.load(file);
      
      // Extract GPS coordinates
      let latitude = null;
      let longitude = null;
      
      if (tags.GPSLatitude && tags.GPSLongitude) {
        const latRef = tags.GPSLatitudeRef?.description || 'N';
        const lonRef = tags.GPSLongitudeRef?.description || 'E';
        
        latitude = tags.GPSLatitude.description;
        longitude = tags.GPSLongitude.description;
        
        if (latRef === 'S') latitude = -latitude;
        if (lonRef === 'W') longitude = -longitude;
      }

      // Extract date taken
      const dateTaken = tags.DateTimeOriginal?.description || 
                       tags.DateTime?.description || 
                       null;

      // Extract camera info
      const cameraMake = tags.Make?.description || null;
      const cameraModel = tags.Model?.description || null;

      // Image dimensions
      const width = tags.ImageWidth?.value || null;
      const height = tags.ImageHeight?.value || null;

      return {
        latitude,
        longitude,
        taken_at: dateTaken ? new Date(dateTaken.replace(/:/g, '-').replace(' ', 'T')) : null,
        camera_make: cameraMake,
        camera_model: cameraModel,
        width,
        height,
      };
    } catch (error) {
      // EXIF extraction failed - continue without metadata
      return {};
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate each file
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const file of Array.from(files)) {
        // Extract EXIF data
        const exifData = await extractExifData(file);

        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        // Save to database with EXIF data
        const photoData: any = {
          user_id: user.id,
          destination_id: destinationId || null,
          storage_path: fileName,
          title: file.name,
          mime_type: file.type,
          file_size: file.size,
          ...exifData,
        };

        const { error: dbError } = await supabase
          .from('photos')
          .insert(photoData);

        if (dbError) throw dbError;

        // Trigger AI tagging in the background (don't wait for it)
        supabase.functions.invoke("tag-photo", {
          body: { photoId: (await supabase.from('photos').select('id').eq('storage_path', fileName).single()).data?.id },
        }).catch(console.error);
      }

      toast({
        title: "Success!",
        description: `${files.length} photo(s) uploaded successfully. AI tagging in progress...`,
      });

      if (onUploadComplete) onUploadComplete();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload photos. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
        <Label htmlFor="photo-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground mb-1">
                {uploading ? "Uploading..." : "Click to upload photos"}
              </p>
              <p className="text-sm text-muted-foreground">
                Max 10MB per file. JPEG, PNG, WebP, HEIC supported.
              </p>
            </div>
          </div>
          <Input
            id="photo-upload"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </Label>
      </div>

      {uploading && (
        <div className="flex items-center justify-center gap-2 text-primary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Processing photos...</span>
        </div>
      )}
    </div>
  );
};
