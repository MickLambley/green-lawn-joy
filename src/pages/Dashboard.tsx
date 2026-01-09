import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import AddAddressDialog from "@/components/dashboard/AddAddressDialog";
import BookingDialog from "@/components/dashboard/BookingDialog";
import type { Database } from "@/integrations/supabase/types";

type Address = Database["public"]["Tables"]["addresses"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "addresses" | "bookings">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedAddressForBooking, setSelectedAddressForBooking] = useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
        if (!session?.user) {
          navigate("/auth");
        } else {
          setTimeout(() => {
            fetchUserData(session.user.id);
            checkAdminStatus(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (!session?.user) {
        navigate("/auth");
      } else {
        fetchUserData(session.user.id);
        checkAdminStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    const { data: addressData } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (addressData) {
      setAddresses(addressData);
    }

    const { data: bookingData } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", userId)
      .order("scheduled_date", { ascending: false });

    if (bookingData) {
      setBookings(bookingData);
    }
  };

  const checkAdminStatus = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    setIsAdmin(roles && roles.length > 0);
  };

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

  const handleAddressAdded = () => {
    if (user) {
      fetchUserData(user.id);
    }
  };

  const openBookingDialog = (address: Address) => {
    setSelectedAddressForBooking(address);
    setBookingDialogOpen(true);
  };

  const handleBookingSuccess = () => {
    if (user) {
      fetchUserData(user.id);
    }
    toast.success("Booking created successfully!");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending Verification" },
      verified: { variant: "default", label: "Verified" },
      rejected: { variant: "destructive", label: "Rejected" },
      confirmed: { variant: "default", label: "Confirmed" },
      completed: { variant: "outline", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const { variant, label } = config[status] || { variant: "secondary", label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getSlopeLabel = (slope: string) => {
    const labels: Record<string, string> = {
      flat: "Flat",
      mild: "Mild slope",
      steep: "Steep slope",
    };
    return labels[slope] || slope;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl gradient-hero animate-pulse" />
      </div>
    );
  }

  const userName = user?.user_metadata?.full_name || "there";
  const verifiedAddresses = addresses.filter(a => a.status === "verified");
  const pendingAddresses = addresses.filter(a => a.status === "pending");
  const upcomingBookings = bookings.filter(b => b.status === "pending" || b.status === "confirmed");
  const completedBookings = bookings.filter(b => b.status === "completed");

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
              {pendingAddresses.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </button>
            <Button size="sm" onClick={openAddressDialog}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Address</span>
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
                      {verifiedAddresses.length}
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
                      {upcomingBookings.length}
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
                      {completedBookings.length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Completed Services
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Getting Started or Pending Status */}
            {addresses.length === 0 ? (
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
            ) : (
              <div className="bg-card rounded-2xl p-6 md:p-8 shadow-soft">
                <h2 className="font-display text-lg md:text-xl font-bold text-foreground mb-4">
                  Your Addresses
                </h2>
                <div className="space-y-3">
                  {addresses.slice(0, 3).map((address) => (
                    <div key={address.id} className="flex items-center justify-between p-4 rounded-xl border border-border">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{address.street_address}</p>
                          <p className="text-sm text-muted-foreground">{address.city}, {address.state}</p>
                        </div>
                      </div>
                      {getStatusBadge(address.status)}
                    </div>
                  ))}
                  {addresses.length > 3 && (
                    <Button variant="ghost" className="w-full" onClick={() => handleTabChange("addresses")}>
                      View all addresses
                    </Button>
                  )}
                </div>
              </div>
            )}
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

            {addresses.length === 0 ? (
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
            ) : (
              <div className="space-y-4">
                {addresses.map((address) => (
                  <div key={address.id} className="bg-card rounded-2xl p-6 shadow-soft">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{address.street_address}</h3>
                            {getStatusBadge(address.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {address.city}, {address.state} {address.postal_code}
                          </p>
                        <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                            <span>Slope: {getSlopeLabel(address.slope)}</span>
                            <span>•</span>
                            <span>Tiers: {address.tier_count}</span>
                            {address.square_meters && (
                              <>
                                <span>•</span>
                                <span>{address.square_meters} m²</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {address.status === "verified" && (
                        <Button size="sm" onClick={() => openBookingDialog(address)}>
                          <Calendar className="w-4 h-4" />
                          Book Now
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg md:text-xl font-bold text-foreground">
                My Bookings
              </h2>
              <Button size="sm" disabled={verifiedAddresses.length === 0}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Booking</span>
              </Button>
            </div>

            {bookings.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 md:p-12 shadow-soft text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-display text-lg md:text-xl font-semibold text-foreground mb-2">
                  No bookings yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm md:text-base">
                  {verifiedAddresses.length > 0
                    ? "You have verified addresses ready for booking. Schedule your first lawn care service!"
                    : "Once you have a verified address, you can book lawn care services. Add an address first to get started."}
                </p>
                {verifiedAddresses.length > 0 ? (
                  <Button onClick={() => openBookingDialog(verifiedAddresses[0])}>
                    <Calendar className="w-4 h-4" />
                    Book Your First Service
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => handleTabChange("addresses")}>
                    <MapPin className="w-4 h-4" />
                    Add an Address First
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const address = addresses.find(a => a.id === booking.address_id);
                  return (
                    <div key={booking.id} className="bg-card rounded-2xl p-6 shadow-soft">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-6 h-6 text-accent-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">
                                {new Date(booking.scheduled_date).toLocaleDateString("en-AU", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </h3>
                              {getStatusBadge(booking.status)}
                            </div>
                            {address && (
                              <p className="text-sm text-muted-foreground">
                                {address.street_address}, {address.city}
                              </p>
                            )}
                            {booking.total_price && (
                              <p className="text-sm font-medium text-primary mt-2">
                                Total: ${booking.total_price}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Address Dialog */}
      <AddAddressDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        onSuccess={handleAddressAdded}
      />

      {/* Booking Dialog */}
      {selectedAddressForBooking && (
        <BookingDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          address={selectedAddressForBooking}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
};

export default Dashboard;
