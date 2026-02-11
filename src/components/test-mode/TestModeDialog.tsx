import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { activateTestMode, type TestPersona } from "@/lib/testMode";
import { User, Briefcase, ShoppingBag } from "lucide-react";

interface TestModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const personas: { key: TestPersona; label: string; description: string; icon: React.ReactNode }[] = [
  {
    key: "customer_new",
    label: "Customer (New)",
    description: "Fresh account, no booking history",
    icon: <User className="w-5 h-5" />,
  },
  {
    key: "customer_returning",
    label: "Customer (Returning)",
    description: "2 completed bookings, existing address",
    icon: <ShoppingBag className="w-5 h-5" />,
  },
  {
    key: "contractor_active",
    label: "Contractor (Active)",
    description: "5 completed jobs, 4.8★ rating, standard tier",
    icon: <Briefcase className="w-5 h-5" />,
  },
];

const TestModeDialog = ({ open, onOpenChange }: TestModeDialogProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<TestPersona | null>(null);

  const handleSelect = (persona: TestPersona) => {
    setLoading(persona);
    try {
      const user = activateTestMode(persona);
      onOpenChange(false);
      // Navigate based on role
      if (user.role === "contractor") {
        navigate("/contractor");
      } else {
        navigate("/dashboard");
      }
      window.location.reload();
    } catch (err) {
      console.error("Failed to activate test mode:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">🧪 Test Mode</DialogTitle>
          <DialogDescription>
            Select a test persona to bypass authentication. No real data will be created.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {personas.map((p) => (
            <button
              key={p.key}
              onClick={() => handleSelect(p.key)}
              disabled={loading !== null}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {p.icon}
              </div>
              <div>
                <div className="font-semibold text-foreground">{p.label}</div>
                <div className="text-sm text-muted-foreground">{p.description}</div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center pt-2">
          Session expires after 1 hour. Sign out to end test mode.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default TestModeDialog;
