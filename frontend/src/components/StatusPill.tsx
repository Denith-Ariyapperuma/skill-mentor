import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

export function StatusPill({ status }: { status: string }) {
  const key = status?.toLowerCase() ?? "pending";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize",
        styles[key] ?? "bg-muted text-muted-foreground",
      )}
    >
      {key}
    </span>
  );
}
