import { useState } from "react";
import { Plus, Camera, Mic, PenLine, MapPin, X } from "lucide-react";

interface QuickCaptureFABProps {
  onAddMoment: () => void;
  onAddVoiceNote: () => void;
  onAddNote: () => void;
  onAddLocation: () => void;
}

const actions = [
  { icon: Camera, label: "Moment", color: "bg-primary" },
  { icon: Mic, label: "Voice", color: "bg-accent" },
  { icon: PenLine, label: "Note", color: "bg-secondary" },
  { icon: MapPin, label: "Pin", color: "bg-muted" },
];

export const QuickCaptureFAB = ({
  onAddMoment,
  onAddVoiceNote,
  onAddNote,
  onAddLocation,
}: QuickCaptureFABProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlers = [onAddMoment, onAddVoiceNote, onAddNote, onAddLocation];

  const handleAction = (index: number) => {
    handlers[index]();
    setIsOpen(false);
  };

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
      <div className="fixed bottom-24 right-4 z-50 md:hidden">
        {/* Action buttons */}
        <div
          className={`
            absolute bottom-16 right-0 flex flex-col-reverse items-end gap-3
            transition-all duration-300 origin-bottom-right
            ${isOpen ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}
          `}
        >
          {actions.map((action, index) => (
            <button
              key={action.label}
              onClick={() => handleAction(index)}
              className={`
                flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full
                bg-card shadow-elegant text-foreground
                transition-all duration-200 hover:scale-105
              `}
              style={{
                transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
              }}
            >
              <span className="text-sm font-medium">{action.label}</span>
              <div className={`w-10 h-10 ${action.color} rounded-full flex items-center justify-center`}>
                <action.icon className="w-5 h-5 text-foreground" />
              </div>
            </button>
          ))}
        </div>

        {/* Main FAB button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-14 h-14 rounded-full shadow-elegant
            flex items-center justify-center
            transition-all duration-300
            ${isOpen 
              ? "bg-foreground text-background rotate-45" 
              : "bg-primary text-primary-foreground hover:scale-110"
            }
          `}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-7 h-7" />
          )}
        </button>
      </div>
    </>
  );
};
