import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, Camera, Video, Mic, FileText, Square, Circle } from "lucide-react";
import ExifReader from "exifreader";
import { z } from "zod";

interface MomentCaptureProps {
  onCaptureComplete?: () => void;
}

type MediaType = "photo" | "video" | "audio" | "text";

export const MomentCapture = ({ onCaptureComplete }: MomentCaptureProps) => {
  const [uploading, setUploading] = useState(false);
  const [mediaType, setMediaType] = useState<MediaType>("photo");
  const [textContent, setTextContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const fileSchema = z.object({
    size: z.number().max(50 * 1024 * 1024, { message: "File size must be less than 50MB" }),
    type: z.string().regex(
      /^(image\/(jpeg|jpg|png|webp|heic)|video\/(mp4|webm)|audio\/(mp3|mpeg|wav|webm|ogg))$/i,
      { message: "Supported formats: JPEG, PNG, WebP, HEIC, MP4, WebM, MP3, WAV" }
    ),
  });

  const extractExifData = async (file: File) => {
    if (!file.type.startsWith("image/")) return {};

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

  const getMediaTypeFromFile = (file: File): MediaType => {
    if (file.type.startsWith("image/")) return "photo";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "photo";
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      for (const file of Array.from(files)) {
        const exifData = await extractExifData(file);
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const detectedMediaType = getMediaTypeFromFile(file);

        const { error: uploadError } = await supabase.storage.from("photos").upload(fileName, file);
        if (uploadError) throw uploadError;

        const momentData: any = {
          user_id: user.id,
          storage_path: fileName,
          title: null, // Moments do not have titles
          mime_type: file.type,
          file_size: file.size,
          status: "published", // Default to published as requested
          media_type: detectedMediaType,
          caption: null, // Captions are added later
          ...exifData,
        };

        const { error: dbError } = await supabase.from("moments").insert(momentData);
        if (dbError) throw dbError;
      }

      toast({
        title: "Moment captured!",
        description: `${files.length} ${files.length > 1 ? "items" : "item"} saved as draft.`,
      });

      if (onCaptureComplete) onCaptureComplete();
      e.target.value = "";
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Capture failed",
        description: error.message || "Failed to save moment. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Microphone access denied",
        description: "Please allow microphone access to record audio.",
      });
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveAudioMoment = async () => {
    if (!audioBlob) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileName = `${user.id}/${Date.now()}_audio.webm`;
      const { error: uploadError } = await supabase.storage.from("photos").upload(fileName, audioBlob);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("moments").insert({
        user_id: user.id,
        storage_path: fileName,
        title: null,
        mime_type: "audio/webm",
        file_size: audioBlob.size,
        status: "published",
        media_type: "audio",
        caption: null,
      });
      if (dbError) throw dbError;

      toast({ title: "Voice note saved!" });
      setAudioBlob(null);
      if (onCaptureComplete) onCaptureComplete();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const saveTextMoment = async () => {
    if (!textContent.trim()) {
      toast({ variant: "destructive", title: "Please enter some text" });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: dbError } = await supabase.from("moments").insert({
        user_id: user.id,
        storage_path: null,
        // For text moments, the content IS the "file". 
        // We'll store it in caption for now, as text moments are unique.
        // Or we could store it in 'description' or a new 'content' field.
        // User schema says "Content: short text note". 
        // Let's use 'caption' or 'description' as the container for the text note itself.
        caption: textContent,
        title: null,
        mime_type: "text/plain",
        status: "published",
        media_type: "text",
      });
      if (dbError) throw dbError;

      toast({ title: "Note saved!" });
      setTextContent("");
      if (onCaptureComplete) onCaptureComplete();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const getAcceptTypes = () => {
    switch (mediaType) {
      case "photo":
        return "image/jpeg,image/jpg,image/png,image/webp,image/heic";
      case "video":
        return "video/mp4,video/webm";
      case "audio":
        return "audio/mp3,audio/mpeg,audio/wav,audio/webm,audio/ogg";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={mediaType} onValueChange={(v) => setMediaType(v as MediaType)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="photo" className="gap-2">
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Photo</span>
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-2">
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Video</span>
          </TabsTrigger>
          <TabsTrigger value="audio" className="gap-2">
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Audio</span>
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Text</span>
          </TabsTrigger>
        </TabsList>

        {/* Photo/Video Upload */}
        <TabsContent value="photo" className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors group">
            <Label htmlFor="photo-upload" className="cursor-pointer block">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium">{uploading ? "Uploading..." : "Tap to add photos"}</p>
                  <p className="text-sm text-muted-foreground">JPEG, PNG, WebP up to 50MB</p>
                </div>
              </div>
              <Input
                id="photo-upload"
                type="file"
                accept={getAcceptTypes()}
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </Label>
          </div>
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors group">
            <Label htmlFor="video-upload" className="cursor-pointer block">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                  <Video className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium">{uploading ? "Uploading..." : "Tap to add videos"}</p>
                  <p className="text-sm text-muted-foreground">MP4, WebM up to 50MB</p>
                </div>
              </div>
              <Input
                id="video-upload"
                type="file"
                accept={getAcceptTypes()}
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </Label>
          </div>
        </TabsContent>

        {/* Audio Recording */}
        <TabsContent value="audio" className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              {!audioBlob ? (
                <>
                  <Button
                    size="lg"
                    variant={isRecording ? "destructive" : "default"}
                    className="rounded-full w-20 h-20"
                    onClick={isRecording ? stopAudioRecording : startAudioRecording}
                    disabled={uploading}
                  >
                    {isRecording ? <Square className="w-8 h-8" /> : <Circle className="w-8 h-8 fill-current" />}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {isRecording ? "Tap to stop recording" : "Tap to start recording"}
                  </p>
                </>
              ) : (
                <>
                  <audio src={URL.createObjectURL(audioBlob)} controls className="w-full max-w-xs" />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setAudioBlob(null)}>
                      Discard
                    </Button>
                    <Button onClick={saveAudioMoment} disabled={uploading}>
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save Voice Note
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Or upload audio file */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Or upload an audio file:</p>
            <Label htmlFor="audio-upload" className="cursor-pointer">
              <Input
                id="audio-upload"
                type="file"
                accept={getAcceptTypes()}
                onChange={handleFileUpload}
                disabled={uploading}
                className="max-w-xs mx-auto"
              />
            </Label>
          </div>
        </TabsContent>

        {/* Text Note */}
        <TabsContent value="text" className="space-y-4">
          <Textarea
            placeholder="Write a quick note about your travels..."
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            className="min-h-[150px]"
          />
          <Button onClick={saveTextMoment} disabled={uploading || !textContent.trim()} className="w-full">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Note
          </Button>
        </TabsContent>
      </Tabs>

      {uploading && (
        <div className="flex items-center justify-center gap-2 text-primary animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Saving moment...</span>
        </div>
      )}
    </div>
  );
};
