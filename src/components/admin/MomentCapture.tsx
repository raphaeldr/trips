import { useState } from "react";
import { CaptureForm } from "../Capture/CaptureForm";
import { CaptureTypeSelector, MediaType } from "../Capture/CaptureTypeSelector";

interface MomentCaptureProps {
  onCaptureComplete?: () => void;
}

export const MomentCapture = ({ onCaptureComplete }: MomentCaptureProps) => {
  const [activeType, setActiveType] = useState<MediaType | null>(null);

  if (activeType) {
    return (
      <div className="border rounded-lg p-4 bg-muted/20">
        <CaptureForm
          type={activeType}
          onBack={() => setActiveType(null)}
          onClose={() => {
            setActiveType(null);
            if (onCaptureComplete) onCaptureComplete();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CaptureTypeSelector onSelect={setActiveType} />
    </div>
  );
};

