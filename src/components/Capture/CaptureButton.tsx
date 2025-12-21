import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CaptureModal } from "./CaptureModal";
import { useState } from "react";

import { useAdminAuth } from "@/hooks/useAdminAuth";

export const CaptureButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAdmin, loading } = useAdminAuth();

  if (loading || !isAdmin) return null;

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-24 md:bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-primary text-primary-foreground"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-8 w-8" />
        <span className="sr-only">Add Moment</span>
      </Button>

      <CaptureModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};
