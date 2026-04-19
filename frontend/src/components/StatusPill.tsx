import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: string;
  variant?: "payment" | "session";
}

export function StatusPill({ status, variant = "payment" }: StatusPillProps) {
  const s = status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        (s === "pending" || s === "scheduled") &&
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
        (s === "confirmed" || s === "accepted") &&
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
        s === "completed" &&
          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
        s === "cancelled" &&
          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
        !["pending", "scheduled", "confirmed", "accepted", "completed", "cancelled"].includes(
          s,
        ) && "bg-muted text-muted-foreground",
      )}
      title={variant === "payment" ? "Payment status" : "Session status"}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
