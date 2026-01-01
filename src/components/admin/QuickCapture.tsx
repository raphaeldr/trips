import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, MapPin, Mic, Image as ImageIcon, X, Play, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

interface QuickCaptureProps {
    onCaptureComplete?: () => void;
}

export const QuickCapture = ({ onCaptureComplete }: QuickCaptureProps) => {
    const [caption, setCaption] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [mediaType, setMediaType] = useState<"photo" | "video" | "audio" | "text">("text");

    // Location State
    const [locationName, setLocationName] = useState("");
    const [countryName, setCountryName] = useState("");
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLocating, setIsLocating] = useState(false);

    // Audio State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Reverse Geocode
    const fetchLocationName = async (lat: number, lng: number) => {
        try {
            const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,locality,country&access_token=${MAPBOX_TOKEN}`
            );
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                const placeFeature = data.features.find((f: any) => f.place_type.includes('place') || f.place_type.includes('locality'));
                const countryFeature = data.features.find((f: any) => f.place_type.includes('country'));
                setLocationName(placeFeature?.text || data.features[0].text);
                setCountryName(countryFeature?.text || "");
            }
        } catch (e) {
            console.error("Reverse geocoding failed", e);
        }
    };

    // Get Location on Mount
    useEffect(() => {
        if (navigator.geolocation) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newLoc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setLocation(newLoc);
                    fetchLocationName(newLoc.lat, newLoc.lng);
                    setIsLocating(false);
                },
                (error) => {
                    console.error("Location error", error);
                    setIsLocating(false);
                }
            );
        }
    }, []);

    // File Handling
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));

            const type = selectedFile.type.startsWith("video") ? "video" : "photo";
            setMediaType(type);
        }
    };

    const removeMedia = () => {
        setFile(null);
        setPreviewUrl(null);
        setAudioBlob(null);
        setMediaType("text");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Audio Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
            const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                setAudioBlob(blob);
                setPreviewUrl(URL.createObjectURL(blob));
                setFile(new File([blob], "recording.webm", { type: "audio/webm" }));
                setMediaType("audio");
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
        } catch (err) {
            console.error("Mic error", err);
            toast({ variant: "destructive", title: "Microphone access denied" });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    // Submit Logic
    const handleSubmit = async () => {
        if (!caption && !file) return;
        setIsUploading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            let storagePath = null;

            // Upload File
            if (file) {
                const ext = file.name.split(".").pop() || "jpg";
                const fileName = `${crypto.randomUUID()}.${ext}`;
                const filePath = `${user.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("photos")
                    .upload(filePath, file);

                if (uploadError) throw uploadError;
                storagePath = filePath;
            }

            // Find Destination based on Now
            // (Simplified logic: usually backend handles this or we query, but for speed we skip complex query here or mock it? 
            // The original component queried generic destinations. I'll just skip detailed destination matching for this "Quick" version or do a quick query if essential.
            // Let's bring back the simple destination query.)
            const { data: destinations } = await supabase.from("destinations").select("id, arrival_date, departure_date");
            const now = new Date();
            const destinationId = destinations?.find(d => {
                const start = new Date(d.arrival_date);
                const end = d.departure_date ? new Date(d.departure_date) : new Date(8640000000000000);
                return now >= start && now <= end;
            })?.id || null;


            // Insert Moment
            const { error } = await supabase.from("moments").insert({
                user_id: user.id,
                media_type: mediaType,
                storage_path: storagePath,
                caption: caption,
                taken_at: now.toISOString(),
                latitude: location?.lat,
                longitude: location?.lng,
                location_name: locationName,
                country: countryName,
                destination_id: destinationId,
                status: 'draft',
                title: mediaType === 'text' ? (caption.slice(0, 30) || "Note") : null
            });

            if (error) throw error;

            toast({ title: "Moment posted!", description: "Saved to drafts." });
            setCaption("");
            removeMedia();
            queryClient.invalidateQueries({ queryKey: ["adminStats"] });
            queryClient.invalidateQueries({ queryKey: ["recentMomentsHome"] });
            queryClient.invalidateQueries({ queryKey: ["recentMomentsAdmin"] });
            if (onCaptureComplete) onCaptureComplete();

        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setIsUploading(false);
        }
    };

    const placeholder = isLocating
        ? "Locating..."
        : locationName
            ? `What is happening in ${locationName} right now?`
            : "What is happening right now?";

    return (
        <div className="bg-card rounded-xl border shadow-sm p-0 overflow-hidden relative group transition-all hover:shadow-md">
            {/* Text Area */}
            <Textarea
                placeholder={placeholder}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[140px] border-none focus-visible:ring-0 resize-none p-6 text-lg placeholder:text-muted-foreground/50 bg-transparent"
            />

            {/* Media Preview Area */}
            {previewUrl && (
                <div className="px-6 pb-2">
                    <div className="relative rounded-lg overflow-hidden bg-muted border max-w-[200px] h-[120px] group/preview">
                        {mediaType === 'audio' ? (
                            <div className="w-full h-full flex items-center justify-center bg-secondary/50 text-primary">
                                <Mic className="w-6 h-6" />
                            </div>
                        ) : mediaType === 'video' ? (
                            <video src={previewUrl} className="w-full h-full object-cover" />
                        ) : (
                            <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                        )}

                        <button
                            onClick={removeMedia}
                            className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                            type="button"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Recording Indicator */}
            {isRecording && (
                <div className="px-6 pb-4 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium text-red-500">Recording... {recordingTime}s</span>
                    <Button variant="destructive" size="sm" className="h-6 text-xs" onClick={stopRecording}>Stop</Button>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 pb-4 bg-transparent mt-2">
                <div className="flex items-center gap-1">
                    {/* Add Photo */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-500 hover:text-primary hover:bg-primary/10 rounded-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isRecording || !!file}
                    >
                        <ImageIcon className="w-4 h-4" />
                    </Button>

                    {/* Voice Note */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-full ${isRecording ? "text-red-500 bg-red-50" : "text-neutral-500 hover:text-red-500 hover:bg-red-50"}`}
                        onClick={() => isRecording ? stopRecording() : startRecording()}
                        disabled={!!file && mediaType !== 'audio'}
                    >
                        <Mic className="w-4 h-4" />
                    </Button>

                    {/* Location (Static/Status for now) */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-full ${locationName ? "text-green-600 bg-green-50" : "text-neutral-500 hover:text-green-600 hover:bg-green-50"}`}
                        title={locationName || "No location"}
                        onClick={() => {/* Toggle manual location? Keep simple */ }}
                    >
                        <MapPin className="w-4 h-4" />
                    </Button>
                </div>

                {/* Post Button */}
                <Button
                    className="rounded-full px-6 h-8 text-xs font-semibold shadow-sm transition-all"
                    disabled={(!caption && !file) || isUploading || isRecording}
                    onClick={handleSubmit}
                >
                    {isUploading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : "Post Moment"}
                </Button>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileChange}
            />
        </div>
    );
};
