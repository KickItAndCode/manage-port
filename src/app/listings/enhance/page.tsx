"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sparkles, 
  Copy, 
  RefreshCw, 
  Check, 
  ChevronRight,
  Wand2,
  Home,
  MapPin,
  Bed,
  Bath,
  Square,
  DollarSign,
  AlertCircle,
  Loader2,
  Star,
  Zap,
  Building,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock property data for demo
const mockProperty = {
  address: "123 Main Street, San Francisco, CA 94105",
  type: "Apartment",
  bedrooms: 2,
  bathrooms: 2,
  squareFeet: 1200,
  rentPrice: 3500,
  amenities: ["In-unit Washer/Dryer", "Parking", "Gym", "Pool", "Pet Friendly"]
};

// Mock AI variations for demo
const mockVariations = [
  {
    id: 1,
    style: "Professional",
    icon: Building,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    content: `Exceptional 2-bedroom, 2-bathroom apartment in the heart of San Francisco. This beautifully appointed 1,200 sq ft residence offers modern living at its finest. 

Features include in-unit washer/dryer, dedicated parking, and access to premium building amenities including a fully-equipped fitness center and sparkling pool. 

Located at 123 Main Street, you'll enjoy unparalleled convenience with world-class dining, shopping, and entertainment just steps away. Pet-friendly community welcomes your furry companions.

Monthly rent: $3,500. Available immediately. Schedule your viewing today and experience luxury urban living.`
  },
  {
    id: 2,
    style: "Casual",
    icon: Home,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    content: `Amazing 2BR/2BA apartment that truly feels like home! 

This spacious 1,200 sq ft gem comes with everything you need - your own washer/dryer (no more laundromat trips!), a parking spot (huge win in SF!), plus access to a great gym and pool.

We're pet-friendly because we know your furry friends are family too! Located right on Main Street, you're walking distance to the best coffee shops, restaurants, and nightlife SF has to offer.

$3,500/month - come check it out and fall in love with your new home!`
  },
  {
    id: 3,
    style: "Luxury",
    icon: Star,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    content: `Sophisticated urban sanctuary awaits the discerning resident. This meticulously designed 2-bedroom, 2-bathroom residence spans 1,200 square feet of refined living space.

Premium appointments include private in-residence laundry facilities, secured parking, and exclusive access to resort-style amenities. The state-of-the-art fitness center and pristine pool deck provide an elevated lifestyle experience.

Nestled in San Francisco's prestigious Main Street corridor, residents enjoy immediate proximity to Michelin-starred dining, luxury boutiques, and cultural landmarks. This pet-friendly residence welcomes companions of distinction.

Offered at $3,500 per month. Private viewings available by appointment.`
  }
];

export default function AIListingEnhancePage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVariations, setGeneratedVariations] = useState<typeof mockVariations | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<number>(1);
  const [editedContent, setEditedContent] = useState<Record<number, string>>({});

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setGeneratedVariations(mockVariations);
    setIsGenerating(false);
  };

  const handleCopy = async (content: string, id: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = async (id: number) => {
    setIsGenerating(true);
    // Simulate regeneration
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsGenerating(false);
  };

  const getEditedContent = (id: number, originalContent: string) => {
    return editedContent[id] || originalContent;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Button
          variant="ghost"
          onClick={() => router.push("/listings")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Listings
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                <Wand2 className="w-6 h-6" />
              </div>
              AI Listing Enhancement
            </h1>
            <p className="text-muted-foreground mt-2">
              Transform your property details into compelling rental listings
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Badge variant="secondary" className="px-3 py-1">
              <Zap className="w-3 h-3 mr-1" />
              10 second generation
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <Star className="w-3 h-3 mr-1" />
              3 style variations
            </Badge>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
              <CardDescription>
                Enter your property details and let AI create professional listing copy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Property Preview */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Property Overview
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{mockProperty.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span>{mockProperty.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed className="w-4 h-4 text-muted-foreground" />
                    <span>{mockProperty.bedrooms} Bedrooms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="w-4 h-4 text-muted-foreground" />
                    <span>{mockProperty.bathrooms} Bathrooms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Square className="w-4 h-4 text-muted-foreground" />
                    <span>{mockProperty.squareFeet} sq ft</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>${mockProperty.rentPrice}/month</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Amenities:</p>
                  <div className="flex flex-wrap gap-2">
                    {mockProperty.amenities.map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description Input */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Additional Details <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Add any unique features, neighborhood highlights, or special details about your property..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[150px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Include nearby attractions, recent upgrades, or unique selling points
                </p>
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating AI Descriptions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI-Enhanced Listings
                  </>
                )}
              </Button>

              {isGenerating && (
                <div className="space-y-2">
                  <Progress value={66} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    Creating compelling descriptions...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Output Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {!generatedVariations ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Wand2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Ready to Create</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Enter your property details and click generate to see AI-enhanced listing descriptions
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Generated Listings</CardTitle>
                <CardDescription>
                  Choose the style that best matches your brand
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedVariation.toString()} onValueChange={(v) => setSelectedVariation(parseInt(v))}>
                  <TabsList className="grid w-full grid-cols-3">
                    {generatedVariations.map((variation) => (
                      <TabsTrigger 
                        key={variation.id} 
                        value={variation.id.toString()}
                        className="flex items-center gap-2"
                      >
                        <variation.icon className="w-4 h-4" />
                        {variation.style}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <AnimatePresence mode="wait">
                    {generatedVariations.map((variation) => (
                      <TabsContent 
                        key={variation.id} 
                        value={variation.id.toString()}
                        className="mt-6 space-y-4"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className={cn("p-4 rounded-lg", variation.bgColor)}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <variation.icon className={cn("w-5 h-5", variation.color)} />
                                <span className="font-semibold">{variation.style} Style</span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRegenerate(variation.id)}
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCopy(getEditedContent(variation.id, variation.content), variation.id)}
                                >
                                  {copiedId === variation.id ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            <Textarea
                              value={getEditedContent(variation.id, variation.content)}
                              onChange={(e) => setEditedContent({
                                ...editedContent,
                                [variation.id]: e.target.value
                              })}
                              className="min-h-[300px] bg-background/50 border-0 resize-none"
                            />

                            <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                              <span>{getEditedContent(variation.id, variation.content).split(' ').length} words</span>
                              <span>{getEditedContent(variation.id, variation.content).length} characters</span>
                            </div>
                          </div>

                          <Alert className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              This listing follows fair housing guidelines and is ready to publish on Zillow, Apartments.com, and other platforms.
                            </AlertDescription>
                          </Alert>

                          <div className="flex gap-3 mt-4">
                            <Button className="flex-1">
                              <ChevronRight className="w-4 h-4 mr-2" />
                              Use This Listing
                            </Button>
                            <Button variant="outline">
                              Preview on Platforms
                            </Button>
                          </div>
                        </motion.div>
                      </TabsContent>
                    ))}
                  </AnimatePresence>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}