import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Check, X, FileText, Clock, MapPin, Wrench, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Contractor = Database["public"]["Tables"]["contractors"]["Row"];

interface ContractorApplication extends Contractor {
  profileName?: string;
  profilePhone?: string;
}

interface QuestionnaireResponses {
  identity?: {
    fullName?: string;
    mobileNumber?: string;
    abn?: string;
    independentBusinessConfirmed?: boolean;
    insuranceCoversLawnCare?: boolean;
    insuranceCertificatePath?: string;
  };
  services?: {
    mowerTypes?: string[];
    offersGreenWasteRemoval?: boolean;
  };
  operationalRules?: string[];
  experience?: {
    yearsOfExperience?: string;
    portfolioPhotoPaths?: string[];
  };
}

const ContractorApplicationsTab = () => {
  const [applications, setApplications] = useState<ContractorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<ContractorApplication | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [insuranceUrl, setInsuranceUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
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

      const applicationsWithProfiles = contractorData.map((c) => ({
        ...c,
        profileName: profileMap.get(c.user_id)?.name || "Unknown",
        profilePhone: profileMap.get(c.user_id)?.phone || undefined,
      }));

      setApplications(applicationsWithProfiles);
    }

    setLoading(false);
  };

  const getSignedUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("contractor-documents")
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error("Failed to get signed URL:", error);
      return null;
    }
    return data.signedUrl;
  };

  const openReviewDialog = async (application: ContractorApplication) => {
    setSelectedApplication(application);
    setAdminNotes("");
    setInsuranceUrl(null);

    // Get signed URL for insurance certificate if it exists
    if (application.insurance_certificate_url) {
      const url = await getSignedUrl(application.insurance_certificate_url);
      setInsuranceUrl(url);
    }

    setDialogOpen(true);
  };

  const handleApproval = async (approved: boolean) => {
    if (!selectedApplication) return;

    setProcessing(true);

    const { data: { user } } = await supabase.auth.getUser();

    const updateData: Partial<Contractor> = {
      approval_status: approved ? "approved" : "rejected",
      approved_at: approved ? new Date().toISOString() : null,
      approved_by: approved ? user?.id : null,
      is_active: approved,
    };

    const { error } = await supabase
      .from("contractors")
      .update(updateData)
      .eq("id", selectedApplication.id);

    if (error) {
      toast.error("Failed to update application status");
      setProcessing(false);
      return;
    }

    toast.success(
      approved
        ? `${selectedApplication.profileName} has been approved as a contractor!`
        : `Application from ${selectedApplication.profileName} has been rejected.`
    );

    setDialogOpen(false);
    setProcessing(false);
    fetchApplications();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "Pending Review",
      approved: "Approved",
      rejected: "Rejected",
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  const parseQuestionnaire = (responses: unknown): QuestionnaireResponses | null => {
    if (!responses || typeof responses !== "object") return null;
    return responses as QuestionnaireResponses;
  };

  const pendingApplications = applications.filter((a) => a.approval_status === "pending");
  const processedApplications = applications.filter((a) => a.approval_status !== "pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Applications
            {pendingApplications.length > 0 && (
              <Badge variant="secondary">{pendingApplications.length}</Badge>
            )}
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
                {pendingApplications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      {application.profileName}
                    </TableCell>
                    <TableCell>{application.business_name || "-"}</TableCell>
                    <TableCell>{application.abn || "-"}</TableCell>
                    <TableCell>
                      {application.applied_at
                        ? new Date(application.applied_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReviewDialog(application)}
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

      {/* Processed Applications */}
      <Card>
        <CardHeader>
          <CardTitle>All Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {processedApplications.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No processed applications yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedApplications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      {application.profileName}
                    </TableCell>
                    <TableCell>{application.business_name || "-"}</TableCell>
                    <TableCell>{getStatusBadge(application.approval_status)}</TableCell>
                    <TableCell>
                      {application.approved_at
                        ? new Date(application.approved_at).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReviewDialog(application)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Review Contractor Application</DialogTitle>
          </DialogHeader>

          {selectedApplication && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Applicant Name</Label>
                    <p className="font-medium">{selectedApplication.profileName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Business Name</Label>
                    <p className="font-medium">{selectedApplication.business_name || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">ABN</Label>
                    <p className="font-medium">{selectedApplication.abn || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedApplication.phone || selectedApplication.profilePhone || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Applied Date</Label>
                    <p className="font-medium">
                      {selectedApplication.applied_at
                        ? new Date(selectedApplication.applied_at).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedApplication.approval_status)}</div>
                  </div>
                </div>

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
                  ) : selectedApplication.insurance_certificate_url ? (
                    <p className="text-muted-foreground text-sm">Loading certificate...</p>
                  ) : (
                    <p className="text-muted-foreground text-sm">No certificate uploaded</p>
                  )}
                </div>

                {/* Service Radius */}
                {selectedApplication.service_radius_km && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Service Radius
                    </Label>
                    <p className="font-medium">{selectedApplication.service_radius_km} km</p>
                  </div>
                )}

                {/* Questionnaire Responses */}
                {selectedApplication.questionnaire_responses && (
                  <div className="space-y-4">
                    {(() => {
                      const responses = parseQuestionnaire(selectedApplication.questionnaire_responses);
                      if (!responses) return null;

                      return (
                        <>
                          {/* Services & Equipment */}
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
                                  <span className="text-sm text-muted-foreground">Green Waste Removal: </span>
                                  <span className="font-medium">
                                    {responses.services.offersGreenWasteRemoval ? "Yes" : "No"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Experience */}
                          {responses.experience && (
                            <div className="space-y-2">
                              <Label>Experience</Label>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <span className="text-sm text-muted-foreground">Years of Experience: </span>
                                <span className="font-medium">
                                  {responses.experience.yearsOfExperience || "Not specified"}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Operational Agreements */}
                          {responses.operationalRules && responses.operationalRules.length > 0 && (
                            <div className="space-y-2">
                              <Label>Agreed to Operational Rules</Label>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <ul className="text-sm space-y-1">
                                  {responses.operationalRules.map((rule, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                      <span>{rule}</span>
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
                {selectedApplication.approval_status === "pending" && (
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

          {selectedApplication?.approval_status === "pending" && (
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
    </div>
  );
};

export default ContractorApplicationsTab;
