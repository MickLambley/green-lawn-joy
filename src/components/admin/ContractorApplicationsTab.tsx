import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye, Check, X, FileText, Clock, MapPin, Wrench, Loader2, User,
  Edit, Trash2, Ban, UserCheck, Users 
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Contractor = Database["public"]["Tables"]["contractors"]["Row"];

interface ContractorWithProfile extends Contractor {
  profileName?: string;
  profilePhone?: string;
}

interface QuestionnaireResponses {
  identity?: {
    businessName?: string;
    fullName?: string;
    mobileNumber?: string;
    confirmIndependentBusiness?: boolean;
    confirmInsuranceCoverage?: boolean;
    businessAddress?: string;
    mailingAddress?: string;
  };
  services?: {
    mowerTypes?: string[];
    offersGreenWasteRemoval?: boolean;
  };
  operationalRules?: {
    agreePhotoUpload?: boolean;
    agreeSafeWorksite?: boolean;
    agreeCancellationPolicy?: boolean;
    agreePromptCommunication?: boolean;
    agreeProfessionalStandard?: boolean;
    agreeEscrowPayment?: boolean;
    agreeDisputeProcess?: boolean;
  };
  experience?: {
    yearsExperience?: string;
    portfolioPhotoPaths?: string[];
  };
}

const operationalRuleLabels: Record<string, string> = {
  agreePhotoUpload: "Upload before/after photos for each job",
  agreeSafeWorksite: "Maintain a safe worksite",
  agreeCancellationPolicy: "Follow cancellation policy (24hr notice)",
  agreePromptCommunication: "Respond to customer messages within 4 hours",
  agreeProfessionalStandard: "Maintain professional standards",
  agreeEscrowPayment: "Accept escrow-style payment (released after job completion)",
  agreeDisputeProcess: "Follow dispute resolution process",
};

