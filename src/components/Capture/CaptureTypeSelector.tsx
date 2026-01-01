import { Button } from "@/components/ui/button";
import { Camera, Video, Mic, Type } from "lucide-react";

export type MediaType = "photo" | "video" | "audio" | "text" | null;

interface CaptureTypeSelectorProps {
    onSelect: (type: MediaType) => void;
}

export const CaptureTypeSelector = ({ onSelect }: CaptureTypeSelectorProps) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <Button
                variant="outline"
                className="h-32 flex flex-col gap-3 hover:bg-muted/50 border-2 border-dashed hover:border-solid hover:border-primary transition-all"
                onClick={() => onSelect("photo")}
            >
                <Camera className="w-8 h-8 text-primary" />
                <span className="font-semibold">Photo</span>
            </Button>
            <Button
                variant="outline"
                className="h-32 flex flex-col gap-3 hover:bg-muted/50 border-2 border-dashed hover:border-solid hover:border-primary transition-all"
                onClick={() => onSelect("video")}
            >
                <Video className="w-8 h-8 text-blue-500" />
                <span className="font-semibold">Video</span>
            </Button>
            <Button
                variant="outline"
                className="h-32 flex flex-col gap-3 hover:bg-muted/50 border-2 border-dashed hover:border-solid hover:border-primary transition-all"
                onClick={() => onSelect("audio")}
            >
                <Mic className="w-8 h-8 text-red-500" />
                <span className="font-semibold">Audio</span>
            </Button>
            <Button
                variant="outline"
                className="h-32 flex flex-col gap-3 hover:bg-muted/50 border-2 border-dashed hover:border-solid hover:border-primary transition-all"
                onClick={() => onSelect("text")}
            >
                <Type className="w-8 h-8 text-orange-500" />
                <span className="font-semibold">Note</span>
            </Button>
        </div>
    );
};
