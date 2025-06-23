"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles,
  Copy,
  RefreshCw,
  Edit3,
  Download,
  Share2,
  Wand2,
  CheckCircle,
  Clock,
  ExternalLink,
  Building2,
  Target,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Mock AI service for demo purposes
const mockAIEnhancement = async (description: string, style: string = "professional") => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
  
  const enhancements: Record<string, string> = {
    professional: `Welcome to this stunning rental property that perfectly combines comfort and convenience! This thoughtfully designed home features spacious living areas with abundant natural light, creating an inviting atmosphere for both relaxation and entertaining. The modern kitchen boasts premium finishes and ample storage, making meal preparation a pleasure. Each bedroom offers generous space and comfort, while the updated bathrooms provide a spa-like experience. Located in a desirable neighborhood with easy access to shopping, dining, and transportation, this property offers the ideal blend of tranquility and urban convenience. Don't miss this exceptional opportunity to call this beautiful space home!`,
    
    casual: `You're going to love this place! This awesome rental has everything you need and more. The living spaces are super roomy and bright - perfect for hanging out or having friends over. The kitchen is totally modern with great storage (no more cramped cooking!). The bedrooms are spacious and comfy, and the bathrooms feel like your own personal spa. Plus, you'll be right in the heart of everything - shops, restaurants, and easy commutes are all nearby. This is seriously a great find that won't last long!`,
    
    luxury: `Discover unparalleled elegance in this exquisite rental residence, where sophisticated design meets contemporary luxury. This meticulously crafted home showcases expansive living spaces bathed in natural light, featuring premium architectural details and designer finishes throughout. The gourmet kitchen represents culinary excellence with state-of-the-art appliances and custom cabinetry. The master suite and additional bedrooms provide serene retreats with luxury appointments, while the spa-inspired bathrooms offer resort-quality amenities. Situated in a prestigious location with proximity to premier shopping, fine dining, and cultural attractions, this exceptional property delivers an uncompromising lifestyle of refinement and convenience.`
  };
  
  return enhancements[style] || enhancements.professional;
};

