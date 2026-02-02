import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Leaf, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { QuestionnaireStep } from "@/components/contractor-onboarding/QuestionnaireStep";
import { BusinessDetailsStep } from "@/components/contractor-onboarding/BusinessDetailsStep";
import { ServiceAreaStep } from "@/components/contractor-onboarding/ServiceAreaStep";
import { ReviewStep } from "@/components/contractor-onboarding/ReviewStep";

export interface QuestionnaireData {
  yearsExperience: string;
  hasOwnTransport: string;
  transportType: string;
  hasOwnEquipment: string;
  equipmentTypes: string[];
  availability: string[];
  additionalInfo: string;
}

export interface BusinessData {
  businessName: string;
  abn: string;
  businessAddress: string;
  phone: string;
  insuranceCertificateUrl: string | null;
}

export interface ServiceAreaData {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  selectedSuburbs: string[];
}

const ContractorOnboarding = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>({
    yearsExperience: "",
    hasOwnTransport: "",
    transportType: "",
    hasOwnEquipment: "",
    equipmentTypes: [],
    availability: [],
    additionalInfo: "",
  });

  const [businessData, setBusinessData] = useState<BusinessData>({
    businessName: "",
    abn: "",
    businessAddress: "",
    phone: "",
    insuranceCertificateUrl: null,
  });

  const [serviceAreaData, setServiceAreaData] = useState<ServiceAreaData>({
    centerLat: -33.8688,
    centerLng: 151.2093,
    radiusKm: 15,
    selectedSuburbs: [],
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/contractor-auth?mode=signup");
      return;
    }

    setUser(user);

    // Check if contractor profile exists
    const { data: contractor } = await supabase
      .from("contractors")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (contractor && contractor.abn) {
      // Already completed onboarding
      navigate("/contractor");
      return;
    }

    // Check contractor role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "contractor");

    if (!roles || roles.length === 0) {
      // Add contractor role if not present
      await supabase.from("user_roles").insert({
        user_id: user.id,
        role: "contractor",
      });

      // Create contractor profile if not present
      if (!contractor) {
        await supabase.from("contractors").insert({
          user_id: user.id,
          service_areas: [],
          is_active: false,
          approval_status: "pending",
        });
      }
    }

    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Update contractor profile
      const { error } = await supabase
        .from("contractors")
        .update({
          business_name: businessData.businessName,
          abn: businessData.abn,
          business_address: businessData.businessAddress,
          phone: businessData.phone,
          insurance_certificate_url: businessData.insuranceCertificateUrl,
          questionnaire_responses: JSON.parse(JSON.stringify(questionnaireData)),
          service_center_lat: serviceAreaData.centerLat,
          service_center_lng: serviceAreaData.centerLng,
          service_radius_km: serviceAreaData.radiusKm,
          service_areas: serviceAreaData.selectedSuburbs,
          approval_status: "pending",
          applied_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Application submitted! We'll review your profile and get back to you soon.");
      navigate("/contractor");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/contractors");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl gradient-hero animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-display font-bold text-foreground">Lawnly</span>
              <span className="ml-2 text-sm text-muted-foreground">Contractor Setup</span>
            </div>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <QuestionnaireStep
            data={questionnaireData}
            onChange={setQuestionnaireData}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <BusinessDetailsStep
            data={businessData}
            onChange={setBusinessData}
            userId={user?.id || ""}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <ServiceAreaStep
            data={serviceAreaData}
            onChange={setServiceAreaData}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <ReviewStep
            questionnaireData={questionnaireData}
            businessData={businessData}
            serviceAreaData={serviceAreaData}
            onSubmit={handleSubmit}
            onBack={() => setCurrentStep(3)}
            isLoading={isLoading}
          />
        )}

        {/* Back to previous step */}
        {currentStep > 1 && currentStep < 4 && (
          <div className="mt-6">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ContractorOnboarding;
