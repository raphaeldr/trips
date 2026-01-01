import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Send, MapPin, Mic, Square, Circle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import ExifReader from 'exifreader';
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { uploadMedia } from "@/utils/IngestionEngine";

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

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Location State
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationName, setLocationName] = useState("");
    const [countryName, setCountryName] = useState("");
    const [isLocating, setIsLocating] = useState(false);
    const [locationSource, setLocationSource] = useState<'exif' | 'device' | 'manual' | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Helper: Reverse Geocode
    const fetchLocationName = async (lat: number, lng: number) => {
        try {
            const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,locality,country&access_token=${MAPBOX_TOKEN}`
            );
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                // Find place and country
                const placeFeature = data.features.find((f: any) => f.place_type.includes('place') || f.place_type.includes('locality'));
                const countryFeature = data.features.find((f: any) => f.place_type.includes('country'));

                setLocationName(placeFeature?.text || data.features[0].text);
                setCountryName(countryFeature?.text || "");
            }
        } catch (e) {
            console.error("Reverse geocoding failed", e);
        }
    };

    // Audio Recording Functions
    const mimeTypeRef = useRef<string>("");

    const startAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Prefer MP4 (AAC) for better compatibility (Safari/iOS), fallback to WebM
            const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
                ? "audio/mp4"
                : MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "";

            mimeTypeRef.current = mimeType;

            const options = mimeType ? { mimeType } : undefined;
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const type = mimeTypeRef.current || mediaRecorder.mimeType || "audio/webm";
                const blob = new Blob(audioChunksRef.current, { type });

                if (blob.size === 0) {
                    toast({ variant: "destructive", title: "Recording failed", description: "Audio clip was empty." });
                    return;
                }

                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);

                // Convert Blob to File
                // Ensure extension matches mime type
                const ext = type.includes("mp4") ? "mp4" : "webm";
                const audioFile = new File([blob], `recording.${ext}`, { type });
                setFile(audioFile);

                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
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
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const discardAudio = () => {
        setAudioBlob(null);
        setPreviewUrl(null);
        setFile(null);
        setRecordingDuration(0);
    };

    useEffect(() => {
        // Auto-trigger file input for media types (except audio which is manual record first)
        if ((type === "photo" || type === "video") && !file) {
            fileInputRef.current?.click();
        }

        // Initialize Device Location (Background)
        // Only if we haven't found a location from EXIF yet
        if (navigator.geolocation && !locationSource) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Only use device location if we haven't already got one from EXIF
                    // We check inside the callback because EXIF processing might have finished by now
                    setLocation(prev => {
                        if (locationSource === 'exif') return prev; // Keep EXIF

                        const newLoc = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        setLocationSource('device');
                        fetchLocationName(newLoc.lat, newLoc.lng);
                        return newLoc;
                    });
                    setIsLocating(false);
                },
                (error) => {
                    console.error("Error getting device location:", error);
                    setIsLocating(false);
                }
            );
        }
    }, [type]); // Run once on mount (basically)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);

            // Attempt EXIF Extraction for Photos
            if (type === 'photo') {
                try {
                    const tags = await ExifReader.load(selectedFile);
                    const gpsLat = tags['GPSLatitude'];
                    const gpsLng = tags['GPSLongitude'];
                    const gpsLatRef = tags['GPSLatitudeRef'];
                    const gpsLngRef = tags['GPSLongitudeRef'];

                    if (gpsLat && gpsLng && gpsLatRef && gpsLngRef) {
                        // Parse helper
                        const convertDMSToDD = (dms: any, ref: string) => {
                            if (!dms || !dms.value) return null;

                            const d = dms.value[0][0] / dms.value[0][1];
                            const m = dms.value[1][0] / dms.value[1][1];
                            const s = dms.value[2][0] / dms.value[2][1];

                            let dd = d + m / 60 + s / 3600;
                            if (ref === "S" || ref === "W") {
                                dd = dd * -1;
                            }
                            return dd;
                        };

                        const lat = convertDMSToDD(gpsLat, gpsLatRef.value[0] as string);
                        const lng = convertDMSToDD(gpsLng, gpsLngRef.value[0] as string);

                        if (lat !== null && lng !== null) {
                            setLocation({ lat, lng });
                            setLocationSource('exif');
                            fetchLocationName(lat, lng);
                            toast({
                                title: "Location found",
                                description: "Extracted location from photo.",
                            });
                        }
                    }
                } catch (error) {
                    console.log("No EXIF GPS data found or error parsing", error);
                    // Use fallback (device location) which is already running or set
                }
            }
        } else if (!file && type !== 'audio') { // For audio we don't go back just because file isn't set yet (could be recording)
            // If they cancelled file picker and haven't selected one, go back
            onBack();
        }
    };



    const handleSubmit = async () => {
        if (!type) return;
        if (type !== 'text' && !file) return;

        setIsUploading(true);
        try {
            // Map location state to IngestionEngine expected format
            const manualLocation = location ? {
                latitude: location.lat,
                longitude: location.lng
            } : undefined;

            const result = await uploadMedia({
                file: file || undefined,
                manualLocation,
                noteText: caption || undefined
            });

            if (result.success) {
                // 4. Success
                toast({
                    title: "Moment Captured!",
                    description: `Added to ${countryName || "Journey"}.`,
                });

                queryClient.invalidateQueries({ queryKey: ["recentMomentsHome"] });
                queryClient.invalidateQueries({ queryKey: ["moments_public"] });
                // Also invalidate local journey/segments if we want to reflect new segments immediately
                queryClient.invalidateQueries({ queryKey: ["journey_segments"] });

                onClose();
            }

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

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="icon" onClick={onBack} disabled={isUploading}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex flex-col">
                    <span className="font-semibold capitalize leading-none">{type}</span>
                    <span className="text-[10px] text-muted-foreground">
                        {isUploading ? "Uploading..." : locationSource === 'exif' ? "Extracted from photo" : locationSource === 'device' ? "From device" : "New moment"}
                    </span>
                </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pb-32">
                {/* Media Preview or Text Input or Recorder */}
                <div className="bg-muted rounded-xl overflow-hidden min-h-[200px] flex items-center justify-center relative shrink-0">
                    {type === "text" ? (
                        <Textarea
                            placeholder="Write your thought..."
                            className="h-full min-h-[200px] border-none focus-visible:ring-0 text-lg bg-transparent p-4 resize-none leading-relaxed"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            autoFocus
                        />
                    ) : type === "audio" && !previewUrl ? (
                        // Audio Recorder UI
                        <div className="flex flex-col items-center gap-6 p-8 w-full">
                            <div className={`relative flex items-center justify-center w-32 h-32 rounded-full border-4 ${isRecording ? "border-red-500 animate-pulse bg-red-50" : "border-muted-foreground/20 bg-background"}`}>
                                {isRecording ? (
                                    <div className="flex flex-col items-center">
                                        <div className="w-3 h-3 rounded-full bg-red-500 mb-2 animate-bounce" />
                                        <span className="font-mono text-2xl font-bold tabular-nums text-red-600">
                                            {formatDuration(recordingDuration)}
                                        </span>
                                    </div>
                                ) : (
                                    <Mic className="w-12 h-12 text-muted-foreground" />
                                )}
                            </div>

                            <div className="flex gap-4">
                                {isRecording ? (
                                    <Button
                                        variant="destructive"
                                        size="lg"
                                        className="h-14 px-8 rounded-full text-lg shadow-lg"
                                        onClick={stopAudioRecording}
                                    >
                                        <Square className="w-5 h-5 mr-2 fill-current" />
                                        Stop
                                    </Button>
                                ) : (
                                    <Button
                                        size="lg"
                                        className="h-14 px-8 rounded-full text-lg shadow-lg"
                                        onClick={startAudioRecording}
                                    >
                                        <Circle className="w-4 h-4 mr-2 fill-red-500 text-red-500" />
                                        Record
                                    </Button>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {isRecording ? "Tap to stop" : "Tap to record voice note"}
                            </p>
                        </div>
                    ) : previewUrl ? (
                        type === "video" ? (
                            <video src={previewUrl} className="w-full h-full object-cover max-h-[400px]" controls playsInline />
                        ) : type === "audio" ? (
                            <div className="w-full p-8 flex flex-col items-center justify-center gap-6 bg-secondary relative">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 rounded-full h-8 w-8 opacity-80 hover:opacity-100"
                                    onClick={discardAudio}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>

                                <div className="p-6 rounded-full bg-primary/10 text-primary">
                                    <Mic className="w-10 h-10" />
                                </div>
                                <div className="w-full max-w-sm">
                                    <audio src={previewUrl} className="w-full" controls />
                                </div>
                                <span className="text-xs text-muted-foreground">Voice note recorded</span>
                                <div className="text-[10px] text-gray-300 font-mono mt-2">
                                    Debug: {audioBlob?.type} / {audioBlob?.size} bytes
                                </div>
                            </div>
                        ) : (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover max-h-[400px]" />
                        )
                    ) : (
                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-xs">Waiting for {type}...</span>
                        </div>
                    )}
                </div>

                {/* Caption Input for Media */}
                {type !== "text" && (
                    <div className="space-y-4">
                        <Input
                            placeholder="Add a description (optional)..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="bg-muted/50 border-input"
                        />

                        {/* Location Fields - Place & Country */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <MapPin className={`w-3 h-3 ${locationSource ? "text-green-500" : ""}`} />
                                    Location
                                </label>
                                {isLocating && <span className="text-[10px] text-muted-foreground animate-pulse">Locating...</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="Place / City"
                                    value={locationName}
                                    onChange={(e) => {
                                        setLocationName(e.target.value);
                                        setLocationSource('manual');
                                    }}
                                    className={`bg-muted/50 border-input transition-colors ${locationSource === 'exif' ? "border-green-500/50 bg-green-50/10" : ""}`}
                                />
                                <Input
                                    placeholder="Country"
                                    value={countryName}
                                    onChange={(e) => {
                                        setCountryName(e.target.value);
                                        setLocationSource('manual');
                                    }}
                                    className={`bg-muted/50 border-input transition-colors ${locationSource === 'exif' ? "border-green-500/50 bg-green-50/10" : ""}`}
                                />
                            </div>
                            {locationSource && (
                                <p className="text-[10px] text-muted-foreground px-1">
                                    {locationSource === 'exif' ? "📍 Location detected from photo" : locationSource === 'device' ? "📍 Location detected from device" : "✏️ Custom location"}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Location for Text Type */}
                {type === "text" && (
                    <div className="space-y-1.5 pt-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <MapPin className={`w-3 h-3 ${locationSource ? "text-green-500" : ""}`} />
                                Location
                            </label>
                            {isLocating && <span className="text-[10px] text-muted-foreground animate-pulse">Locating...</span>}
                        </div>
                        <Input
                            placeholder="City, Country"
                            value={locationName}
                            onChange={(e) => {
                                setLocationName(e.target.value);
                                setLocationSource('manual');
                            }}
                            className="bg-muted/50 border-input"
                        />
                    </div>
                )}
            </div>

            <div className="mt-4 shrink-0 pb-6">
                <Button className="w-full h-12 text-base font-semibold" onClick={handleSubmit} disabled={isUploading || (type === "text" && !caption) || (type === "audio" && !file && !isRecording)}>
                    {isUploading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
                        </>
                    ) : (
                        <>
                            Save moment <Send className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            </div>

            {/* Hidden File Input */}
            {type !== "text" && type !== "audio" && (
                <input
                    type="file"
                    accept={type === 'photo' ? "image/*" : "video/*"}
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
            )}
            {/* Audio input allows uploading file too? Maybe later, keep it simple for now standard record */}
            {type === 'audio' && (
                <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
            )}
        </div>
    );
};

