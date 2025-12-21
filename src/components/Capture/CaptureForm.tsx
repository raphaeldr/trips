import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Send, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import ExifReader from 'exifreader';
import { MAPBOX_TOKEN } from "@/lib/mapbox";

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

    // Location State
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationName, setLocationName] = useState("");
    const [isLocating, setIsLocating] = useState(false);
    const [locationSource, setLocationSource] = useState<'exif' | 'device' | 'manual' | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Helper: Reverse Geocode
    const fetchLocationName = async (lat: number, lng: number) => {
        try {
            const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,country&access_token=${MAPBOX_TOKEN}`
            );
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                // Find place and country
                const place = data.features.find((f: any) => f.place_type.includes('place'))?.text;
                const country = data.features.find((f: any) => f.place_type.includes('country'))?.text;

                let formatted = "";
                if (place && country) formatted = `${place}, ${country}`;
                else if (place) formatted = place;
                else if (country) formatted = country;
                else formatted = data.features[0].text; // Fallback

                setLocationName(formatted);
            }
        } catch (e) {
            console.error("Reverse geocoding failed", e);
        }
    };

    useEffect(() => {
        // Auto-trigger file input for media types
        if ((type === "photo" || type === "video" || type === "audio") && !file) {
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
                        // Convert DMS to Decimal
                        // ExifReader returns array of [numerator, denominator] usually, or simple number.
                        // Actually ExifReader standardizes this somewhat but let's be safe.
                        // The 'description' property usually holds the decimal value for modern ExifReader?
                        // Let's use the description if available, or calculate.
                        // Check documentation or debug... 
                        // ExifReader 4.x: tags.GPSLatitude.description is a number like 34.0522... NO, usually it's string.
                        // Better to use the raw values if needed, but let's try the library's processed values if available.
                        // Actually, easier way: 

                        // Parse helper
                        const convertDMSToDD = (dms: any, ref: string) => {
                            // dms is array of values usually [degrees, minutes, seconds]
                            // In ExifReader, `description` is often "34, 31.2, 0" string.
                            // `value` is array of 3 rational numbers.
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
            if (!user) {
                throw new Error("You must be logged in to capture moments.");
            }

            let storagePath = null;
            let width = null;
            let height = null;

            // 1. Upload File
            if (file && type !== 'text') {
                const fileExt = file.name.split(".").pop() || 'jpg';
                const fileName = `${crypto.randomUUID()}.${fileExt}`;
                // IMPORTANT: Must be in a folder named with user.id to satisfy RLS
                const filePath = `${user.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
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

            // 2. Find Destination (based on Taken At or Now?)
            // Ideally should match the photo date, but we use Now for simplicity unless we parse date from EXIF too
            const now = new Date();
            const destinationId = await findDestinationId(now);

            // 3. Insert Record
            const { error: insertError } = await supabase
                .from("moments")
                .insert({
                    user_id: user.id,
                    media_type: type,
                    storage_path: storagePath,
                    caption: caption || null,
                    taken_at: now.toISOString(),
                    latitude: location?.lat || null,
                    longitude: location?.lng || null,
                    location_name: locationName || null, // Saving the location string
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
                <div className="flex flex-col">
                    <span className="font-semibold capitalize leading-none">{type}</span>
                    <span className="text-[10px] text-muted-foreground">
                        {isUploading ? "Uploading..." : locationSource === 'exif' ? "Extracted from photo" : locationSource === 'device' ? "From device" : "New Moment"}
                    </span>
                </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pb-4">
                {/* Media Preview or Text Input */}
                <div className="bg-muted rounded-xl overflow-hidden min-h-[200px] flex items-center justify-center relative shrink-0">
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
                    <div className="space-y-4">
                        <Input
                            placeholder="Add a caption (optional)..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="bg-muted/50 border-input"
                        />

                        {/* Location Field - Prepopulated & Editable */}
                        <div className="space-y-1.5">
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
                                className={`bg-muted/50 border-input transition-colors ${locationSource === 'exif' ? "border-green-500/50 bg-green-50/10" : ""}`}
                            />
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

            <div className="mt-4 shrink-0">
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
