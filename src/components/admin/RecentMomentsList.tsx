import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Image as ImageIcon, Mic, Video, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const RecentMomentsList = () => {
    const { data: moments, isLoading } = useQuery({
        queryKey: ["recentMomentsAdmin"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("moments")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(3);

            if (error) throw error;
            return data;
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
            </div>
        );
    }

    if (!moments || moments.length === 0) {
        return null;
    }

    const getMediaIcon = (type: string) => {
        switch (type) {
            case "video": return <Video className="w-5 h-5" />;
            case "audio": return <Mic className="w-5 h-5" />;
            case "text": return <FileText className="w-5 h-5" />;
            default: return <ImageIcon className="w-5 h-5" />;
        }
    };

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground px-1">Recent Uploads</h3>
            <div className="bg-card rounded-xl border shadow-sm divide-y">
                {moments.map((moment) => {
                    // Resolve Thumbnail URL
                    let thumbUrl = null;
                    if (moment.thumbnail_path) {
                        thumbUrl = supabase.storage.from("photos").getPublicUrl(moment.thumbnail_path).data.publicUrl;
                    } else if (moment.storage_path && moment.media_type === 'photo') {
                        thumbUrl = supabase.storage.from("photos").getPublicUrl(moment.storage_path).data.publicUrl;
                    }

                    return (
                        <div key={moment.id} className="flex items-center gap-4 p-3 hover:bg-muted/30 transition-colors">
                            {/* Thumbnail */}
                            <div className="w-12 h-12 shrink-0 bg-muted rounded-md overflow-hidden flex items-center justify-center border text-muted-foreground">
                                {thumbUrl ? (
                                    <img src={thumbUrl} alt={moment.title || "Moment"} className="w-full h-full object-cover" />
                                ) : (
                                    getMediaIcon(moment.media_type)
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm text-foreground truncate">
                                    {moment.title || moment.caption || "Untitled Moment"}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(moment.created_at), { addSuffix: true })}
                                </p>
                            </div>

                            {/* Status Pill */}
                            <Badge
                                variant={moment.status === 'published' ? "default" : "secondary"}
                                className={`text-[10px] uppercase tracking-wider font-semibold ${moment.status === 'published' ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-100"}`}
                            >
                                {moment.status === 'published' ? 'Synced' : 'Draft'}
                            </Badge>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
