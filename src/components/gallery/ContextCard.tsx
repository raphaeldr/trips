
import { cn } from "@/lib/utils";

interface ContextCardProps {
    country: string;
    place?: string;
    className?: string;
}

export const ContextCard = ({ country, place, className }: ContextCardProps) => {
    return (
        <div
            className={cn(
                "flex flex-col justify-end p-6 md:p-8 h-full min-h-[180px] md:min-h-[240px]",
                "bg-white/50 backdrop-blur-sm rounded-3xl", // Minimal background, subtle separation
                "transition-all duration-300 hover:bg-white/80",
                className
            )}
        >
            <div className="flex flex-col gap-1">
                <span className="font-sans text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground/60 mb-2">
                    {country}
                </span>
                {place && (
                    <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tighter text-foreground leading-[0.9]">
                        {place}
                    </h2>
                )}
            </div>
        </div>
    );
};
