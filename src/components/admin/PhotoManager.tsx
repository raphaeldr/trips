import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Star, Trash2, Video, Edit2, ImageIcon, Image as LucideImage, Mic, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { resolveMediaUrl } from "@/lib/utils";

export const PhotoManager = () => {
  const [editingMoment, setEditingMoment] = useState<any | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const { toast } = useToast();

  const {
    data: moments,
    isLoading: momentsLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-moments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moments")
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

  // --- Filtering & Pagination ---

  const filteredMoments = moments?.filter((moment) => {
    const mediaType = moment.media_type || "photo";

    if (activeTab === "videos") return mediaType === "video";
    if (activeTab === "images") return mediaType === "photo";
    if (activeTab === "audio") return mediaType === "audio";
    if (activeTab === "text") return mediaType === "text";
    return true; // "all" shows everything
  });

  const totalPages = Math.ceil((filteredMoments?.length || 0) / itemsPerPage);
  const paginatedMoments = filteredMoments?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- Actions ---



  const handleDelete = async (momentId: string, storagePath: string | null) => {
    if (!confirm("Are you sure you want to delete this moment?")) return;

    setProcessingId(momentId);
    try {
      if (storagePath) {
        const { error: storageError } = await supabase.storage.from("photos").remove([storagePath]);
        if (storageError) {
          console.error("Storage delete error:", storageError);
        }
      }

      const { error: dbError } = await supabase.from("moments").delete().eq("id", momentId);
      if (dbError) throw dbError;

      toast({ title: "Moment deleted" });
      refetch();
      if (editingMoment?.id === momentId) setEditingMoment(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete moment: " + error.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveDestination = async (momentId: string, destId: string) => {
    try {
      const destinationId = destId === "none" ? null : destId;
      const { error } = await supabase.from("moments").update({ destination_id: destinationId }).eq("id", momentId);

      if (error) throw error;

      toast({ title: "Location updated" });
      refetch();
      setEditingMoment((prev: any) => ({ ...prev, destination_id: destinationId }));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update location",
      });
    }
  };

  const getMediaIcon = (mediaType: string | null) => {
    switch (mediaType) {
      case "video": return <Video className="w-4 h-4" />;
      case "audio": return <Mic className="w-4 h-4" />;
      case "text": return <FileText className="w-4 h-4" />;
      default: return <LucideImage className="w-4 h-4 opacity-80" />;
    }
  };

  if (momentsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-4 rounded-lg border shadow-sm gap-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Moments library
            </h3>
            <p className="text-sm text-muted-foreground">Manage all your captured moments.</p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            {moments?.length || 0} items
          </Badge>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v);
            setCurrentPage(1);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full sm:w-[400px] grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="images">Photos</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="text">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {paginatedMoments?.map((moment) => {
                const publicUrl = resolveMediaUrl(moment.storage_path);
                const mediaType = moment.media_type || "photo";
                const isVideo = mediaType === "video";
                const isAudio = mediaType === "audio";
                const isText = mediaType === "text";
                const isProcessing = processingId === moment.id;

                return (
                  <Card
                    key={moment.id}
                    className={`group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-md`}
                  >
                    {/* Media Thumbnail */}
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {isText ? (
                        <div className="w-full h-full p-4 flex items-center justify-center bg-secondary/30">
                          <p className="text-sm text-muted-foreground line-clamp-4 text-center">
                            {moment.caption || moment.title || "Note"}
                          </p>
                        </div>
                      ) : isAudio && publicUrl ? (
                        <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                          <Mic className="w-12 h-12 text-muted-foreground" />
                        </div>
                      ) : isVideo && publicUrl ? (
                        <video
                          src={publicUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          loop
                          onMouseOver={(e) => e.currentTarget.play()}
                          onMouseOut={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                      ) : publicUrl ? (
                        <img
                          src={publicUrl}
                          alt={moment.title || "Travel moment"}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}

                      {/* Status Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1.5 pointer-events-none">

                        {moment.status === "draft" && (
                          <Badge variant="outline" className="bg-background/80 text-[10px] h-5 px-1.5">
                            Draft
                          </Badge>
                        )}
                      </div>

                      {/* Type Icon */}
                      <div className="absolute top-2 right-2 text-white/90 drop-shadow-md pointer-events-none">
                        {getMediaIcon(mediaType)}
                      </div>

                      {/* Loading State Overlay */}
                      {isProcessing && (
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-20">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Card Footer Content */}
                    <div className="flex flex-col flex-1 p-3 gap-3">
                      {/* Location Info */}
                      <div
                        className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0"
                        title={
                          moment.destinations
                            ? `${moment.destinations.name}, ${moment.destinations.country}`
                            : "No location linked"
                        }
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                        <span className="truncate font-medium">
                          {moment.destinations ? moment.destinations.name : "Unassigned"}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-3 gap-2 mt-auto pt-2 border-t border-border/50">


                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-0 text-xs hover:bg-muted"
                          onClick={() => setEditingMoment(moment)}
                          disabled={isProcessing}
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-0 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(moment.id, moment.storage_path)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Del
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <div className="flex items-center px-4 text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </div>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}

            {filteredMoments?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No moments found in this category.</div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingMoment} onOpenChange={(open) => !open && setEditingMoment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit moment</DialogTitle>
            <DialogDescription>Update location details.</DialogDescription>
          </DialogHeader>

          {editingMoment && (
            <div className="space-y-6 py-4">
              {/* Preview */}
              <div className="flex gap-4 items-start p-3 bg-muted/30 rounded-lg border">
                <div className="relative w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0 border">
                  {editingMoment.media_type === "text" ? (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                  ) : editingMoment.media_type === "audio" ? (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                      <Mic className="w-6 h-6 text-muted-foreground" />
                    </div>
                  ) : editingMoment.mime_type?.startsWith("video/") ? (
                    <video
                      src={resolveMediaUrl(editingMoment.storage_path) || ""}
                      className="w-full h-full object-cover"
                    />
                  ) : editingMoment.storage_path ? (
                    <img
                      src={resolveMediaUrl(editingMoment.storage_path) || ""}
                      className="w-full h-full object-cover"
                      alt="Preview"
                    />
                  ) : null}
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate" title={editingMoment.title}>
                    {editingMoment.title || "Untitled Moment"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {editingMoment.file_size ? `${(editingMoment.file_size / 1024 / 1024).toFixed(2)} MB • ` : ""}
                    {editingMoment.media_type || "photo"}
                  </p>

                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Linked location</Label>
                  <Select
                    value={editingMoment.destination_id || "none"}
                    onValueChange={(val) => handleSaveDestination(editingMoment.id, val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a destination..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific location</SelectItem>
                      {destinations?.map((dest) => (
                        <SelectItem key={dest.id} value={dest.id}>
                          {dest.name}, {dest.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMoment(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
