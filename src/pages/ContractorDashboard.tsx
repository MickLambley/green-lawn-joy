import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Leaf,
  LogOut,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  DollarSign,
  Check,
  X,
  CalendarClock,
  Briefcase,
  AlertCircle,
  Clock as ClockIcon2,
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Address = Database["public"]["Tables"]["addresses"]["Row"];
type Contractor = Database["public"]["Tables"]["contractors"]["Row"];

interface BookingWithAddress extends Booking {
  address?: Address;
}

const timeSlots = [
  { value: "7am-10am", label: "7:00 AM - 10:00 AM" },
  { value: "10am-2pm", label: "10:00 AM - 2:00 PM" },
  { value: "2pm-5pm", label: "2:00 PM - 5:00 PM" },
];

const ContractorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableJobs, setAvailableJobs] = useState<BookingWithAddress[]>([]);
  const [myJobs, setMyJobs] = useState<BookingWithAddress[]>([]);
  const [selectedJob, setSelectedJob] = useState<BookingWithAddress | null>(null);
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
  const [suggestedDate, setSuggestedDate] = useState<Date | undefined>(undefined);
  const [suggestedTimeSlot, setSuggestedTimeSlot] = useState("10am-2pm");

  useEffect(() => {
    checkContractorAccess();
  }, []);

  const checkContractorAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    setUser(user);

    // Check if user has contractor role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "contractor");

    if (!roles || roles.length === 0) {
      toast.error("You don't have contractor access");
      navigate("/auth");
      return;
    }

    // Check if user has a contractor profile
    const { data: contractorData } = await supabase
      .from("contractors")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!contractorData) {
      toast.error("Contractor profile not found");
      navigate("/contractor-auth");
      return;
    }

    // Check if onboarding is complete
    if (!contractorData.abn) {
      navigate("/contractor-onboarding");
      return;
    }

    setContractor(contractorData);
    setIsLoading(false);
    
    // Only fetch jobs if approved
    if (contractorData.approval_status === "approved") {
      fetchJobs(contractorData);
    }
  };

  const fetchJobs = async (contractorData: Contractor) => {
    // Fetch available jobs (pending, paid, not assigned)
    const { data: availableData } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "pending")
      .eq("payment_status", "paid")
      .is("contractor_id", null)
      .order("scheduled_date", { ascending: true });

    // Fetch addresses for available jobs
    if (availableData && availableData.length > 0) {
      const addressIds = availableData.map(b => b.address_id);
      const { data: addressData } = await supabase
        .from("addresses")
        .select("*")
        .in("id", addressIds);

      const addressMap = new Map(addressData?.map(a => [a.id, a]) || []);
      
      // Filter by service areas
      const jobsInArea = availableData
        .map(b => ({ ...b, address: addressMap.get(b.address_id) }))
        .filter(b => {
          if (!b.address || contractorData.service_areas.length === 0) return true;
          return contractorData.service_areas.some(
            area => b.address?.city.toLowerCase().includes(area.toLowerCase()) ||
                    b.address?.postal_code.includes(area)
          );
        });

      setAvailableJobs(jobsInArea);
    } else {
      setAvailableJobs([]);
    }

    // Fetch my accepted jobs
    const { data: myJobsData } = await supabase
      .from("bookings")
      .select("*")
      .eq("contractor_id", contractorData.id)
      .in("status", ["confirmed", "pending"])
      .order("scheduled_date", { ascending: true });

    if (myJobsData && myJobsData.length > 0) {
      const addressIds = myJobsData.map(b => b.address_id);
      const { data: addressData } = await supabase
        .from("addresses")
        .select("*")
        .in("id", addressIds);

      const addressMap = new Map(addressData?.map(a => [a.id, a]) || []);
      setMyJobs(myJobsData.map(b => ({ ...b, address: addressMap.get(b.address_id) })));
    } else {
      setMyJobs([]);
    }
  };

  const handleAcceptJob = async (booking: BookingWithAddress) => {
    if (!contractor) return;

    const { error } = await supabase
      .from("bookings")
      .update({
        contractor_id: contractor.id,
        contractor_accepted_at: new Date().toISOString(),
        status: "confirmed",
      })
      .eq("id", booking.id);

    if (error) {
      toast.error("Failed to accept job");
      return;
    }

    toast.success("Job accepted! It's now in your schedule.");
    fetchJobs(contractor);
  };

  const handleSuggestAlternative = async () => {
    if (!contractor || !selectedJob || !suggestedDate) return;

    try {
      // Insert into alternative_suggestions table
      const { error: suggestionError } = await supabase
        .from("alternative_suggestions")
        .insert({
          booking_id: selectedJob.id,
          contractor_id: contractor.id,
          suggested_date: suggestedDate.toISOString().split("T")[0],
          suggested_time_slot: suggestedTimeSlot,
          status: "pending",
        });

      if (suggestionError) {
        // Check if it's a duplicate date/time
        if (suggestionError.code === "23505") {
          toast.error("This date and time has already been suggested for this job");
          return;
        }
        throw suggestionError;
      }

      // Notify the customer
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: selectedJob.user_id,
          title: "Alternative Time Suggested",
          message: `A contractor has suggested an alternative time: ${suggestedDate.toLocaleDateString("en-AU", {
            weekday: "long",
            month: "long",
            day: "numeric"
          })} at ${timeSlots.find(t => t.value === suggestedTimeSlot)?.label || suggestedTimeSlot}. Please review and respond.`,
          type: "info",
          booking_id: selectedJob.id,
        });

      if (notificationError) {
        console.error("Failed to send notification:", notificationError);
      }

      toast.success("Alternative date suggested! The customer will be notified.");
      setSuggestDialogOpen(false);
      setSelectedJob(null);
      setSuggestedDate(undefined);
      fetchJobs(contractor);
    } catch (error) {
      console.error("Error suggesting alternative:", error);
      toast.error("Failed to suggest alternative");
    }
  };

  const handleCompleteJob = async (booking: BookingWithAddress) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", booking.id);

    if (error) {
      toast.error("Failed to mark job as complete");
      return;
    }

    toast.success("Job marked as complete!");
    if (contractor) fetchJobs(contractor);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      confirmed: { variant: "default", label: "Confirmed" },
      completed: { variant: "outline", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const { variant, label } = config[status] || { variant: "secondary", label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl gradient-hero animate-pulse" />
      </div>
    );
  }

  // Check if contractor is pending approval
  const isPendingApproval = contractor?.approval_status === "pending";
  const isRejected = contractor?.approval_status === "rejected";

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
              <Badge variant="outline" className="ml-2">Contractor</Badge>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {contractor?.business_name && (
              <span className="text-sm text-muted-foreground hidden sm:block">
                {contractor.business_name}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Pending Approval Message */}
        {isPendingApproval && (
          <Card className="mb-8 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-800/30">
                  <ClockIcon2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    Application Under Review
                  </h3>
                  <p className="text-amber-700 dark:text-amber-300 text-sm mb-3">
                    Your contractor application is currently being reviewed by our team. 
                    This typically takes 1-2 business days. Once approved, you'll be able 
                    to view and accept jobs in your area.
                  </p>
                  <div className="text-sm text-amber-600 dark:text-amber-400">
                    <p><strong>Business Name:</strong> {contractor?.business_name}</p>
                    <p><strong>ABN:</strong> {contractor?.abn}</p>
                    <p><strong>Service Areas:</strong> {contractor?.service_areas?.length || 0} suburbs</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejected Message */}
        {isRejected && (
          <Card className="mb-8 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-red-100 dark:bg-red-800/30">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                    Application Not Approved
                  </h3>
                  <p className="text-red-700 dark:text-red-300 text-sm">
                    Unfortunately, your contractor application was not approved. 
                    Please contact our support team if you have any questions or 
                    would like to reapply.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Only show dashboard content if approved */}
        {!isPendingApproval && !isRejected && (
          <>
            {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{availableJobs.length}</p>
                  <p className="text-sm text-muted-foreground">Available Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/20">
                  <CalendarIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{myJobs.length}</p>
                  <p className="text-sm text-muted-foreground">Upcoming Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/20">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${myJobs.reduce((sum, job) => sum + (Number(job.total_price) || 0), 0).toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending Earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Jobs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Available Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableJobs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No available jobs in your service areas right now.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{job.address?.street_address}</p>
                            <p className="text-sm text-muted-foreground">
                              {job.address?.city}, {job.address?.state}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 mt-1 text-muted-foreground" />
                          <div>
                            <p>{new Date(job.scheduled_date).toLocaleDateString("en-AU", {
                              weekday: "short",
                              month: "short",
                              day: "numeric"
                            })}</p>
                            <p className="text-sm text-muted-foreground">
                              {timeSlots.find(t => t.value === job.time_slot)?.label || job.time_slot}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <p>{job.address?.square_meters}m²</p>
                          <p className="text-muted-foreground">
                            Grass: {job.grass_length} • {job.clippings_removal ? "Remove clippings" : "Leave clippings"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-lg">${Number(job.total_price).toFixed(0)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAcceptJob(job)}>
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedJob(job);
                              setSuggestDialogOpen(true);
                            }}
                          >
                            <CalendarClock className="w-4 h-4 mr-1" />
                            Suggest Time
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

        {/* My Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              My Scheduled Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myJobs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                You haven't accepted any jobs yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{job.address?.street_address}</p>
                            <p className="text-sm text-muted-foreground">
                              {job.address?.city}, {job.address?.state}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{new Date(job.scheduled_date).toLocaleDateString("en-AU", {
                            weekday: "short",
                            month: "short",
                            day: "numeric"
                          })}</p>
                          <p className="text-sm text-muted-foreground">
                            {timeSlots.find(t => t.value === job.time_slot)?.label || job.time_slot}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{job.address?.square_meters}m² • {job.grass_length}</p>
                          <p className="font-bold">${Number(job.total_price).toFixed(0)}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        {job.status === "confirmed" && (
                          <Button size="sm" variant="outline" onClick={() => handleCompleteJob(job)}>
                            <Check className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </>
        )}
      </main>

      {/* Suggest Alternative Dialog */}
      <Dialog open={suggestDialogOpen} onOpenChange={setSuggestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggest Alternative Date/Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Date</Label>
              <div className="flex justify-center mt-2">
                <Calendar
                  mode="single"
                  selected={suggestedDate}
                  onSelect={setSuggestedDate}
                  disabled={{ before: new Date() }}
                  className="rounded-md border"
                />
              </div>
            </div>
            <div>
              <Label>Time Slot</Label>
              <RadioGroup value={suggestedTimeSlot} onValueChange={setSuggestedTimeSlot} className="mt-2">
                {timeSlots.map((slot) => (
                  <div key={slot.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={slot.value} id={slot.value} />
                    <Label htmlFor={slot.value}>{slot.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuggestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSuggestAlternative} disabled={!suggestedDate}>
              Send Suggestion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractorDashboard;
