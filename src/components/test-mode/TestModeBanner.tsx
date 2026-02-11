import { isTestModeActive, getTestModeSession, clearTestModeSession } from "@/lib/testMode";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

const TestModeBanner = () => {
  const navigate = useNavigate();
  const session = getTestModeSession();

  if (!isTestModeActive() || !session) return null;

  const handleEnd = () => {
    clearTestModeSession();
    navigate("/auth");
    window.location.reload();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground text-center py-1.5 px-4 text-sm font-semibold flex items-center justify-center gap-3">
      <span>⚠️ TEST MODE ACTIVE — NOT REAL DATA — {session.full_name} ({session.role})</span>
      <button
        onClick={handleEnd}
        className="inline-flex items-center gap-1 bg-destructive-foreground/20 hover:bg-destructive-foreground/30 rounded px-2 py-0.5 text-xs transition-colors"
      >
        <X className="w-3 h-3" /> End
      </button>
    </div>
  );
};

export default TestModeBanner;
