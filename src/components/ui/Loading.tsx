import { Loader2 } from "lucide-react";

export const Loading = () => {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
};
