"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OutstandingBalances } from "@/components/OutstandingBalances";
import { PaymentHistory } from "@/components/PaymentHistory";
import { 
  Receipt, 
  Clock
} from "lucide-react";

export default function PaymentsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("outstanding");

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          Sign in to manage payments.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground mt-1">
            Track utility payments and outstanding balances
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="outstanding" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Outstanding
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="outstanding" className="space-y-6">
            <OutstandingBalances userId={user.id} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <PaymentHistory userId={user.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}