"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface WheelWizardStepProps {
  title: string;
  description?: string;
  children: ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  isNextEnabled?: boolean;
  nextButtonText?: string;
  previousButtonText?: string;
  showNavigation?: boolean;
}

export function WheelWizardStep({
  title,
  description,
  children,
  onNext,
  onPrevious,
  isNextEnabled = true,
  nextButtonText = "Next",
  previousButtonText = "Previous",
  showNavigation = true
}: WheelWizardStepProps) {
  return (
    <div className="space-y-6">
      {/* Step Header */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          {description && (
            <CardDescription className="text-lg">{description}</CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Step Content */}
      <div>{children}</div>

      {/* Navigation */}
      {showNavigation && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                {onPrevious && (
                  <Button
                    variant="outline"
                    onClick={onPrevious}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {previousButtonText}
                  </Button>
                )}
              </div>
              <div>
                {onNext && (
                  <Button
                    onClick={onNext}
                    disabled={!isNextEnabled}
                    className="flex items-center gap-2"
                  >
                    {nextButtonText}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}