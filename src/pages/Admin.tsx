import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Leaf, LogOut, MapPin, Calendar, Check, X, Eye, Settings, Users, PenTool, AlertTriangle, Star } from "lucide-react";
import PricingSettingsTab from "@/components/admin/PricingSettingsTab";
import ContractorApplicationsTab from "@/components/admin/ContractorApplicationsTab";
import AdminLawnEditorDialog from "@/components/admin/AdminLawnEditorDialog";
import AdminDisputesTab from "@/components/admin/AdminDisputesTab";
import AdminBookingPhotosSection from "@/components/admin/AdminBookingPhotosSection";
import type { Database } from "@/integrations/supabase/types";

// Badge component for pending contractors
const PendingContractorsBadge = () => {
  const [count, setCount] = useState<number>(0);
  
  useEffect(() => {
    const fetchPendingCount = async () => {
      const { count: pendingCount } = await supabase
        .from("contractors")
        .select("*", { count: "exact", head: true })
        .eq("approval_status", "pending");
      
      setCount(pendingCount || 0);
    };
    
    fetchPendingCount();
  }, []);
  
  if (count === 0) return null;
  return <Badge variant="secondary" className="ml-1">{count}</Badge>;
};

type Address = Database["public"]["Tables"]["addresses"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

interface AddressWithProfile extends Address {
  customerName?: string;
}

interface BookingWithDetails extends Booking {
  customerName?: string;
  addressDetails?: { street_address: string; city: string };
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [addresses, setAddresses] = useState<AddressWithProfile[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressWithProfile | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [lawnEditorDialogOpen, setLawnEditorDialogOpen] = useState(false);
  
  // Verification form state - only slope, tiers, and square meters
  const [squareMeters, setSquareMeters] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [editSlope, setEditSlope] = useState<"flat" | "mild" | "steep">("flat");
  const [editTierCount, setEditTierCount] = useState("1");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
    fetchData();
  };

  const fetchData = async () => {
    // Fetch all addresses
    const { data: addressData } = await supabase
      .from("addresses")
      .select("*")
      .order("created_at", { ascending: false });

    // Fetch all profiles to map user_id to names
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name");

    const profileMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);

    if (addressData) {
      const addressesWithNames = addressData.map(addr => ({
        ...addr,
        customerName: profileMap.get(addr.user_id) || "Unknown"
      }));
      setAddresses(addressesWithNames);
    }

    // Fetch bookings
    const { data: bookingData } = await supabase
      .from("bookings")
      .select("*")
      .order("scheduled_date", { ascending: true });

    if (bookingData && addressData) {
      const addressMap = new Map(addressData.map(a => [a.id, { street_address: a.street_address, city: a.city }]));
      const bookingsWithDetails = bookingData.map(b => ({
        ...b,
        customerName: profileMap.get(b.user_id) || "Unknown",
        addressDetails: addressMap.get(b.address_id)
      }));
      setBookings(bookingsWithDetails);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const openVerifyDialog = (address: AddressWithProfile) => {
    setSelectedAddress(address);
    setSquareMeters(address.square_meters?.toString() || "");
    setAdminNotes(address.admin_notes || "");
    setEditSlope(address.slope);
    setEditTierCount(address.tier_count.toString());
    setVerifyDialogOpen(true);
  };

  const handleVerifyAddress = async (status: "verified" | "rejected") => {
    if (!selectedAddress) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    const updateData: Partial<Address> = {
      status,
      admin_notes: adminNotes,
      verified_at: new Date().toISOString(),
      verified_by: user?.id,
    };

    if (status === "verified") {
      updateData.square_meters = squareMeters ? parseFloat(squareMeters) : null;
      updateData.slope = editSlope;
      updateData.tier_count = parseInt(editTierCount);
    }

    const { error } = await supabase
      .from("addresses")
      .update(updateData)
      .eq("id", selectedAddress.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update address status.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Address ${status === "verified" ? "verified" : "rejected"} successfully.`,
    });

    setVerifyDialogOpen(false);
    fetchData();
  };

  const sendBookingEmail = async (bookingId: string, emailType: "created" | "confirmed" | "updated" | "cancelled") => {
    try {
      const { error } = await supabase.functions.invoke("send-booking-email", {
        body: { bookingId, emailType },
      });
      if (error) {
        console.error("Failed to send email:", error);
      }
    } catch (err) {
      console.error("Email notification error:", err);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: "confirmed" | "completed" | "cancelled") => {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update booking status.",
        variant: "destructive",
      });
      return;
    }

    // Send email notification based on status change
    if (status === "confirmed") {
      sendBookingEmail(bookingId, "confirmed");
    } else if (status === "cancelled") {
      sendBookingEmail(bookingId, "cancelled");
    } else if (status === "completed") {
      sendBookingEmail(bookingId, "updated");
    }

    toast({
      title: "Success",
      description: `Booking ${status} successfully.`,
    });

    setBookingDialogOpen(false);
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      verified: "default",
      rejected: "destructive",
      confirmed: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getSlopeLabel = (slope: string) => {
    const labels: Record<string, string> = {
      flat: "Flat",
      mild: "Mild slope",
      steep: "Steep slope",
    };
    return labels[slope] || slope;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const pendingAddresses = addresses.filter((a) => a.status === "pending");
  const pendingBookings = bookings.filter((b) => b.status === "pending");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-display font-bold text-foreground">Lawnly</span>
              <Badge variant="outline" className="ml-2">Admin</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-900/20">
                  <MapPin className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingAddresses.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Addresses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/20">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingBookings.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/20">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {addresses.filter((a) => a.status === "verified").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Verified Addresses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/20">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {bookings.filter((b) => b.status === "completed").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="addresses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="addresses" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Addresses
              {pendingAddresses.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingAddresses.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Bookings
              {pendingBookings.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingBookings.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="contractors" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Contractors
              <PendingContractorsBadge />
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Disputes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="addresses">
            <Card>
              <CardHeader>
                <CardTitle>Address Verification</CardTitle>
              </CardHeader>
              <CardContent>
                {addresses.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No addresses to review.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Slope</TableHead>
                        <TableHead>Tiers</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {addresses.map((address) => (
                        <TableRow key={address.id}>
                          <TableCell>{address.customerName || "Unknown"}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{address.street_address}</p>
                              <p className="text-sm text-muted-foreground">
                                {address.city}, {address.state} {address.postal_code}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getSlopeLabel(address.slope)}</TableCell>
                          <TableCell>{address.tier_count}</TableCell>
                          <TableCell>{getStatusBadge(address.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openVerifyDialog(address)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAddress(address);
                                  setLawnEditorDialogOpen(true);
                                }}
                              >
                                <PenTool className="w-4 h-4 mr-1" />
                                Lawn
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Booking Management</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No bookings yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>{booking.customerName || "Unknown"}</TableCell>
                          <TableCell>
                            {booking.addressDetails?.street_address}, {booking.addressDetails?.city}
                          </TableCell>
                          <TableCell>
                            {new Date(booking.scheduled_date).toLocaleDateString()}
                            {booking.scheduled_time && ` at ${booking.scheduled_time}`}
                          </TableCell>
                          <TableCell>
                            {booking.total_price ? `$${booking.total_price}` : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getStatusBadge(booking.status)}
                              {booking.customer_rating && booking.customer_rating <= 3 && (
                                <Badge variant="destructive" className="text-[10px]">⚠ {booking.customer_rating}★</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setBookingDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardContent className="pt-6">
                <PricingSettingsTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contractors">
            <ContractorApplicationsTab />
          </TabsContent>

          <TabsContent value="disputes">
            <AdminDisputesTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Verify Address Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Address</DialogTitle>
          </DialogHeader>
          {selectedAddress && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-medium">Address Details</h4>
                <div className="p-4 bg-muted rounded-lg space-y-1">
                  <p className="font-medium">{selectedAddress.street_address}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedAddress.country}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Land Slope</Label>
                  <Select value={editSlope} onValueChange={(val) => setEditSlope(val as "flat" | "mild" | "steep")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="mild">Mild slope</SelectItem>
                      <SelectItem value="steep">Steep slope</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Number of Tiers</Label>
                  <Select value={editTierCount} onValueChange={setEditTierCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? "tier" : "tiers"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="squareMeters">Total Square Meters</Label>
                <Input
                  id="squareMeters"
                  type="number"
                  value={squareMeters}
                  onChange={(e) => setSquareMeters(e.target.value)}
                  placeholder="Enter lawn size in m²"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this address..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="destructive"
                  onClick={() => handleVerifyAddress("rejected")}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button onClick={() => handleVerifyAddress("verified")}>
                  <Check className="w-4 h-4 mr-1" />
                  Verify Address
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Management Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Booking</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-medium">Booking Details</h4>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p><strong>Customer:</strong> {selectedBooking.customerName || "Unknown"}</p>
                  <p>
                    <strong>Address:</strong> {selectedBooking.addressDetails?.street_address}, {selectedBooking.addressDetails?.city}
                  </p>
                  <p>
                    <strong>Date:</strong> {new Date(selectedBooking.scheduled_date).toLocaleDateString()}
                    {selectedBooking.scheduled_time && ` at ${selectedBooking.scheduled_time}`}
                  </p>
                  <p><strong>Total Price:</strong> {selectedBooking.total_price ? `$${selectedBooking.total_price}` : "Not set"}</p>
                  <p><strong>Status:</strong> {getStatusBadge(selectedBooking.status)}</p>
                  {selectedBooking.notes && <p><strong>Customer Notes:</strong> {selectedBooking.notes}</p>}
                  {selectedBooking.customer_rating && (
                    <div className="flex items-center gap-2 pt-1">
                      <strong>Rating:</strong>
                      <span className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= (selectedBooking.customer_rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20"}`} />
                        ))}
                      </span>
                      {selectedBooking.customer_rating <= 3 && (
                        <Badge variant="destructive" className="text-[10px]">Low Rating</Badge>
                      )}
                    </div>
                  )}
                  {selectedBooking.rating_comment && (
                    <p><strong>Rating Comment:</strong> {selectedBooking.rating_comment}</p>
                  )}
                  {selectedBooking.contractor_rating_response && (
                    <p><strong>Contractor Response:</strong> {selectedBooking.contractor_rating_response}</p>
                  )}
                </div>
              </div>

              <AdminBookingPhotosSection
                bookingId={selectedBooking.id}
                contractorId={selectedBooking.contractor_id}
              />

              <div className="flex gap-3 justify-end flex-wrap">
                {selectedBooking.status === "pending" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id, "cancelled")}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => handleUpdateBookingStatus(selectedBooking.id, "confirmed")}>
                      Confirm
                    </Button>
                  </>
                )}
                {selectedBooking.status === "confirmed" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id, "cancelled")}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => handleUpdateBookingStatus(selectedBooking.id, "completed")}>
                      Mark Complete
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lawn Editor Dialog */}
      <AdminLawnEditorDialog
        open={lawnEditorDialogOpen}
        onOpenChange={setLawnEditorDialogOpen}
        address={selectedAddress}
        onSaved={fetchData}
      />
    </div>
  );
};

export default Admin;
