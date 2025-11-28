import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

export const PhotoManager = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const { data: photos, isLoading, refetch } = useQuery({
    queryKey: ["admin-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const handleEdit = (photoId: string, currentCaption?: string) => {
    setEditingId(photoId);
    setCaption(currentCaption || "");
  };

  const handleSave = async (photoId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("photos")
        .update({ description: caption })
        .eq("id", photoId);

      if (error) throw error;

      toast({
        title: "Caption saved",
        description: "Photo caption updated successfully",
      });

      setEditingId(null);
      setCaption("");
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save caption",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Manage Photo Captions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {photos?.map((photo) => {
          const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}`;
          const isEditing = editingId === photo.id;

          return (
            <Card key={photo.id}>
              <CardContent className="p-4 space-y-3">
                <img
                  src={publicUrl}
                  alt={photo.title || "Photo"}
                  className="w-full aspect-square object-cover rounded-lg"
                />
                
                {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor={`caption-${photo.id}`}>Caption</Label>
                    <Textarea
                      id={`caption-${photo.id}`}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Add a caption for this photo..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSave(photo.id)}
                        disabled={saving}
                        size="sm"
                        className="flex-1"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingId(null);
                          setCaption("");
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                      {photo.description || "No caption"}
                    </p>
                    <Button
                      onClick={() => handleEdit(photo.id, photo.description || undefined)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {photo.description ? "Edit Caption" : "Add Caption"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