export default function ListingEnhancementPage() {
  const { user } = useUser();
  const [description, setDescription] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [enhancedVersions, setEnhancedVersions] = useState<Array<{
    id: string;
    style: string;
    content: string;
    timestamp: Date;
  }>>([]);
  const [activeVersion, setActiveVersion] = useState<string | null>(null);

  // Get user properties for context
  const properties = useQuery(api.properties.getProperties, 
    user ? { userId: user.id } : "skip"
  );

  const styles = [
    { 
      id: "professional", 
      name: "Professional", 
      description: "Polished, business-focused tone",
      icon: Target,
      color: "bg-blue-100 text-blue-800 border-blue-200"
    },
    { 
      id: "casual", 
      name: "Friendly", 
      description: "Conversational, approachable tone",
      icon: Edit3,
      color: "bg-green-100 text-green-800 border-green-200"
    },
    { 
      id: "luxury", 
      name: "Luxury", 
      description: "Sophisticated, premium tone",
      icon: Sparkles,
      color: "bg-purple-100 text-purple-800 border-purple-200"
    }
  ];

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Please enter a property description first");
      return;
    }

    setIsGenerating(true);
    
    try {
      const enhanced = await mockAIEnhancement(description, selectedStyle);
      const newVersion = {
        id: Date.now().toString(),
        style: selectedStyle,
        content: enhanced,
        timestamp: new Date()
      };
      
      setEnhancedVersions(prev => [newVersion, ...prev]);
      setActiveVersion(newVersion.id);
      toast.success("✨ Listing enhanced successfully!");
    } catch (error) {
      toast.error("Failed to enhance listing. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  const handleRegenerate = async (versionId: string) => {
    const version = enhancedVersions.find(v => v.id === versionId);
    if (!version) return;

    setIsGenerating(true);
    
    try {
      const enhanced = await mockAIEnhancement(description, version.style);
      const updatedVersion = {
        ...version,
        content: enhanced,
        timestamp: new Date()
      };
      
      setEnhancedVersions(prev => 
        prev.map(v => v.id === versionId ? updatedVersion : v)
      );
      toast.success("Listing regenerated successfully!");
    } catch (error) {
      toast.error("Failed to regenerate listing. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getStyleInfo = (styleId: string) => {
    return styles.find(s => s.id === styleId) || styles[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl">
              <Wand2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI Listing Enhancement
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your basic property descriptions into compelling, professional listings that attract quality tenants
          </p>
          
          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>40-60% Higher Inquiry Rates</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>2-5 Minute Setup</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-500" />
              <span>Professional Quality</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Panel - Input Form */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Edit3 className="h-5 w-5 text-blue-500" />
                  Property Description Input
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enter your basic property details and let AI create compelling listing copy
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Property Context */}
                {properties && properties.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Your Properties (Optional Context)
                    </Label>
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                      {properties.slice(0, 3).map((property) => (
                        <div key={property._id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                          <div>
                            <span className="font-medium">{property.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {property.bedrooms}BR, {property.bathrooms}BA
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              const contextDescription = `${property.name} - ${property.address}. ${property.bedrooms} bedrooms, ${property.bathrooms} bathrooms. ${property.squareFeet ? `${property.squareFeet} square feet.` : ''} ${property.monthlyRent ? `Monthly rent: $${property.monthlyRent}.` : ''}`;
                              setDescription(contextDescription);
                            }}
                          >
                            Use
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description Input */}
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Property Description *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your property... Include details like:&#10;• Number of bedrooms and bathrooms&#10;• Key amenities (parking, laundry, etc.)&#10;• Location highlights&#10;• Rental price and terms&#10;• Special features or recent updates&#10;&#10;Example: '2 bedroom apartment, downtown location, updated kitchen, parking included, $1200/month, available immediately'"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    className="resize-none text-sm"
                    data-testid="property-description-input"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{description.length} characters</span>
                    <span>Recommended: 100-500 characters</span>
                  </div>
                </div>

                {/* Style Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Writing Style</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {styles.map((style) => {
                      const IconComponent = style.icon;
                      return (
                        <motion.div
                          key={style.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <button
                            onClick={() => setSelectedStyle(style.id)}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                              selectedStyle === style.id
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border bg-background hover:border-primary/50"
                            }`}
                            data-testid={`style-${style.id}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${style.color}`}>
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">{style.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {style.description}
                                </div>
                              </div>
                              {selectedStyle === style.id && (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={!description.trim() || isGenerating}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
                  data-testid="generate-listing-button"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Enhance Listing
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Panel - Generated Content */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 space-y-6"
          >
            {enhancedVersions.length === 0 ? (
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                <CardContent className="p-12 text-center">
                  <div className="space-y-6">
                    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center">
                      <Wand2 className="h-12 w-12 text-purple-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">Ready to Transform Your Listing?</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Enter your property description on the left and watch AI create professional, 
                        compelling listing copy that attracts better tenants.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mx-auto">
                          <Edit3 className="h-4 w-4" />
                        </div>
                        <div className="font-medium">Input Details</div>
                        <div className="text-muted-foreground">Add your basic property information</div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mx-auto">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="font-medium">AI Enhancement</div>
                        <div className="text-muted-foreground">Choose your preferred writing style</div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mx-auto">
                          <ExternalLink className="h-4 w-4" />
                        </div>
                        <div className="font-medium">Publish Everywhere</div>
                        <div className="text-muted-foreground">Use on Zillow, Apartments.com, etc.</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Enhanced Listings</h2>
                  <Badge variant="secondary" className="px-3 py-1">
                    {enhancedVersions.length} version{enhancedVersions.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <AnimatePresence>
                  {enhancedVersions.map((version, index) => {
                    const styleInfo = getStyleInfo(version.style);
                    const IconComponent = styleInfo.icon;
                    
                    return (
                      <motion.div
                        key={version.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${styleInfo.color}`}>
                                  <IconComponent className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="font-semibold">{styleInfo.name} Style</div>
                                  <div className="text-sm text-muted-foreground">
                                    Generated {version.timestamp.toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRegenerate(version.id)}
                                  disabled={isGenerating}
                                  data-testid="regenerate-button"
                                >
                                  <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(version.content)}
                                  data-testid="copy-button"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="prose prose-sm max-w-none">
                              <div className="p-4 bg-muted/50 rounded-lg text-sm leading-relaxed">
                                {version.content}
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center gap-4">
                                <span>{version.content.length} characters</span>
                                <span>{version.content.split(' ').length} words</span>
                              </div>
                              
                              {/* Publishing Options */}
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleCopy(version.content)}
                                  className="text-xs"
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-xs"
                                >
                                  <Share2 className="h-3 w-3 mr-1" />
                                  Share
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-xs"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Export
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Platform Integration CTA */}
                <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardContent className="p-6 text-center">
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-2">
                        <ExternalLink className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Ready to Publish?</h3>
                      </div>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Take your enhanced listing and publish it to top rental platforms like Zillow, 
                        Apartments.com, and more for maximum exposure.
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <Button variant="outline" size="sm">
                          <Building2 className="h-4 w-4 mr-2" />
                          Go to Listings
                        </Button>
                        <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Publish to Platforms
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}