import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { CaptureForm } from "./CaptureForm";
import { CaptureTypeSelector } from "./CaptureTypeSelector";

type MediaType = "photo" | "video" | "audio" | "text" | null;

interface CaptureModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const CaptureModal = ({ open, onOpenChange }: CaptureModalProps) => {
    const isMobile = useIsMobile();
    const [activeType, setActiveType] = useState<MediaType>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            // slight delay to allow animation to finish
            setTimeout(() => setActiveType(null), 300);
        }
    }, [open]);

    const handleTypeSelect = (type: MediaType) => {
        setActiveType(type);
        if (type === "photo" || type === "video" || type === "audio") {
            // Logic to trigger file input handled in CaptureForm or here?
            // Better to just show the form and let the form handle the input trigger if needed,
            // or trigger it immediately.
            // For simplicity, we'll let CaptureForm handle the specific input interface.
        }
    };

    const Content = (
        <div className="p-6 pb-12 md:pb-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {!activeType ? (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-display font-bold">Capture Moment</h2>
                        <p className="text-muted-foreground text-sm">Choose how you want to remember this.</p>
                    </div>

                    <CaptureTypeSelector onSelect={handleTypeSelect} />
                </div>
            ) : (
                <CaptureForm
                    type={activeType}
                    onBack={() => setActiveType(null)}
                    onClose={() => onOpenChange(false)}
                />
            )}
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="bg-background">
                    {Content}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-background border-none shadow-2xl p-0 overflow-hidden">
                {Content}
            </DialogContent>
        </Dialog>
    );
};
