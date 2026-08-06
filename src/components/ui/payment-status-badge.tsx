import { AlertCircle, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BillPaymentFields,
  getPaymentStatus,
  PaymentStatus,
} from "@/utils/utilityBillHelpers";

export { describeDueDate } from "@/utils/utilityBillHelpers";

/**
 * The payment state of a bill, as one badge.
 *
 * The bills table used to render this as a binary paid/unpaid, which meant a
 * bill eight months past due was indistinguishable from one due next week —
 * the two states a landlord most needs to tell apart. `getPaymentStatus`
 * already drew that distinction and nothing used it.
 */

const STYLES: Record<PaymentStatus, { icon: typeof CheckCircle; className: string }> = {
  paid: {
    icon: CheckCircle,
    className:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900",
  },
  overdue: {
    icon: AlertCircle,
    className:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  },
  due_soon: {
    icon: AlertTriangle,
    className:
      "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  },
  current: {
    icon: Clock,
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

export function PaymentStatusBadge({
  bill,
  className,
}: {
  bill: BillPaymentFields;
  className?: string;
}) {
  const { status, label } = getPaymentStatus(bill);
  const { icon: Icon, className: statusClass } = STYLES[status];

  return (
    <Badge className={cn("text-xs", statusClass, className)}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}
