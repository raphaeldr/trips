
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
                <span className="font-sans text-sm font-medium text-muted-foreground/70 mb-1">
                    {country}
                </span>
                {place && (
                    <h2 className="font-display text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-tight">
                        {place}
                    </h2>
                )}
            </div>
        </div>
    );
};
