
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
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/80">
                    {country}
                </span>
                {place && (
                    <h2 className="text-2xl md:text-3xl font-light tracking-tight text-foreground/90">
                        {place}
                    </h2>
                )}
            </div>
        </div>
    );
};
