import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, ChevronLeft, ChevronRight, Calendar, MapPin, Camera } from "lucide-react";
import { format } from "date-fns";
import { cn, resolveMediaUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LightboxProps {
    isOpen: boolean;
    onClose: () => void;
    moments: any[];
    initialIndex: number;
}

export function Lightbox({ isOpen, onClose, moments, initialIndex }: LightboxProps) {
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
    const [direction, setDirection] = React.useState(0); // -1 for left, 1 for right

    React.useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    // Handle keyboard navigation
    React.useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, currentIndex]);

    const handleNext = () => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % moments.length);
    };

    const handlePrev = () => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + moments.length) % moments.length);
    };

    if (!isOpen) return null;

    const currentMoment = moments[currentIndex];

    if (!currentMoment) return null;

    const isVideo = currentMoment.mime_type?.startsWith("video/") ||
        currentMoment.mime_type === "video/quicktime" ||
        currentMoment.media_type === "video" ||
        currentMoment.storage_path?.toLowerCase().endsWith('.mov') ||
        currentMoment.storage_path?.toLowerCase().endsWith('.mp4');

    const publicUrl = isVideo
        ? resolveMediaUrl(currentMoment.storage_path)
        : resolveMediaUrl(currentMoment.storage_path, { width: 800, quality: 80 });

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                {/* Overlay: Soft frosted glass */}
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-white/90 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300" />

                <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col items-center justify-center focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-300">

                    {/* Close Button: Top-right, minimalist */}
                    <DialogPrimitive.Close className="absolute right-6 top-6 p-2 rounded-full text-black/40 hover:text-black/80 hover:bg-black/5 transition-all duration-200 focus:outline-none z-50">
                        <X className="h-6 w-6" />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>

                    {/* Navigation Container (Hover to show arrows) */}
                    <div className="absolute inset-0 flex items-center justify-between px-4 md:px-8 pointer-events-none group/nav">
                        {/* Prev Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="pointer-events-auto h-12 w-12 rounded-full bg-white/80 hover:bg-white text-black/60 hover:text-black shadow-sm border border-black/5 transition-all duration-300 opacity-0 group-hover/nav:opacity-100 translate-x-[-10px] group-hover/nav:translate-x-0"
                            onClick={handlePrev}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>

                        {/* Next Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="pointer-events-auto h-12 w-12 rounded-full bg-white/80 hover:bg-white text-black/60 hover:text-black shadow-sm border border-black/5 transition-all duration-300 opacity-0 group-hover/nav:opacity-100 translate-x-[10px] group-hover/nav:translate-x-0"
                            onClick={handleNext}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* Main Content */}
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-12 pointer-events-none">
                        {/* Media Container: Keyed for animation */}
                        <div
                            key={currentIndex}
                            className="relative flex items-center justify-center max-h-[75vh] max-w-[92vw] pointer-events-auto animate-in fade-in zoom-in-[0.98] duration-300 fill-mode-both"
                        >
                            {isVideo ? (
                                <video
                                    src={publicUrl}
                                    controls
                                    autoPlay
                                    playsInline
                                    className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-xl bg-black/5"
                                />
                            ) : (
                                <img
                                    src={publicUrl}
                                    alt={currentMoment.title || "Travel moment"}
                                    className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-xl"
                                />
                            )}
                        </div>

                        {/* Metadata: Refined Pill/Card */}
                        {(currentMoment.destinations || currentMoment.taken_at || currentMoment.title) && (
                            <div className="mt-6 animate-in slide-in-from-bottom-2 fade-in duration-500 delay-100">
                                <div className="bg-white/90 backdrop-blur-xl border border-white/40 shadow-sm rounded-full px-6 py-3 flex items-center gap-4 text-sm pointer-events-auto">

                                    {/* Location (Primary) */}
                                    {(currentMoment.destinations?.name || currentMoment.location_name) && (
                                        <div className="flex items-center gap-1.5 font-medium text-gray-900 border-r border-gray-200 pr-4">
                                            <MapPin className="w-3.5 h-3.5 text-gray-500" />
                                            <span>
                                                {currentMoment.destinations ? currentMoment.destinations.name : currentMoment.location_name}
                                                {currentMoment.destinations?.country && <span className="text-gray-500 font-normal">, {currentMoment.destinations.country}</span>}
                                            </span>
                                        </div>
                                    )}

                                    {/* Date (Secondary) */}
                                    {currentMoment.taken_at && (
                                        <div className="flex items-center gap-1.5 text-gray-500 font-normal">
                                            <Calendar className="w-3.5 h-3.5 opacity-70" />
                                            {format(new Date(currentMoment.taken_at), "d MMMM yyyy")}
                                        </div>
                                    )}

                                    {/* Title fallback if no location/date, or separated */}
                                    {!currentMoment.destinations && !currentMoment.taken_at && currentMoment.title && (
                                        <span className="font-medium text-gray-900">{currentMoment.title}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
