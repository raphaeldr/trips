import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, MapPin } from "lucide-react";

export const PhotoManager = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const {
    data: photos,
    isLoading: photosLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select(
          `
          *,
          destinations (
            id,
            name,
            country
          )
        `,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: destinations } = useQuery({
    queryKey: ["destinations-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("id, name, country")
        .order("arrival_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (photoId: string, currentDestId?: string) => {
    setEditingId(photoId);
    setSelectedDestId(currentDestId || "none");
  };

  const handleSave = async (photoId: string) => {
    setSaving(true);
    try {
      const destinationId = selectedDestId === "none" ? null : selectedDestId;

      const { error } = await supabase.from("photos").update({ destination_id: destinationId }).eq("id", photoId);

      if (error) throw error;

      toast({
        title: "Location updated",
        description: "Photo linked to destination successfully",
      });

      setEditingId(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update location",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (photosLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Link Photos to Destinations</h3>
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
                    <Label>Assign Destination</Label>
                    <Select value={selectedDestId} onValueChange={setSelectedDestId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Location</SelectItem>
                        {destinations?.map((dest) => (
                          <SelectItem key={dest.id} value={dest.id}>
                            {dest.name}, {dest.country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2 mt-2">
                      <Button onClick={() => handleSave(photo.id)} disabled={saving} size="sm" className="flex-1">
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button onClick={() => setEditingId(null)} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground min-h-[1.5rem]">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {photo.destinations
                          ? `${photo.destinations.name}, ${photo.destinations.country}`
                          : "Unassigned location"}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleEdit(photo.id, photo.destination_id || undefined)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Change Location
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
