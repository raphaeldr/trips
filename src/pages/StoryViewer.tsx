import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Loader2, ArrowLeft, Calendar, Share2 } from "lucide-react";
import { resolveMediaUrl } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Moment {
    id: string;
    storage_path: string | null;
    media_type: string | null;
    mime_type: string | null;
    taken_at: string | null;
    description: string | null;
    thumbnail_path: string | null;
    width: number | null;
    height: number | null;
}

interface Story {
    id: string;
    title: string;
    description: string | null;
    cover_image_path: string | null;
    created_at: string;
}

const StoryViewer = () => {
    const { id } = useParams<{ id: string }>();

    // 1. Fetch Story Details (only if published, unless own user? For simplicity, public policy handles this)
    const { data: story, isLoading: storyLoading } = useQuery({
        queryKey: ["story", id],
        queryFn: async () => {
            if (!id) throw new Error("No ID");
            const { data, error } = await supabase.from("stories").select("*").eq("id", id).single();
            if (error) throw error;
            return data as Story;
        },
        enabled: !!id
    });

    // 2. Fetch Moments for this story in order
    const { data: moments, isLoading: momentsLoading } = useQuery({
        queryKey: ["story_moments", id],
        queryFn: async () => {
            if (!id) throw new Error("No ID");
            // Join story_moments with moments
            const { data, error } = await supabase
                .from("story_moments")
                .select(`
          sort_order,
          moments (*)
        `)
                .eq("story_id", id)
                .order("sort_order", { ascending: true });

            if (error) throw error;
            // Flatten the result
            return data.map(d => d.moments).filter(Boolean) as Moment[];
        },
        enabled: !!id
    });

    if (storyLoading || momentsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!story) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold mb-2">Story not found</h1>
                <p className="text-muted-foreground mb-4">It might have been deleted or is not published yet.</p>
                <Link to="/"><Button>Go home</Button></Link>
            </div>
        );
    }

    // Use the first moment as cover if specific cover not set
    const heroImage = story.cover_image_path
        ? resolveMediaUrl(story.cover_image_path)
        : moments && moments.length > 0
            ? resolveMediaUrl(moments[0].storage_path)
            : null;

    return (
        <div className="min-h-screen bg-background">


            {/* HERO HEADER */}
            <div className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden">
                {heroImage && (
                    <>
                        <img
                            src={heroImage}
                            className="w-full h-full object-cover"
                            alt={story.title}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-black/30" />
                    </>
                )}

                <div className="absolute top-24 left-4 md:left-8 z-20">
                    <Link to="/" className="text-white/80 hover:text-white flex items-center gap-2 transition-colors">
                        <ArrowLeft className="w-5 h-5" /> Back
                    </Link>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-20 container mx-auto">
                    <div className="max-w-3xl animate-in slide-in-from-bottom-5 duration-700">
                        <div className="flex items-center gap-2 text-white/80 mb-3 text-sm font-medium uppercase tracking-wider">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(story.created_at), "MMMM yyyy")}
                        </div>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-4 leading-tight">
                            {story.title}
                        </h1>
                        {story.description && (
                            <p className="text-lg md:text-xl text-white/90 font-light leading-relaxed max-w-2xl">
                                {story.description}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* MOMENTS STREAM */}
            <div className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
                <div className="flex flex-col gap-12 md:gap-24">
                    {moments?.map((moment, index) => {
                        const isVideo = moment.mime_type?.startsWith("video/") || moment.media_type === "video";
                        const url = resolveMediaUrl(moment.storage_path);
                        if (!url) return null;

                        // Smart layout: alternate alignment or centering based on index or aspect ratio
                        // For MVP, simply centered column with varying max-widths to create rhythm
                        const isPortrait = moment.height && moment.width && moment.height > moment.width;
                        const widthClass = isPortrait ? "max-w-md" : "max-w-4xl";
                        const alignmentClass = index % 2 === 0 ? "self-center" : "self-center";

                        return (
                            <div key={moment.id} className={`w-full flex flex-col items-center ${alignmentClass}`}>
                                <div className={`${widthClass} w-full`}>
                                    <div className="rounded-2xl overflow-hidden shadow-xl bg-muted/20">
                                        {isVideo ? (
                                            <video
                                                src={url}
                                                controls
                                                poster={resolveMediaUrl(moment.thumbnail_path) || undefined}
                                                className="w-full h-auto max-h-[80vh]"
                                                playsInline
                                            />
                                        ) : (
                                            <img
                                                src={url}
                                                className="w-full h-auto max-h-[80vh] object-cover"
                                                loading="lazy"
                                            />
                                        )}
                                    </div>
                                    {moment.description && (
                                        <div className="mt-4 text-center px-4">
                                            <p className="text-muted-foreground font-light text-lg">{moment.description}</p>
                                        </div>
                                    )}
                                    {moment.taken_at && (
                                        <div className="mt-2 text-center text-xs text-muted-foreground/60 uppercase tracking-widest font-sans">
                                            {format(new Date(moment.taken_at), "d MMMM, h:mm a")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* FOOTER AREA */}
                <div className="mt-32 text-center space-y-6">
                    <h3 className="text-2xl font-display font-bold">End of story</h3>
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" onClick={() => navigator.share?.({ title: story.title, url: window.location.href }).catch(() => { })}>
                            <Share2 className="w-4 h-4 mr-2" /> Share this story
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoryViewer;