const ContractorApplicationsTab = () => {
  const [contractors, setContractors] = useState<ContractorWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContractor, setSelectedContractor] = useState<ContractorWithProfile | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [insuranceUrl, setInsuranceUrl] = useState<string | null>(null);
  
  // Edit form state
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editServiceAreas, setEditServiceAreas] = useState("");
  const [editServiceRadius, setEditServiceRadius] = useState("");

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    setLoading(true);

    const { data: contractorData } = await supabase
      .from("contractors")
      .select("*")
      .order("applied_at", { ascending: false });

    if (contractorData) {
      const userIds = contractorData.map((c) => c.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);

      const profileMap = new Map(
        profilesData?.map((p) => [p.user_id, { name: p.full_name, phone: p.phone }]) || []
      );

      const contractorsWithProfiles = contractorData.map((c) => ({
        ...c,
        profileName: profileMap.get(c.user_id)?.name || "Unknown",
        profilePhone: profileMap.get(c.user_id)?.phone || undefined,
      }));

      setContractors(contractorsWithProfiles);
    }

    setLoading(false);
  };

  const getSignedUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("contractor-documents")
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error("Failed to get signed URL:", error);
      return null;
    }
    return data.signedUrl;
  };

  const openReviewDialog = async (contractor: ContractorWithProfile) => {
    setSelectedContractor(contractor);
    setAdminNotes("");
    setInsuranceUrl(null);

    if (contractor.insurance_certificate_url) {
      const url = await getSignedUrl(contractor.insurance_certificate_url);
      setInsuranceUrl(url);
    }

    setReviewDialogOpen(true);
  };

  const openEditDialog = (contractor: ContractorWithProfile) => {
    setSelectedContractor(contractor);
    setEditBusinessName(contractor.business_name || "");
    setEditPhone(contractor.phone || "");
    setEditServiceAreas(contractor.service_areas?.join(", ") || "");
    setEditServiceRadius(contractor.service_radius_km?.toString() || "");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (contractor: ContractorWithProfile) => {
    setSelectedContractor(contractor);
    setDeleteDialogOpen(true);
  };

  const handleApproval = async (approved: boolean) => {
    if (!selectedContractor) return;

    setProcessing(true);

    const { data: { user } } = await supabase.auth.getUser();

    // Add or ensure contractor role exists
    if (approved) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({
          user_id: selectedContractor.user_id,
          role: "contractor" as const,
        }, { onConflict: "user_id,role" });

      if (roleError && roleError.code !== "23505") {
        console.error("Failed to add contractor role:", roleError);
      }
    }

    const updateData: Partial<Contractor> = {
      approval_status: approved ? "approved" : "rejected",
      approved_at: approved ? new Date().toISOString() : null,
      approved_by: approved ? user?.id : null,
      is_active: approved,
    };

    const { error } = await supabase
      .from("contractors")
      .update(updateData)
      .eq("id", selectedContractor.id);

    if (error) {
      toast.error("Failed to update application status");
      setProcessing(false);
      return;
    }

    toast.success(
      approved
        ? `${selectedContractor.profileName} has been approved as a contractor!`
        : `Application from ${selectedContractor.profileName} has been rejected.`
    );

    setReviewDialogOpen(false);
    setProcessing(false);
    fetchContractors();
  };

  const handleSuspend = async (contractor: ContractorWithProfile) => {
    const newActiveStatus = !contractor.is_active;
    
    const { error } = await supabase
      .from("contractors")
      .update({ is_active: newActiveStatus })
      .eq("id", contractor.id);

    if (error) {
      toast.error("Failed to update contractor status");
      return;
    }

    toast.success(
      newActiveStatus 
        ? `${contractor.profileName} has been reactivated.`
        : `${contractor.profileName} has been suspended.`
    );
    fetchContractors();
  };

  const handleUpdate = async () => {
    if (!selectedContractor) return;

    setProcessing(true);

    const areasArray = editServiceAreas
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const { error } = await supabase
      .from("contractors")
      .update({
        business_name: editBusinessName || null,
        phone: editPhone || null,
        service_areas: areasArray,
        service_radius_km: editServiceRadius ? parseFloat(editServiceRadius) : null,
      })
      .eq("id", selectedContractor.id);

    if (error) {
      toast.error("Failed to update contractor");
      setProcessing(false);
      return;
    }

    toast.success("Contractor updated successfully");
    setEditDialogOpen(false);
    setProcessing(false);
    fetchContractors();
  };

  const handleDelete = async () => {
    if (!selectedContractor) return;

    setProcessing(true);

    // Remove contractor role
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", selectedContractor.user_id)
      .eq("role", "contractor");

    // Delete contractor record
    const { error } = await supabase
      .from("contractors")
      .delete()
      .eq("id", selectedContractor.id);

    if (error) {
      toast.error("Failed to delete contractor");
      setProcessing(false);
      return;
    }

    toast.success(`${selectedContractor.profileName} has been removed.`);
    setDeleteDialogOpen(false);
    setProcessing(false);
    fetchContractors();
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (status === "approved" && !isActive) {
      return <Badge variant="outline" className="text-orange-600 border-orange-300">Suspended</Badge>;
    }
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "Pending Review",
      approved: "Active",
      rejected: "Rejected",
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  const parseQuestionnaire = (responses: unknown): QuestionnaireResponses | null => {
    if (!responses || typeof responses !== "object") return null;
    return responses as QuestionnaireResponses;
  };

  const pendingApplications = contractors.filter((c) => c.approval_status === "pending");
  const activeContractors = contractors.filter((c) => c.approval_status === "approved");
  const rejectedApplications = contractors.filter((c) => c.approval_status === "rejected");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending
            {pendingApplications.length > 0 && (
              <Badge variant="secondary">{pendingApplications.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Active
            <Badge variant="outline">{activeContractors.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <X className="w-4 h-4" />
            Rejected
            <Badge variant="outline">{rejectedApplications.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Pending Applications */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingApplications.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No pending contractor applications.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>ABN</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApplications.map((contractor) => (
                      <TableRow key={contractor.id}>
                        <TableCell className="font-medium">
                          {contractor.profileName}
                        </TableCell>
                        <TableCell>{contractor.business_name || "-"}</TableCell>
                        <TableCell>{contractor.abn || "-"}</TableCell>
                        <TableCell>
                          {contractor.applied_at
                            ? new Date(contractor.applied_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReviewDialog(contractor)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
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

        {/* Active Contractors */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Active Contractors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeContractors.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No active contractors.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Service Radius</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeContractors.map((contractor) => (
                      <TableRow key={contractor.id}>
                        <TableCell className="font-medium">
                          {contractor.profileName}
                        </TableCell>
                        <TableCell>{contractor.business_name || "-"}</TableCell>
                        <TableCell>{contractor.phone || contractor.profilePhone || "-"}</TableCell>
                        <TableCell>
                          {contractor.service_radius_km ? `${contractor.service_radius_km} km` : "-"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(contractor.approval_status, contractor.is_active)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openReviewDialog(contractor)}
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(contractor)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSuspend(contractor)}
                              title={contractor.is_active ? "Suspend" : "Reactivate"}
                            >
                              {contractor.is_active ? (
                                <Ban className="w-4 h-4 text-orange-500" />
                              ) : (
                                <UserCheck className="w-4 h-4 text-green-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(contractor)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
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

        {/* Rejected Applications */}
        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {rejectedApplications.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No rejected applications.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Rejected Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedApplications.map((contractor) => (
                      <TableRow key={contractor.id}>
                        <TableCell className="font-medium">
                          {contractor.profileName}
                        </TableCell>
                        <TableCell>{contractor.business_name || "-"}</TableCell>
                        <TableCell>
                          {contractor.approved_at
                            ? new Date(contractor.approved_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openReviewDialog(contractor)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(contractor)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
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
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedContractor?.approval_status === "pending" 
                ? "Review Contractor Application" 
                : "Contractor Details"}
            </DialogTitle>
          </DialogHeader>

          {selectedContractor && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Applicant Name</Label>
                    <p className="font-medium">{selectedContractor.profileName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Business Name</Label>
                    <p className="font-medium">{selectedContractor.business_name || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">ABN</Label>
                    <p className="font-medium">{selectedContractor.abn || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedContractor.phone || selectedContractor.profilePhone || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Business Address</Label>
                    <p className="font-medium">{selectedContractor.business_address || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Applied Date</Label>
                    <p className="font-medium">
                      {selectedContractor.applied_at
                        ? new Date(selectedContractor.applied_at).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedContractor.approval_status, selectedContractor.is_active)}
                    </div>
                  </div>
                </div>

                {/* Service Areas */}
                {selectedContractor.service_areas && selectedContractor.service_areas.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Serviced Suburbs ({selectedContractor.service_areas.length})
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {selectedContractor.service_areas.map((suburb, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {suburb}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insurance Certificate */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Insurance Certificate
                  </Label>
                  {insuranceUrl ? (
                    <a
                      href={insuranceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      View Certificate (opens in new tab)
                    </a>
                  ) : selectedContractor.insurance_certificate_url ? (
                    <p className="text-muted-foreground text-sm">Loading certificate...</p>
                  ) : (
                    <p className="text-muted-foreground text-sm">No certificate uploaded</p>
                  )}
                </div>

                {/* Service Radius */}
                {selectedContractor.service_radius_km && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Service Radius
                    </Label>
                    <p className="font-medium">{selectedContractor.service_radius_km} km</p>
                  </div>
                )}

                {/* Questionnaire Responses */}
                {selectedContractor.questionnaire_responses && (
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Application Questionnaire</Label>
                    {(() => {
                      const responses = parseQuestionnaire(selectedContractor.questionnaire_responses);
                      if (!responses) return null;

                      return (
                        <>
                          {/* Identity Details */}
                          {responses.identity && (
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Identity & Business Details
                              </Label>
                              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                {responses.identity.businessName && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">Business Name: </span>
                                    <span className="font-medium">{responses.identity.businessName}</span>
                                  </div>
                                )}
                                {responses.identity.fullName && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">Full Name: </span>
                                    <span className="font-medium">{responses.identity.fullName}</span>
                                  </div>
                                )}
                                {responses.identity.mobileNumber && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">Mobile: </span>
                                    <span className="font-medium">{responses.identity.mobileNumber}</span>
                                  </div>
                                )}
                                {responses.identity.businessAddress && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">Business Address: </span>
                                    <span className="font-medium">{responses.identity.businessAddress}</span>
                                  </div>
                                )}
                                {responses.identity.mailingAddress && responses.identity.mailingAddress !== responses.identity.businessAddress && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">Mailing Address: </span>
                                    <span className="font-medium">{responses.identity.mailingAddress}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  {responses.identity.confirmIndependentBusiness ? (
                                    <Check className="w-4 h-4 text-primary" />
                                  ) : (
                                    <X className="w-4 h-4 text-destructive" />
                                  )}
                                  <span className="text-sm">Confirmed independent business operator</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {responses.identity.confirmInsuranceCoverage ? (
                                    <Check className="w-4 h-4 text-primary" />
                                  ) : (
                                    <X className="w-4 h-4 text-destructive" />
                                  )}
                                  <span className="text-sm">Insurance covers lawn care services</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {responses.services && (
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Wrench className="w-4 h-4" />
                                Services & Equipment
                              </Label>
                              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                <div>
                                  <span className="text-sm text-muted-foreground">Mower Types: </span>
                                  <span className="font-medium">
                                    {responses.services.mowerTypes?.join(", ") || "Not specified"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Offers Green Waste Removal: </span>
                                  <span className="font-medium">
                                    {responses.services.offersGreenWasteRemoval === true ? "Yes" : responses.services.offersGreenWasteRemoval === false ? "No" : "Not specified"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {responses.experience && (
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Experience
                              </Label>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <span className="text-sm text-muted-foreground">Years of Experience: </span>
                                <span className="font-medium">
                                  {responses.experience.yearsExperience || "Not specified"}
                                </span>
                                {responses.experience.portfolioPhotoPaths && responses.experience.portfolioPhotoPaths.length > 0 && (
                                  <div className="mt-2">
                                    <span className="text-sm text-muted-foreground">
                                      Portfolio: {responses.experience.portfolioPhotoPaths.length} photo(s) uploaded
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {responses.operationalRules && (
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                Operational Rules Agreement
                              </Label>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <ul className="text-sm space-y-1">
                                  {Object.entries(responses.operationalRules).map(([key, value]) => (
                                    <li key={key} className="flex items-start gap-2">
                                      {value ? (
                                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                      ) : (
                                        <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                                      )}
                                      <span>{operationalRuleLabels[key] || key}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Admin Notes */}
                {selectedContractor.approval_status === "pending" && (
                  <div className="space-y-2">
                    <Label>Admin Notes (Optional)</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add any notes about this application..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {selectedContractor?.approval_status === "pending" && (
            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={() => handleApproval(false)}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                Reject
              </Button>
              <Button onClick={() => handleApproval(true)} disabled={processing}>
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contractor</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={editBusinessName}
                onChange={(e) => setEditBusinessName(e.target.value)}
                placeholder="e.g., Green Thumb Lawn Care"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="e.g., 0412 345 678"
              />
            </div>

            <div className="space-y-2">
              <Label>Service Areas</Label>
              <Input
                value={editServiceAreas}
                onChange={(e) => setEditServiceAreas(e.target.value)}
                placeholder="e.g., Brisbane, Gold Coast, Ipswich"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of suburbs/cities.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Service Radius (km)</Label>
              <Input
                type="number"
                value={editServiceRadius}
                onChange={(e) => setEditServiceRadius(e.target.value)}
                placeholder="e.g., 25"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={processing}>
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contractor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently remove {selectedContractor?.profileName} as a contractor? 
              This will delete their contractor profile and remove their contractor role.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContractorApplicationsTab;
