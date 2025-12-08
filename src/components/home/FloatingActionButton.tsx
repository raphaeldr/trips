import { useState } from "react";
import { Plus, Camera, Mic, FileText, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface FloatingActionButtonProps {
  onAddMoment?: () => void;
  onAddVoiceNote?: () => void;
  onAddNote?: () => void;
  onAddLocation?: () => void;
}

export const FloatingActionButton = ({
  onAddMoment,
  onAddVoiceNote,
  onAddNote,
  onAddLocation,
}: FloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions: FABAction[] = [
    {
      icon: <Camera className="w-5 h-5" />,
      label: "Add Moment",
      onClick: () => {
        onAddMoment?.();
        setIsOpen(false);
      },
    },
    {
      icon: <Mic className="w-5 h-5" />,
      label: "Voice Note",
      onClick: () => {
        onAddVoiceNote?.();
        setIsOpen(false);
      },
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: "Quick Note",
      onClick: () => {
        onAddNote?.();
        setIsOpen(false);
      },
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      label: "Add Pin",
      onClick: () => {
        onAddLocation?.();
        setIsOpen(false);
      },
    },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Container */}
      <div className="fixed bottom-24 right-4 z-50 md:hidden flex flex-col-reverse items-end gap-3">
        {/* Action buttons */}
        {isOpen && (
          <div className="flex flex-col-reverse gap-2 mb-2 animate-in">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className="flex items-center gap-3 bg-card border border-border shadow-elegant rounded-full pl-4 pr-5 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-all"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <span className="text-primary">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-elegant flex items-center justify-center transition-all duration-300",
            isOpen
              ? "bg-foreground text-background rotate-45"
              : "bg-primary text-primary-foreground"
          )}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
};
