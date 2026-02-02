import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ClipboardList } from "lucide-react";
import type { QuestionnaireData } from "@/pages/ContractorOnboarding";

interface QuestionnaireStepProps {
  data: QuestionnaireData;
  onChange: (data: QuestionnaireData) => void;
  onNext: () => void;
}

const experienceOptions = [
  { value: "none", label: "No experience (willing to learn)" },
  { value: "1-2", label: "1-2 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "5+", label: "5+ years" },
];

const transportOptions = [
  { value: "yes", label: "Yes, I have my own vehicle" },
  { value: "no", label: "No, I don't have transport" },
];

const transportTypes = [
  { value: "ute", label: "Ute / Pickup" },
  { value: "van", label: "Van" },
  { value: "trailer", label: "Car with Trailer" },
  { value: "truck", label: "Truck" },
];

const equipmentOptions = [
  { value: "yes", label: "Yes, I have my own equipment" },
  { value: "partial", label: "I have some equipment" },
  { value: "no", label: "No, I need equipment" },
];

const equipmentTypes = [
  { id: "mower", label: "Lawn Mower" },
  { id: "whipper_snipper", label: "Whipper Snipper / Line Trimmer" },
  { id: "edger", label: "Edger" },
  { id: "blower", label: "Leaf Blower" },
  { id: "hedge_trimmer", label: "Hedge Trimmer" },
  { id: "chainsaw", label: "Chainsaw" },
];

const availabilityOptions = [
  { id: "weekday_morning", label: "Weekday Mornings" },
  { id: "weekday_afternoon", label: "Weekday Afternoons" },
  { id: "saturday", label: "Saturdays" },
  { id: "sunday", label: "Sundays" },
];

export const QuestionnaireStep = ({ data, onChange, onNext }: QuestionnaireStepProps) => {
  const handleEquipmentTypeChange = (equipmentId: string, checked: boolean) => {
    if (checked) {
      onChange({ ...data, equipmentTypes: [...data.equipmentTypes, equipmentId] });
    } else {
      onChange({ ...data, equipmentTypes: data.equipmentTypes.filter(id => id !== equipmentId) });
    }
  };

  const handleAvailabilityChange = (availId: string, checked: boolean) => {
    if (checked) {
      onChange({ ...data, availability: [...data.availability, availId] });
    } else {
      onChange({ ...data, availability: data.availability.filter(id => id !== availId) });
    }
  };

  const isValid = 
    data.yearsExperience && 
    data.hasOwnTransport && 
    (data.hasOwnTransport === "no" || data.transportType) &&
    data.hasOwnEquipment &&
    data.availability.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Experience & Equipment</CardTitle>
            <CardDescription>
              Tell us about your lawn care experience and capabilities
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Years of Experience */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            How many years of lawn care experience do you have?
          </Label>
          <RadioGroup
            value={data.yearsExperience}
            onValueChange={(value) => onChange({ ...data, yearsExperience: value })}
            className="grid grid-cols-2 gap-3"
          >
            {experienceOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`exp-${option.value}`} />
                <Label htmlFor={`exp-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Transport */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            Do you have your own transport for equipment?
          </Label>
          <RadioGroup
            value={data.hasOwnTransport}
            onValueChange={(value) => onChange({ ...data, hasOwnTransport: value, transportType: "" })}
            className="space-y-2"
          >
            {transportOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`transport-${option.value}`} />
                <Label htmlFor={`transport-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {data.hasOwnTransport === "yes" && (
            <div className="ml-6 pt-3 space-y-2">
              <Label className="text-sm text-muted-foreground">What type of vehicle?</Label>
              <RadioGroup
                value={data.transportType}
                onValueChange={(value) => onChange({ ...data, transportType: value })}
                className="grid grid-cols-2 gap-2"
              >
                {transportTypes.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={type.value} id={`vehicle-${type.value}`} />
                    <Label htmlFor={`vehicle-${type.value}`} className="cursor-pointer text-sm">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </div>

        {/* Equipment */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            Do you have your own lawn care equipment?
          </Label>
          <RadioGroup
            value={data.hasOwnEquipment}
            onValueChange={(value) => onChange({ ...data, hasOwnEquipment: value })}
            className="space-y-2"
          >
            {equipmentOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`equip-${option.value}`} />
                <Label htmlFor={`equip-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {(data.hasOwnEquipment === "yes" || data.hasOwnEquipment === "partial") && (
            <div className="ml-6 pt-3 space-y-2">
              <Label className="text-sm text-muted-foreground">Which equipment do you have?</Label>
              <div className="grid grid-cols-2 gap-2">
                {equipmentTypes.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`equip-type-${type.id}`}
                      checked={data.equipmentTypes.includes(type.id)}
                      onCheckedChange={(checked) => 
                        handleEquipmentTypeChange(type.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={`equip-type-${type.id}`} className="cursor-pointer text-sm">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Availability */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            When are you available to work? (Select all that apply)
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {availabilityOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`avail-${option.id}`}
                  checked={data.availability.includes(option.id)}
                  onCheckedChange={(checked) => 
                    handleAvailabilityChange(option.id, checked as boolean)
                  }
                />
                <Label htmlFor={`avail-${option.id}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-2">
          <Label htmlFor="additionalInfo" className="text-base font-medium">
            Anything else you'd like us to know? (Optional)
          </Label>
          <Textarea
            id="additionalInfo"
            placeholder="Tell us about any relevant qualifications, certifications, or experience..."
            value={data.additionalInfo}
            onChange={(e) => onChange({ ...data, additionalInfo: e.target.value })}
            className="min-h-[100px]"
          />
        </div>

        {/* Next Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={onNext} disabled={!isValid} className="gap-2">
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
