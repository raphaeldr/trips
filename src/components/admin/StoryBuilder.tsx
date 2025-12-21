import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Save, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";
import { resolveMediaUrl } from "@/lib/utils";

interface Moment {
    id: string;
    storage_path: string | null;
    media_type: string | null;
    mime_type: string | null;
    taken_at: string | null;
}

interface Story {
    id: string;
    title: string;
    description: string | null;
    is_published: boolean;
}

export const StoryBuilder = () => {
    const { user } = useAdminAuth();
    const { toast } = useToast();

    // -- State --
    const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isPublished, setIsPublished] = useState(false);
    const [selectedMomentIds, setSelectedMomentIds] = useState<string[]>([]); // In order

    // -- Data Fetching --

    // 1. Fetch existing stories
    const { data: stories, refetch: refetchStories } = useQuery({
        queryKey: ["admin_stories"],
        queryFn: async () => {
            const { data, error } = await supabase.from("stories").select("*").order("created_at", { ascending: false });
            if (error) throw error;
            return data as Story[];
        },
        enabled: !!user,
    });

    // 2. Fetch all eligible moments (photos/videos) for selection
    const { data: moments } = useQuery({
        queryKey: ["admin_moments_for_stories"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("moments")
                .select("id, storage_path, media_type, mime_type, taken_at")
                .in("media_type", ["photo", "video"])
                .order("taken_at", { ascending: false });
            if (error) throw error;
            return data as Moment[];
        },
        enabled: !!user,
    });

    // 3. Fetch details when editing a story
    useEffect(() => {
        if (!activeStoryId) {
            // Reset for new story
            setTitle("");
            setDescription("");
            setIsPublished(false);
            setSelectedMomentIds([]);
            return;
        }

        const fetchStoryDetails = async () => {
            // Fetch basics
            const story = stories?.find(s => s.id === activeStoryId);
            if (story) {
                setTitle(story.title);
                setDescription(story.description || "");
                setIsPublished(story.is_published || false);
            }

            // Fetch linked moments (ordered)
            const { data, error } = await supabase
                .from("story_moments")
                .select("moment_id, sort_order")
                .eq("story_id", activeStoryId)
                .order("sort_order", { ascending: true });

            if (!error && data) {
                setSelectedMomentIds(data.map(d => d.moment_id));
            }
        };

        fetchStoryDetails();
    }, [activeStoryId, stories]);


    // -- Handlers --

    const handleSave = async () => {
        if (!user) return;
        if (!title.trim()) {
            toast({ title: "Title is required", variant: "destructive" });
            return;
        }

        try {
            let currentId = (activeStoryId && activeStoryId !== "NEW") ? activeStoryId : undefined;

            // 1. Upsert Story Container
            const { data: storyData, error: storyError } = await supabase
                .from("stories")
                .upsert({
                    id: currentId,
                    title,
                    description,
                    is_published: isPublished,
                    user_id: user.id
                })
                .select()
                .single();

            if (storyError) throw storyError;
            currentId = storyData.id;

            // 2. Update Relations (Delete all and recreate - simplest for reordering)
            // Only delete if we are UPDATING an existing story, not creating new
            if (activeStoryId && activeStoryId !== "NEW") {
                await supabase.from("story_moments").delete().eq("story_id", activeStoryId);
            }

            if (selectedMomentIds.length > 0) {
                const relations = selectedMomentIds.map((mid, index) => ({
                    story_id: currentId!,
                    moment_id: mid,
                    sort_order: index
                }));

                const { error: relError } = await supabase.from("story_moments").insert(relations);
                if (relError) throw relError;
            }

            toast({ title: (activeStoryId && activeStoryId !== "NEW") ? "Story updated!" : "Story created!" });
            setActiveStoryId(null); // Return to list
            refetchStories();

        } catch (e: any) {
            console.error(e);
            toast({
                title: "Error saving story",
                description: e.message || "Unknown error",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This cannot be undone.")) return;
        const { error } = await supabase.from("stories").delete().eq("id", id);
        if (!error) {
            toast({ title: "Story deleted" });
            if (activeStoryId === id) setActiveStoryId(null);
            refetchStories();
        }
    };

    const toggleMomentSelection = (momentId: string) => {
        setSelectedMomentIds(prev => {
            if (prev.includes(momentId)) {
                return prev.filter(id => id !== momentId);
            } else {
                return [...prev, momentId];
            }
        });
    };

    const moveMoment = (index: number, direction: 'up' | 'down') => {
        const newItems = [...selectedMomentIds];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newItems.length) return;

        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        setSelectedMomentIds(newItems);
    };


    // -- Render --

    if (activeStoryId === null && activeStoryId !== "NEW") {
        // LIST VIEW
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Stories</h2>
                    <Button onClick={() => setActiveStoryId("NEW")}>
                        <Plus className="w-4 h-4 mr-2" /> New Story
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stories?.map(story => (
                        <Card key={story.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveStoryId(story.id)}>
                            <CardContent className="p-4">
                                <h3 className="font-bold text-lg mb-1">{story.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">{story.description || "No description"}</p>
                                <div className="mt-3 flex gap-2 text-xs">
                                    <span className={`px-2 py-0.5 rounded-full ${story.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {story.is_published ? 'Published' : 'Draft'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {stories?.length === 0 && <p className="text-muted-foreground">No stories yet.</p>}
                </div>
            </div>
        );
    }

    // EDITOR VIEW
    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-2xl font-bold">{activeStoryId === "NEW" ? "New Story" : "Edit Story"}</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setActiveStoryId(null)}>Cancel</Button>
                    <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Story</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* LEFT: Metadata & Reordering */}
                <div className="md:col-span-1 space-y-6 h-fit bg-card p-4 rounded-xl border">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Summer in Paris" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A short intro..." />
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="pub" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="rounded border-gray-300" />
                        <label htmlFor="pub" className="text-sm">Published?</label>
                    </div>

                    {activeStoryId !== "NEW" && (
                        <Button variant="destructive" size="sm" className="w-full mt-4" onClick={() => handleDelete(activeStoryId!)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Story
                        </Button>
                    )}

                    <div className="pt-4 border-t">
                        <h3 className="font-medium mb-3">Selected Moments ({selectedMomentIds.length})</h3>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            {selectedMomentIds.map((mid, idx) => {
                                const m = moments?.find(x => x.id === mid);
                                if (!m) return null;
                                return (
                                    <div key={mid} className="flex items-center gap-2 bg-muted/50 p-2 rounded text-sm group">
                                        <div className="font-mono text-xs text-muted-foreground w-4">{idx + 1}</div>
                                        <img src={resolveMediaUrl(m.storage_path) || ""} className="w-8 h-8 rounded object-cover" />
                                        <div className="flex-1 min-w-0 truncate text-muted-foreground">{m.taken_at?.substring(0, 10)}</div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => moveMoment(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-background rounded"><ArrowUp className="w-3 h-3" /></button>
                                            <button onClick={() => moveMoment(idx, 'down')} disabled={idx === selectedMomentIds.length - 1} className="p-1 hover:bg-background rounded"><ArrowDown className="w-3 h-3" /></button>
                                        </div>
                                        <button onClick={() => toggleMomentSelection(mid)} className="text-destructive hover:bg-destructive/10 p-1 rounded"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                )
                            })}
                            {selectedMomentIds.length === 0 && <p className="text-xs text-muted-foreground italic">No moments selected yet. Click images on the right to add them.</p>}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Picker Grid */}
                <div className="md:col-span-2">
                    <h3 className="font-medium mb-4 flex justify-between items-center">
                        <span>Select Moments</span>
                        <span className="text-xs text-muted-foreground">{moments?.length || 0} available</span>
                    </h3>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {moments?.map(moment => {
                            const isSelected = selectedMomentIds.includes(moment.id);
                            const index = selectedMomentIds.indexOf(moment.id) + 1;

                            return (
                                <div
                                    key={moment.id}
                                    className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-gray-200'}`}
                                    onClick={() => toggleMomentSelection(moment.id)}
                                >
                                    <img
                                        src={resolveMediaUrl(moment.storage_path) || ""}
                                        className={`w-full h-full object-cover ${isSelected ? 'opacity-75' : 'opacity-100'}`}
                                        loading="lazy"
                                    />
                                    {moment.media_type === "video" && <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] px-1 rounded">VID</div>}

                                    {isSelected && (
                                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold shadow-sm">
                                            {index}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
