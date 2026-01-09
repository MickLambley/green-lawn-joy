import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Contractor = Database["public"]["Tables"]["contractors"]["Row"];

interface ContractorWithProfile extends Contractor {
  profileName?: string;
  email?: string;
}

const ContractorManagementTab = () => {
  const [contractors, setContractors] = useState<ContractorWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<ContractorWithProfile | null>(null);
  
  // Form state
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceAreas, setServiceAreas] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    setLoading(true);
    
    const { data: contractorData } = await supabase
      .from("contractors")
      .select("*")
      .order("created_at", { ascending: false });

    if (contractorData) {
      // Fetch profiles for contractor names
      const userIds = contractorData.map(c => c.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);

      const contractorsWithProfiles = contractorData.map(c => ({
        ...c,
        profileName: profileMap.get(c.user_id) || "Unknown",
      }));

      setContractors(contractorsWithProfiles);
    }
    
    setLoading(false);
  };

  const resetForm = () => {
    setEmail("");
    setBusinessName("");
    setPhone("");
    setServiceAreas("");
    setIsActive(true);
    setEditingContractor(null);
  };

  const openNewContractorDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (contractor: ContractorWithProfile) => {
    setEditingContractor(contractor);
    setBusinessName(contractor.business_name || "");
    setPhone(contractor.phone || "");
    setServiceAreas(contractor.service_areas?.join(", ") || "");
    setIsActive(contractor.is_active);
    setDialogOpen(true);
  };

  const handleAddContractor = async () => {
    // Admin needs to add contractors manually via database
    // This provides instructions instead
    toast.info("See instructions below to add a contractor");
  };

  const handleUpdateContractor = async () => {
    if (!editingContractor) return;

    const areasArray = serviceAreas
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const { error } = await supabase
      .from("contractors")
      .update({
        business_name: businessName || null,
        phone: phone || null,
        service_areas: areasArray,
        is_active: isActive,
      })
      .eq("id", editingContractor.id);

    if (error) {
      toast.error("Failed to update contractor");
      return;
    }

    toast.success("Contractor updated successfully");
    setDialogOpen(false);
    resetForm();
    fetchContractors();
  };

  const handleToggleActive = async (contractor: ContractorWithProfile) => {
    const { error } = await supabase
      .from("contractors")
      .update({ is_active: !contractor.is_active })
      .eq("id", contractor.id);

    if (error) {
      toast.error("Failed to update contractor status");
      return;
    }

    toast.success(`Contractor ${!contractor.is_active ? "activated" : "deactivated"}`);
    fetchContractors();
  };

  const handleDeleteContractor = async (contractor: ContractorWithProfile) => {
    if (!confirm(`Are you sure you want to remove ${contractor.profileName || contractor.business_name} as a contractor?`)) {
      return;
    }

    // Remove contractor role
    const { error: roleError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", contractor.user_id)
      .eq("role", "contractor");

    // Remove contractor profile
    const { error } = await supabase
      .from("contractors")
      .delete()
      .eq("id", contractor.id);

    if (error || roleError) {
      toast.error("Failed to remove contractor");
      return;
    }

    toast.success("Contractor removed successfully");
    fetchContractors();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Contractor Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage contractors who service your customers
          </p>
        </div>
        <Button onClick={openNewContractorDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contractor
        </Button>
      </div>

      {contractors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No contractors registered yet.</p>
          <p className="text-sm mt-1">Add contractors to allow them to accept jobs.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Service Areas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractors.map((contractor) => (
              <TableRow key={contractor.id}>
                <TableCell className="font-medium">
                  {contractor.profileName}
                </TableCell>
                <TableCell>{contractor.business_name || "-"}</TableCell>
                <TableCell>{contractor.phone || "-"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {contractor.service_areas?.length > 0 ? (
                      contractor.service_areas.slice(0, 3).map((area, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {area}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">All areas</span>
                    )}
                    {contractor.service_areas?.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{contractor.service_areas.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={contractor.is_active ? "default" : "secondary"}>
                    {contractor.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(contractor)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteContractor(contractor)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContractor ? "Edit Contractor" : "Add New Contractor"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {!editingContractor && (
              <div className="p-4 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-2">To add a new contractor:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Have the contractor sign up for an account</li>
                  <li>Add the 'contractor' role to their user in the database</li>
                  <li>Create a contractor profile entry for them</li>
                </ol>
              </div>
            )}

            {editingContractor && (
              <>
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g., Green Thumb Lawn Care"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g., 0412 345 678"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Service Areas</Label>
                  <Input
                    value={serviceAreas}
                    onChange={(e) => setServiceAreas(e.target.value)}
                    placeholder="e.g., Brisbane, Gold Coast, Ipswich"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of suburbs/cities. Leave empty for all areas.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Active Status</Label>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            {editingContractor && (
              <Button onClick={handleUpdateContractor}>
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractorManagementTab;
