
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Send, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { uploadMedia } from "@/utils/IngestionEngine";

export const CaptureForm = ({ type, onBack, onClose }: any) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [caption, setCaption] = useState("");
    const [locationName, setLocationName] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    useEffect(() => {
        if ((type === "photo" || type === "video") && !file) fileInputRef.current?.click();
    }, [type]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
            setPreviewUrl(URL.createObjectURL(e.target.files[0]));
        } else onBack();
    };

    const handleSubmit = async () => {
        if (type !== 'text' && !file) return;
        setIsUploading(true);
        try {
            await uploadMedia({
                file: file || undefined,
                noteText: caption,
                userProvidedName: locationName || undefined
            });
            toast({ title: "Success!", description: "Memory saved." });
            queryClient.invalidateQueries({ queryKey: ["journey_segments"] });
            onClose();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally { setIsUploading(false); }
    };

    return (
        <div className="flex flex-col h-full p-4">
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
                <h2 className="font-semibold capitalize">{type} Upload</h2>
            </div>
            <div className="flex-1 space-y-4">
                {previewUrl && <img src={previewUrl} className="w-full rounded-lg max-h-[300px] object-cover" />}
                <Textarea placeholder="Add a note..." value={caption} onChange={e => setCaption(e.target.value)} />
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1"><MapPin className="w-4 h-4" /> Location</label>
                    <Input placeholder="City name (e.g. Paris)" value={locationName} onChange={e => setLocationName(e.target.value)} />
                </div>
            </div>
            <Button className="w-full mt-4" onClick={handleSubmit} disabled={isUploading}>
                {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 w-4 h-4" />} Save
            </Button>
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" />
        </div>
    );
};