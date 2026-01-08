import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Leaf,
  Calendar,
  MapPin,
  Clock,
  Plus,
  LogOut,
  Home,
  Settings,
  Bell,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";
import AddAddressDialog from "@/components/dashboard/AddAddressDialog";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "addresses" | "bookings">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const handleTabChange = (tab: "overview" | "addresses" | "bookings") => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const openAddressDialog = () => {
    setAddressDialogOpen(true);
    setSidebarOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl gradient-hero animate-pulse" />
      </div>
    );
  }

  const userName = user?.user_metadata?.full_name || "there";

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
            <Leaf className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-display font-bold text-foreground">Lawnly</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-6 flex flex-col z-50 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 mt-12 md:mt-0">
          <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-soft">
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-display font-bold text-foreground">
            Lawnly
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          <button
            onClick={() => handleTabChange("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Overview</span>
          </button>
          <button
            onClick={() => handleTabChange("addresses")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
              activeTab === "addresses"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span className="font-medium">My Addresses</span>
          </button>
          <button
            onClick={() => handleTabChange("bookings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
              activeTab === "bookings"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="font-medium">My Bookings</span>
          </button>
        </nav>

        {/* Bottom Actions */}
        <div className="space-y-2 pt-4 border-t border-border">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
              Welcome back, {userName}!
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Manage your lawn care services
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
            <Button size="sm" onClick={openAddressDialog}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Booking</span>
            </Button>
          </div>
        </header>

        {activeTab === "overview" && (
          <div className="space-y-6 md:space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-card rounded-2xl p-5 md:p-6 shadow-soft">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-foreground">
                      0
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Verified Addresses
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-5 md:p-6 shadow-soft">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-foreground">
                      0
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Upcoming Bookings
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-5 md:p-6 shadow-soft sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-grass-light/50 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-grass-dark" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-foreground">
                      0
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Completed Services
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Getting Started */}
            <div className="bg-card rounded-2xl p-6 md:p-8 shadow-soft">
              <h2 className="font-display text-lg md:text-xl font-bold text-foreground mb-6">
                Getting Started
              </h2>
              <div className="space-y-4">
                <button
                  onClick={openAddressDialog}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 transition-colors cursor-pointer group text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="font-display font-bold text-primary">1</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      Add Your Address
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Add your property address for verification
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
                <div className="flex items-center gap-4 p-4 rounded-xl border border-border opacity-50">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <span className="font-display font-bold text-muted-foreground">
                      2
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      Wait for Verification
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      We'll verify your property size and set pricing
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl border border-border opacity-50">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <span className="font-display font-bold text-muted-foreground">
                      3
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      Book Your First Mow
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Schedule your lawn service at your convenience
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "addresses" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg md:text-xl font-bold text-foreground">
                My Addresses
              </h2>
              <Button size="sm" onClick={openAddressDialog}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Address</span>
              </Button>
            </div>

            {/* Empty State */}
            <div className="bg-card rounded-2xl p-8 md:p-12 shadow-soft text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg md:text-xl font-semibold text-foreground mb-2">
                No addresses yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm md:text-base">
                Add your property address to get started. We'll verify the
                location and lawn size to provide accurate pricing.
              </p>
              <Button onClick={openAddressDialog}>
                <Plus className="w-4 h-4" />
                Add Your First Address
              </Button>
            </div>
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg md:text-xl font-bold text-foreground">
                My Bookings
              </h2>
              <Button size="sm" disabled>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Booking</span>
              </Button>
            </div>

            {/* Empty State */}
            <div className="bg-card rounded-2xl p-8 md:p-12 shadow-soft text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg md:text-xl font-semibold text-foreground mb-2">
                No bookings yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm md:text-base">
                Once you have a verified address, you can book lawn care
                services. Add an address first to get started.
              </p>
              <Button
                variant="outline"
                onClick={() => handleTabChange("addresses")}
              >
                <MapPin className="w-4 h-4" />
                Add an Address First
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Add Address Dialog */}
      <AddAddressDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
      />
    </div>
  );
};

export default Dashboard;
