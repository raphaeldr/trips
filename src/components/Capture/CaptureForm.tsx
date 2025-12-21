import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Send, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type MediaType = "photo" | "video" | "audio" | "text" | null;

interface CaptureFormProps {
    type: MediaType;
    onBack: () => void;
    onClose: () => void;
}

export const CaptureForm = ({ type, onBack, onClose }: CaptureFormProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [caption, setCaption] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    useEffect(() => {
        // Auto-trigger file input for media types
        if ((type === "photo" || type === "video" || type === "audio") && !file) {
            fileInputRef.current?.click();
        }

        // Auto-fetch location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                (error) => {
                    console.error("Error getting location:", error);
                    // Don't block, just continue without location
                }
            );
        }
    }, [type, file]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
        } else if (!file) {
            // If they cancelled file picker and haven't selected one, go back
            onBack();
        }
    };

    const findDestinationId = async (date: Date) => {
        const { data: destinations } = await supabase
            .from("destinations")
            .select("id, arrival_date, departure_date");

        if (!destinations) return null;

        // Simple check if date is within range
        // Note: This relies on dates being comparable strings or proper timestamps
        const match = destinations.find(d => {
            const start = new Date(d.arrival_date);
            const end = d.departure_date ? new Date(d.departure_date) : new Date(8640000000000000); // far future
            return date >= start && date <= end;
        });

        return match?.id || null;
    };

    const handleSubmit = async () => {
        if (!type) return;
        if (type !== 'text' && !file) return;

        setIsUploading(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;

            // We allow anonymous uploads or handle auth externally? 
            // The schema says user_id is required. 
            // Assuming app handles auth or we have a default user. 
            // If no user, maybe we can't upload. But let's assume user is logged in or we fail gracefully.
            if (!user) {
                throw new Error("You must be logged in to capture moments.");
            }

            let storagePath = null;
            let width = null;
            let height = null;

            // 1. Upload File
            if (file && type !== 'text') {
                const fileExt = file.name.split(".").pop();
                const fileName = `${crypto.randomUUID()}.${fileExt}`;
                const filePath = `${fileName}`; // relative to bucket root or specific folder? "moments/..."?
                // Check bucket structure in Home.tsx: 
                // supabase.storage.from("photos").getPublicUrl(moment.storage_path)
                // Usually path is stored as "filename.jpg" or "folder/filename.jpg"

                const { error: uploadError, data } = await supabase.storage
                    .from("photos")
                    .upload(filePath, file);

                if (uploadError) throw uploadError;
                storagePath = filePath;

                // Basic image dimensions (optional optimization)
                if (type === 'photo') {
                    const img = new Image();
                    img.src = previewUrl!;
                    await new Promise(resolve => img.onload = resolve);
                    width = img.width;
                    height = img.height;
                }
            }

            // 2. Find Destination
            const now = new Date();
            const destinationId = await findDestinationId(now);

            // 3. Insert Record
            const { error: insertError } = await supabase
                .from("moments")
                .insert({
                    user_id: user.id,
                    media_type: type,
                    storage_path: storagePath,
                    caption: caption || null, // Ensure empty string becomes null
                    taken_at: now.toISOString(),
                    latitude: location?.lat || null,
                    longitude: location?.lng || null,
                    destination_id: destinationId,
                    status: 'draft',
                    width: width,
                    height: height,
                    mime_type: file?.type || 'text/plain',
                    title: type === 'text' ? (caption ? caption.slice(0, 30) : "Note") : null
                });

            if (insertError) throw insertError;

            // 4. Success
            toast({
                title: "Moment Captured!",
                description: "Your moment has been saved (Draft).",
            });

            queryClient.invalidateQueries({ queryKey: ["recentMomentsHome"] });
            queryClient.invalidateQueries({ queryKey: ["moments_public"] });
            onClose();

        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save moment.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="icon" onClick={onBack} disabled={isUploading}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <span className="font-semibold capitalize">{type}</span>
                {location && <MapPin className="w-4 h-4 text-green-500 ml-auto" />}
            </div>

            <div className="flex-1 space-y-4">
                {/* Media Preview or Text Input */}
                <div className="bg-muted rounded-xl overflow-hidden min-h-[200px] flex items-center justify-center relative">
                    {type === "text" ? (
                        <Textarea
                            placeholder="Write your thought..."
                            className="h-full min-h-[200px] border-none focus-visible:ring-0 text-lg bg-transparent p-4 resize-none leading-relaxed"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            autoFocus
                        />
                    ) : previewUrl ? (
                        type === "video" ? (
                            <video src={previewUrl} className="w-full h-full object-cover max-h-[400px]" controls />
                        ) : (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover max-h-[400px]" />
                        )
                    ) : (
                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-xs">Waiting for camera...</span>
                        </div>
                    )}
                </div>

                {/* Caption Input for Media */}
                {type !== "text" && (
                    <Input
                        placeholder="Add a caption (optional)..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="bg-muted/50 border-input"
                    />
                )}
            </div>

            <div className="mt-6">
                <Button className="w-full h-12 text-base font-semibold" onClick={handleSubmit} disabled={isUploading || (type === "text" && !caption)}>
                    {isUploading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
                        </>
                    ) : (
                        <>
                            Save Moment <Send className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            </div>

            {/* Hidden File Input */}
            {type !== "text" && (
                <input
                    type="file"
                    accept={type === 'photo' ? "image/*" : type === "video" ? "video/*" : "audio/*"}
                    capture="environment"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
            )}
        </div>
    );
};
