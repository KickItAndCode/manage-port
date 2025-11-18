"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { FormField } from "@/components/ui/form-field";
import { FormGrid } from "@/components/ui/form-grid";
import { SelectNative } from "@/components/ui/select-native";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Home, 
  Users, 
  Zap,
  Edit,
  Plus,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Schemas for each step
const basicInfoSchema = z.object({
  name: z.string().min(2, "Name is required"),
  address: z.string().min(5, "Address is required"),
  type: z.string().min(2, "Type is required"),
  status: z.string().min(2, "Status is required"),
  bedrooms: z.coerce.number().min(0, "Bedrooms required"),
  bathrooms: z.coerce.number().min(0, "Bathrooms required"),
  squareFeet: z.coerce.number().min(0, "Square feet required"),
  purchaseDate: z.string().min(4, "Purchase date required"),
  monthlyMortgage: z.coerce.number().min(0).optional(),
  monthlyCapEx: z.coerce.number().min(0).optional(),
});

const propertyTypeSchema = z.object({
  propertyType: z.enum(["single-family", "multi-family"]),
  unitCount: z.coerce.number().min(1).max(20).optional(),
  units: z.array(z.object({
    identifier: z.string().min(1, "Unit identifier required"),
    displayName: z.string().min(1, "Display name required"),
    customName: z.boolean(),
  })).optional(),
});

const utilitySetupSchema = z.object({
  utilityPreset: z.enum(["owner-pays", "tenant-pays", "custom"]),
  customSplit: z.array(z.object({
    unitId: z.string(),
    unitName: z.string(),
    percentage: z.number().min(0).max(100),
  })).optional(),
});

type BasicInfoForm = z.infer<typeof basicInfoSchema>;
type PropertyTypeForm = z.infer<typeof propertyTypeSchema>;
type UtilitySetupForm = z.infer<typeof utilitySetupSchema>;

export interface PropertyWizardData extends BasicInfoForm, PropertyTypeForm, UtilitySetupForm {}

interface PropertyCreationWizardProps {
  onSubmit: (data: PropertyWizardData) => void;
  onCancel?: () => void;
  loading?: boolean;
  isModal?: boolean;
}

const STEPS = [
  { id: 1, title: "Property Basics", icon: Home },
  { id: 2, title: "Property Type & Units", icon: Users },
  { id: 3, title: "Utility Setup", icon: Zap },
] as const;

const UTILITY_TYPES = ["Electric", "Water", "Gas", "Sewer", "Trash", "Internet"];

