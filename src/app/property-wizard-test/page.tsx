"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";
import { PropertyCreationWizard, type PropertyWizardData } from "@/components/PropertyCreationWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench } from "lucide-react";
import { formatErrorForToast } from "@/lib/error-handling";
import Link from "next/link";

export default function PropertyWizardTestPage() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const createPropertyWithUnits = useMutation(api.properties.createPropertyWithUnits);

  const handleSubmit = async (data: PropertyWizardData) => {
    if (!user) {
      toast.error("You must be signed in to create a property");
      return;
    }

    setLoading(true);
    try {
      console.log("Submitting wizard data:", data);
      
      const result = await createPropertyWithUnits({
        // Basic property info
        userId: user.id,
        name: data.name,
        address: data.address,
        type: data.type,
        status: data.status,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFeet: data.squareFeet,
        purchaseDate: data.purchaseDate,
        monthlyMortgage: data.monthlyMortgage,
        monthlyCapEx: data.monthlyCapEx,
        
        // Property type and units
        propertyType: data.propertyType,
        units: data.units,
        
        // Utility setup
        setupUtilities: data.setupUtilities,
        utilityPreset: data.utilityPreset,
        customSplit: data.customSplit,
      });

      toast.success(result.message);
      
      // Navigate to the new property
      router.push(`/properties/${result.propertyId}`);
    } catch (error) {
      console.error("Error creating property:", error);
      toast.error(formatErrorForToast(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/properties");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          Sign in to create a property.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/properties" 
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wrench className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Enhanced Property Creation</h1>
              <p className="text-muted-foreground">
                New wizard with integrated unit setup and utility configuration
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              BETA
            </Badge>
          </div>
        </div>

        {/* Info Card */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Utility Split System - Enhanced Creation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>This wizard demonstrates the new property creation flow with:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>✅ Integrated unit setup for multi-unit properties</li>
                <li>✅ Utility responsibility configuration</li>
                <li>✅ Smart presets (Owner Pays All, Tenants Pay All, Custom)</li>
                <li>✅ Auto-generated units with custom naming</li>
                <li>✅ Complete database integration</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Wizard */}
        <PropertyCreationWizard
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </div>
  );
}