export function PropertyCreationWizard({ onSubmit, onCancel, loading, isModal = false }: PropertyCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<Partial<PropertyWizardData>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Forms for each step
  const basicForm = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    mode: "onBlur",
  });

  const typeForm = useForm<PropertyTypeForm>({
    resolver: zodResolver(propertyTypeSchema),
    mode: "onBlur",
    defaultValues: {
      propertyType: "single-family",
      unitCount: 2,
      units: [],
    },
  });

  const utilityForm = useForm<UtilitySetupForm>({
    resolver: zodResolver(utilitySetupSchema),
    mode: "onBlur",
    defaultValues: {
      utilityPreset: "tenant-pays",
    },
  });

  // Watch values
  const propertyType = typeForm.watch("propertyType");
  const unitCount = typeForm.watch("unitCount");
  const units = typeForm.watch("units") || [];
  const utilityPreset = utilityForm.watch("utilityPreset");
  const customSplit = utilityForm.watch("customSplit") || [];

  // Auto-calculate CapEx when mortgage changes
  const monthlyMortgage = basicForm.watch("monthlyMortgage");
  useEffect(() => {
    if (monthlyMortgage && monthlyMortgage > 0) {
      basicForm.setValue("monthlyCapEx", Math.round(monthlyMortgage * 0.1));
    }
  }, [monthlyMortgage, basicForm]);

  // Generate units when count changes
  useEffect(() => {
    if (propertyType === "multi-family" && unitCount && unitCount > 0) {
      const currentUnits = units;
      const newUnits = [];
      
      for (let i = 0; i < unitCount; i++) {
        const existingUnit = currentUnits[i];
        if (existingUnit) {
          newUnits.push(existingUnit);
        } else {
          const identifier = String.fromCharCode(65 + i); // A, B, C, etc.
          newUnits.push({
            identifier,
            displayName: `Unit ${identifier}`,
            customName: false,
          });
        }
      }
      
      typeForm.setValue("units", newUnits);
    } else if (propertyType === "single-family") {
      typeForm.setValue("units", [{
        identifier: "Main",
        displayName: "Main Unit",
        customName: false,
      }]);
    }
  }, [propertyType, unitCount, typeForm]);

  // Generate custom split when preset changes or units change
  useEffect(() => {
    if (units.length > 0) {
      let newCustomSplit;
      
      if (utilityPreset === "owner-pays") {
        newCustomSplit = units.map(unit => ({
          unitId: unit.identifier,
          unitName: unit.displayName,
          percentage: 0,
        }));
      } else if (utilityPreset === "tenant-pays") {
        const equalSplit = Math.round(100 / units.length);
        newCustomSplit = units.map((unit, index) => ({
          unitId: unit.identifier,
          unitName: unit.displayName,
          percentage: index === 0 ? 100 - (equalSplit * (units.length - 1)) : equalSplit, // Ensure total is 100
        }));
      } else {
        // custom - start with equal split
        const equalSplit = Math.round(100 / units.length);
        newCustomSplit = units.map((unit, index) => ({
          unitId: unit.identifier,
          unitName: unit.displayName,
          percentage: index === 0 ? 100 - (equalSplit * (units.length - 1)) : equalSplit, // Ensure total is 100
        }));
      }
      
      utilityForm.setValue("customSplit", newCustomSplit);
    }
  }, [utilityPreset, units, utilityForm]);

  const updateUnitName = (index: number, newName: string) => {
    const currentUnits = [...units];
    currentUnits[index] = {
      ...currentUnits[index],
      displayName: newName,
      customName: newName !== `Unit ${currentUnits[index].identifier}`,
    };
    typeForm.setValue("units", currentUnits);
  };

  const updateUtilityPercentage = (unitIndex: number, percentage: number) => {
    const currentSplit = utilityForm.getValues("customSplit") || [];
    const newSplit = [...currentSplit];
    if (newSplit[unitIndex]) {
      newSplit[unitIndex].percentage = percentage;
      utilityForm.setValue("customSplit", newSplit);
    }
  };

  const validateStep = async (step: number) => {
    switch (step) {
      case 1:
        return await basicForm.trigger();
      case 2:
        return await typeForm.trigger();
      case 3:
        return await utilityForm.trigger();
      default:
        return true;
    }
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < STEPS.length) {
      // Save current step data
      switch (currentStep) {
        case 1:
          setWizardData(prev => ({ ...prev, ...basicForm.getValues() }));
          break;
        case 2:
          setWizardData(prev => ({ ...prev, ...typeForm.getValues() }));
          break;
        case 3:
          setWizardData(prev => ({ ...prev, ...utilityForm.getValues() }));
          break;
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      const finalData = {
        ...wizardData,
        ...basicForm.getValues(),
        ...typeForm.getValues(),
        ...utilityForm.getValues(),
      };
      onSubmit(finalData);
    }
  };

  // Dummy data generators
  const generateBasicDummyData = () => {
    const names = ["Sunset Villa", "Oakwood Apartments", "Riverside Cottage", "Downtown Loft", "Mountain View Townhouse", "Garden Terrace"];
    const addresses = [
      "1234 Oceanview Dr, Malibu, CA 90265",
      "5678 Maple St, Denver, CO 80220", 
      "9101 Riverside Rd, Austin, TX 78701",
      "222 Main St, San Francisco, CA 94105",
      "789 Hilltop Ave, Seattle, WA 98101",
      "456 Garden Ln, Portland, OR 97209"
    ];
    const types = ["Single Family", "Duplex", "Apartment", "Condo", "Townhouse"];
    const statuses = ["Available", "Occupied", "Maintenance"];
    const images = [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1460518451285-97b6aa326961?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=400&q=80"
    ];
    
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomDate = (start: Date, end: Date) => {
      const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      return date.toISOString().split("T")[0];
    };

    const mortgage = randomInt(800, 4000);
    
    basicForm.reset({
      name: names[randomInt(0, names.length - 1)],
      address: addresses[randomInt(0, addresses.length - 1)],
      type: types[randomInt(0, types.length - 1)],
      status: statuses[randomInt(0, statuses.length - 1)],
      bedrooms: randomInt(1, 5),
      bathrooms: randomInt(1, 3),
      squareFeet: randomInt(700, 3500),
      purchaseDate: randomDate(new Date(2015, 0, 1), new Date()),
      monthlyMortgage: mortgage,
      monthlyCapEx: Math.round(mortgage * 0.1),
    });
  };

  const generateTypeDummyData = () => {
    const isMultiFamily = Math.random() > 0.5;
    if (isMultiFamily) {
      const unitCount = randomInt(2, 4);
      typeForm.setValue("propertyType", "multi-family");
      typeForm.setValue("unitCount", unitCount);
      
      // Generate sample unit names
      const sampleNames = [
        ["Upper Unit", "Lower Unit"],
        ["Front Unit", "Back Unit", "Garage Unit"], 
        ["Unit A", "Unit B", "Unit C", "Unit D"],
        ["Main Floor", "Second Floor", "Basement Unit"]
      ];
      const nameSet = sampleNames[randomInt(0, sampleNames.length - 1)];
      
      const units = [];
      for (let i = 0; i < unitCount; i++) {
        const identifier = String.fromCharCode(65 + i);
        units.push({
          identifier,
          displayName: nameSet[i] || `Unit ${identifier}`,
          customName: !!nameSet[i],
        });
      }
      typeForm.setValue("units", units);
    } else {
      typeForm.setValue("propertyType", "single-family");
      typeForm.setValue("units", [{
        identifier: "Main",
        displayName: "Main Unit", 
        customName: false,
      }]);
    }
  };

  const generateUtilityDummyData = () => {
    // Always setup utilities since it's now required
    const presets = ["owner-pays", "tenant-pays", "custom"] as const;
    const preset = presets[randomInt(0, presets.length - 1)];
    utilityForm.setValue("utilityPreset", preset);
    
    // Get units from the form since state might not be updated yet
    const formUnits = typeForm.getValues("units") || [];
    
    // If custom preset, generate custom split data
    if (preset === "custom" && formUnits.length > 0) {
      const customSplit = formUnits.map((unit, index) => {
        // Generate random percentages that sum to 100
        const basePercentage = Math.floor(100 / formUnits.length);
        const remainder = 100 - (basePercentage * formUnits.length);
        return {
          unitId: unit.identifier,
          unitName: unit.displayName,
          percentage: index === 0 ? basePercentage + remainder : basePercentage,
        };
      });
      utilityForm.setValue("customSplit", customSplit);
    }
  };

  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  const fillAllSteps = async () => {
    setIsGenerating(true);
    
    // Add a small delay to show the loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    generateBasicDummyData();
    generateTypeDummyData();
    
    // Small delay to ensure units are populated from generateTypeDummyData
    await new Promise(resolve => setTimeout(resolve, 100));
    
    generateUtilityDummyData();
    
    setIsGenerating(false);
    
    toast.success("✨ All steps filled with sample data!", {
      description: "You can now modify any fields and proceed through the wizard."
    });
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <div className={cn(
      isModal ? "flex flex-col h-full min-h-0 p-6" : "max-w-4xl mx-auto space-y-6"
    )}>
      {/* Progress Header */}
      <Card className={cn(isModal && "flex-shrink-0")}>
        <CardHeader className={cn("pb-4", isModal && "px-4 py-3")}>
          <div className={cn("space-y-4", isModal && "space-y-3")}>
            <div className="flex items-center justify-between">
              <CardTitle className={cn(isModal && "text-lg")}>Create New Property</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fillAllSteps}
                  disabled={isGenerating}
                  className={cn(
                    "gap-2 text-xs transition-all duration-200",
                    isGenerating && "bg-primary/10 border-primary/30"
                  )}
                  title="Fill all wizard steps with realistic sample data for quick testing"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3" />
                      Quick Fill All Steps
                    </>
                  )}
                </Button>
                <Badge variant="outline">
                  Step {currentStep} of {STEPS.length}
                </Badge>
              </div>
            </div>
            
            <Progress value={progressPercentage} className="w-full" />
            
            <div className={cn(
              "flex items-center justify-between",
              isModal && "flex-wrap gap-2"
            )}>
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={cn(
                      "flex items-center justify-center rounded-full border-2 transition-colors",
                      isModal ? "w-6 h-6" : "w-8 h-8",
                      isCompleted 
                        ? "bg-primary border-primary text-primary-foreground"
                        : isActive 
                        ? "border-primary text-primary" 
                        : "border-muted-foreground/30 text-muted-foreground"
                    )}>
                      {isCompleted ? (
                        <Check className={cn("w-4 h-4", isModal && "w-3 h-3")} />
                      ) : (
                        <Icon className={cn("w-4 h-4", isModal && "w-3 h-3")} />
                      )}
                    </div>
                    
                    <div className={cn("ml-2", isModal ? "hidden md:block" : "hidden sm:block")}>
                      <p className={cn(
                        "font-medium",
                        isModal ? "text-xs" : "text-sm",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}>
                        {step.title}
                      </p>
                    </div>
                    
                    {index < STEPS.length - 1 && (
                      <div className={cn(
                        "h-px bg-muted-foreground/30",
                        isModal ? "hidden lg:block w-8 mx-2" : "hidden sm:block w-12 mx-4"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      <Card className={cn(
        "transition-all duration-300",
        isGenerating && "ring-2 ring-primary/30 bg-primary/5",
        isModal ? "flex-1 flex flex-col min-h-0 overflow-hidden mt-4" : ""
      )}>
        <CardContent className={cn(
          "p-6",
          isModal && "overflow-y-auto flex-1 min-h-0 px-4 py-4"
        )}>
          {currentStep === 1 && <BasicInfoStep form={basicForm} isModal={isModal} />}
          {currentStep === 2 && <PropertyTypeStep form={typeForm} units={units} onUpdateUnitName={updateUnitName} isModal={isModal} />}
          {currentStep === 3 && <UtilitySetupStep form={utilityForm} units={units} onUpdatePercentage={updateUtilityPercentage} isModal={isModal} />}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className={cn(
        "flex items-center justify-between",
        isModal && "flex-shrink-0 border-t bg-muted/30 px-4 py-3 -mx-6 -mb-6 mt-4"
      )}>
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={prevStep} size={isModal ? "sm" : "default"}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} size={isModal ? "sm" : "default"}>
              Cancel
            </Button>
          )}
          
          {currentStep < STEPS.length ? (
            <Button onClick={nextStep} size={isModal ? "sm" : "default"}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} size={isModal ? "sm" : "default"}>
              {loading ? "Creating Property..." : "Create Property"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components
function BasicInfoStep({ form, isModal = false }: { form: any; isModal?: boolean }) {
  const { register, formState: { errors } } = form;
  
  const propertyTypes = [
    "Single Family",
    "Duplex", 
    "Apartment",
    "Condo",
    "Townhouse",
    "Other",
  ];
  const statusOptions = ["Available", "Occupied", "Maintenance", "Under Contract"];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Property Information</h3>
        <p className="text-muted-foreground text-sm">
          Enter the basic details about your property
        </p>
      </div>

      <FormGrid cols={isModal ? 2 : 2} gap="lg">
        <FormField
          label="Property Name"
          required
          error={errors.name?.message}
        >
          <Input
            {...register("name")}
            placeholder="Enter property name"
          />
        </FormField>

        <FormField
          label="Property Type"
          required
          error={errors.type?.message}
        >
          <SelectNative {...register("type")}>
            <option value="">Select property type</option>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </SelectNative>
        </FormField>

        <FormField
          label="Address"
          required
          error={errors.address?.message}
          className="md:col-span-2"
        >
          <Input
            {...register("address")}
            placeholder="Enter property address"
          />
        </FormField>

        <FormField
          label="Status"
          required
          error={errors.status?.message}
        >
          <SelectNative {...register("status")}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </SelectNative>
        </FormField>

        <FormField
          label="Purchase Date"
          required
          error={errors.purchaseDate?.message}
        >
          <Input
            type="date"
            {...register("purchaseDate")}
          />
        </FormField>

        <FormField
          label="Bedrooms"
          required
          error={errors.bedrooms?.message}
        >
          <Input
            type="number"
            min={0}
            {...register("bedrooms", { valueAsNumber: true })}
            placeholder="0"
          />
        </FormField>

        <FormField
          label="Bathrooms"
          required
          error={errors.bathrooms?.message}
        >
          <Input
            type="number"
            min={0}
            step="0.5"
            {...register("bathrooms", { valueAsNumber: true })}
            placeholder="0"
          />
        </FormField>

        <FormField
          label="Square Feet"
          required
          error={errors.squareFeet?.message}
        >
          <Input
            type="number"
            min={0}
            {...register("squareFeet", { valueAsNumber: true })}
            placeholder="0"
          />
        </FormField>

        <FormField
          label="Monthly Mortgage ($)"
          error={errors.monthlyMortgage?.message}
        >
          <Input
            type="number"
            min={0}
            {...register("monthlyMortgage", { valueAsNumber: true })}
            placeholder="Optional"
          />
        </FormField>

        <FormField
          label="CapEx Reserve ($)"
          error={errors.monthlyCapEx?.message}
          description="Auto-calculated as 10% of mortgage"
        >
          <Input
            type="number"
            min={0}
            {...register("monthlyCapEx", { valueAsNumber: true })}
            placeholder="Auto-calculated (10% of mortgage)"
          />
        </FormField>
      </FormGrid>
    </div>
  );
}

function PropertyTypeStep({ form, units, onUpdateUnitName, isModal = false }: { 
  form: any; 
  units: any[]; 
  onUpdateUnitName: (index: number, name: string) => void; 
  isModal?: boolean;
}) {
  const { register, watch, setValue } = form;
  const propertyType = watch("propertyType");
  const unitCount = watch("unitCount");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Property Type & Units</h3>
        <p className="text-muted-foreground text-sm">
          Configure how many units this property has
        </p>
      </div>

      {/* Property Type Selection */}
      <div className="space-y-4">
        <label className="block text-sm font-medium">Property Type</label>
        <div className={cn(
          "grid gap-4",
          isModal ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 md:grid-cols-2"
        )}>
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              propertyType === "single-family" ? "ring-2 ring-primary" : ""
            )}
            onClick={() => setValue("propertyType", "single-family")}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  {...register("propertyType")}
                  value="single-family"
                  className="sr-only"
                />
                <Home className="w-8 h-8 text-primary" />
                <div>
                  <h4 className="font-medium">Single-Family</h4>
                  <p className="text-sm text-muted-foreground">
                    House, condo, or single rental unit
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              propertyType === "multi-family" ? "ring-2 ring-primary" : ""
            )}
            onClick={() => setValue("propertyType", "multi-family")}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  {...register("propertyType")}
                  value="multi-family"
                  className="sr-only"
                />
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <h4 className="font-medium">Multi-Unit</h4>
                  <p className="text-sm text-muted-foreground">
                    Duplex, triplex, apartment building
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Unit Configuration */}
      {propertyType === "multi-family" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Number of Units</label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min={2}
                max={20}
                value={unitCount || 2}
                onChange={(e) => setValue("unitCount", parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">units</span>
            </div>
          </div>

          {units.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">Unit Names</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {units.map((unit, index) => (
                  <div key={unit.identifier} className="flex items-center space-x-2">
                    <Badge variant="outline" className="min-w-[60px] justify-center">
                      {unit.identifier}
                    </Badge>
                    <Input
                      value={unit.displayName}
                      onChange={(e) => onUpdateUnitName(index, e.target.value)}
                      placeholder={`Unit ${unit.identifier}`}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Examples: "Garage Unit", "Basement Apartment", "Upper Floor"
              </p>
            </div>
          )}
        </div>
      )}

      {propertyType === "single-family" && (
        <div className="space-y-3">
          <label className="block text-sm font-medium">Unit Configuration</label>
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Badge>Main</Badge>
                <span className="text-sm">This property will have one main unit</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function UtilitySetupStep({ form, units, onUpdatePercentage, isModal = false }: { 
  form: any; 
  units: any[]; 
  onUpdatePercentage: (unitIndex: number, percentage: number) => void; 
  isModal?: boolean;
}) {
  const { register, watch, setValue } = form;
  const utilityPreset = watch("utilityPreset");
  const customSplit = watch("customSplit") || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Utility Setup</h3>
        <p className="text-muted-foreground text-sm">
          Configure how utility bills will be split between units. This setup is required for utility charge calculations.
        </p>
      </div>

      {/* Always show utility setup - no toggle */}
      <div className="space-y-6">
        {/* Quick Presets */}
        <div className="space-y-3">
          <label className="block text-sm font-medium">Quick Setup</label>
          <div className={cn(
            "grid gap-3",
            isModal ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 md:grid-cols-3"
          )}>
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                utilityPreset === "owner-pays" ? "ring-2 ring-primary" : ""
              )}
              onClick={() => setValue("utilityPreset", "owner-pays")}
            >
              <CardContent className="p-4 text-center">
                <input
                  type="radio"
                  {...register("utilityPreset")}
                  value="owner-pays"
                  className="sr-only"
                />
                <h4 className="font-medium">Owner Pays All</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  You pay all utilities
                </p>
              </CardContent>
            </Card>

            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                utilityPreset === "tenant-pays" ? "ring-2 ring-primary" : ""
              )}
              onClick={() => setValue("utilityPreset", "tenant-pays")}
            >
              <CardContent className="p-4 text-center">
                <input
                  type="radio"
                  {...register("utilityPreset")}
                  value="tenant-pays"
                  className="sr-only"
                />
                <h4 className="font-medium">Tenants Pay All</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Split equally among units
                </p>
              </CardContent>
            </Card>

            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                utilityPreset === "custom" ? "ring-2 ring-primary" : ""
              )}
              onClick={() => setValue("utilityPreset", "custom")}
            >
              <CardContent className="p-4 text-center">
                <input
                  type="radio"
                  {...register("utilityPreset")}
                  value="custom"
                  className="sr-only"
                />
                <h4 className="font-medium">Custom Split</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Set custom percentages
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Custom Split Configuration */}
        {utilityPreset === "custom" && customSplit.length > 0 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium">Custom Split Configuration</label>
            <p className="text-sm text-muted-foreground mb-4">
              This split will apply to all utility types (Electric, Water, Gas, etc.)
            </p>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {customSplit.map((unitSplit: any, unitIndex: number) => {
                    const unit = units.find(u => u.identifier === unitSplit.unitId);
                    return (
                      <div key={unitSplit.unitId} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">
                            {unit?.displayName || unitSplit.unitName}
                          </label>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium min-w-[40px] text-right">
                              {unitSplit.percentage}%
                            </span>
                          </div>
                        </div>
                        <Slider
                          value={[unitSplit.percentage]}
                          onValueChange={(value) => onUpdatePercentage(unitIndex, value[0])}
                          max={100}
                          min={0}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    );
                  })}
                </div>
                
                {/* Total Check */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Split:</span>
                    <span className={cn(
                      "text-lg font-bold",
                      customSplit.reduce((sum: number, split: any) => sum + split.percentage, 0) === 100
                        ? "text-green-600"
                        : "text-red-600"
                    )}>
                      {customSplit.reduce((sum: number, split: any) => sum + split.percentage, 0)}%
                    </span>
                  </div>
                  {customSplit.reduce((sum: number, split: any) => sum + split.percentage, 0) !== 100 && (
                    <p className="text-xs text-red-600 mt-1">
                      Total must equal 100% for all utilities
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preview */}
        {utilityPreset && utilityPreset !== "custom" && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <h5 className="font-medium mb-2">Preview</h5>
              <div className="text-sm space-y-1">
                {utilityPreset === "owner-pays" && (
                  <p>You will pay 100% of all utility bills for this property.</p>
                )}
                {utilityPreset === "tenant-pays" && units.length > 0 && (
                  <p>
                    Each tenant will pay {Math.round(100 / units.length)}% of utility bills 
                    ({units.map(u => u.displayName).join(", ")}).
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}