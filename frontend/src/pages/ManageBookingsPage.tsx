import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  adminCompleteSession,
  adminConfirmPayment,
  adminSetMeetingLink,
  getAdminSessionPaymentSlip,
  getAdminSessions,
} from "@/lib/api";
import type { AdminSessionRow } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 10;

type AdminBookingSort =
  | "session_asc"
  | "session_desc"
  | "student_az"
  | "mentor_az"
  | "subject_az"
  | "id_asc"
  | "id_desc";

export default function ManageBookingsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<AdminSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<AdminBookingSort>("session_desc");
  const [linkDialog, setLinkDialog] = useState<AdminSessionRow | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [slipViewerOpen, setSlipViewerOpen] = useState(false);
  const [slipViewerSessionId, setSlipViewerSessionId] = useState<number | null>(
    null,
  );
  const [slipViewerUrl, setSlipViewerUrl] = useState<string | null>(null);
  const [slipViewerLoading, setSlipViewerLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Sign in required");
      const data = await getAdminSessions(token);
      setRows(data);
      setPage(0);
    } catch (e) {
      toast({
        title: "Could not load sessions",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = globalFilter.trim().toLowerCase();
    return rows.filter((r) => {
      const pay = (r.paymentStatus ?? "").toLowerCase();
      const sess = (r.sessionStatus ?? "").toLowerCase();
      if (sessionFilter === "pending" && pay !== "pending") return false;
      if (sessionFilter === "confirmed" && pay !== "confirmed") return false;
      if (sessionFilter === "completed" && sess !== "completed") return false;
      if (fromDate && new Date(r.sessionAt) < new Date(`${fromDate}T00:00:00`))
        return false;
      if (toDate && new Date(r.sessionAt) > new Date(`${toDate}T23:59:59`))
        return false;
      if (!q) return true;
      return (
        r.studentName.toLowerCase().includes(q) ||
        r.mentorName.toLowerCase().includes(q) ||
        r.subjectName.toLowerCase().includes(q) ||
        String(r.id).includes(q) ||
        pay.includes(q) ||
        sess.includes(q)
      );
    });
  }, [rows, globalFilter, sessionFilter, fromDate, toDate]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const sessionTime = (r: AdminSessionRow): number =>
      new Date(r.sessionAt).getTime();

    switch (sortBy) {
      case "session_asc":
        list.sort((a, b) => {
          const ta = sessionTime(a);
          const tb = sessionTime(b);
          const aNa = Number.isNaN(ta);
          const bNa = Number.isNaN(tb);
          if (aNa && bNa) return a.id - b.id;
          if (aNa) return 1;
          if (bNa) return -1;
          return ta - tb || a.id - b.id;
        });
        break;
      case "session_desc":
        list.sort((a, b) => {
          const ta = sessionTime(a);
          const tb = sessionTime(b);
          const aNa = Number.isNaN(ta);
          const bNa = Number.isNaN(tb);
          if (aNa && bNa) return b.id - a.id;
          if (aNa) return 1;
          if (bNa) return -1;
          return tb - ta || b.id - a.id;
        });
        break;
      case "student_az":
        list.sort(
          (a, b) =>
            a.studentName.localeCompare(b.studentName, undefined, {
              sensitivity: "base",
            }) || a.id - b.id,
        );
        break;
      case "mentor_az":
        list.sort(
          (a, b) =>
            a.mentorName.localeCompare(b.mentorName, undefined, {
              sensitivity: "base",
            }) || a.id - b.id,
        );
        break;
      case "subject_az":
        list.sort(
          (a, b) =>
            a.subjectName.localeCompare(b.subjectName, undefined, {
              sensitivity: "base",
            }) || a.id - b.id,
        );
        break;
      case "id_asc":
        list.sort((a, b) => a.id - b.id);
        break;
      case "id_desc":
        list.sort((a, b) => b.id - a.id);
        break;
      default:
        break;
    }
    return list;
  }, [filtered, sortBy]);

  const openPaymentSlip = async (sessionId: number): Promise<void> => {
    setSlipViewerOpen(true);
    setSlipViewerSessionId(sessionId);
    setSlipViewerUrl(null);
    setSlipViewerLoading(true);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Sign in required");
      const { paymentSlipDataUrl } =
        await getAdminSessionPaymentSlip(token, sessionId);
      setSlipViewerUrl(paymentSlipDataUrl ?? null);
    } catch (e) {
      toast({
        title: "Could not load slip",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
      setSlipViewerOpen(false);
      setSlipViewerSessionId(null);
    } finally {
      setSlipViewerLoading(false);
    }
  };

  const closePaymentSlip = (): void => {
    setSlipViewerOpen(false);
    setSlipViewerSessionId(null);
    setSlipViewerUrl(null);
    setSlipViewerLoading(false);
  };

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage bookings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Confirm payments, complete sessions, and add meeting links.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 flex-wrap">
        <Input
          placeholder="Search student, mentor, subject, payment/session status, ID…"
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            setPage(0);
          }}
          className="max-w-xs"
        />
        <Select
          value={sessionFilter}
          onValueChange={(v) => {
            setSessionFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Payment pending</SelectItem>
            <SelectItem value="confirmed">Payment confirmed</SelectItem>
            <SelectItem value="completed">Session completed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(v) => {
            setSortBy(v as AdminBookingSort);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="session_desc">Session date (newest)</SelectItem>
            <SelectItem value="session_asc">Session date (oldest)</SelectItem>
            <SelectItem value="student_az">Student (A–Z)</SelectItem>
            <SelectItem value="mentor_az">Mentor (A–Z)</SelectItem>
            <SelectItem value="subject_az">Subject (A–Z)</SelectItem>
            <SelectItem value="id_desc">Session ID (high → low)</SelectItem>
            <SelectItem value="id_asc">Session ID (low → high)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 items-center">
          <Label className="text-xs whitespace-nowrap">From</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(0);
            }}
            className="w-[160px]"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Label className="text-xs whitespace-nowrap">To</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(0);
            }}
            className="w-[160px]"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session ID</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Mentor</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Date / time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Slip</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10">
                  No sessions match your filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>{r.mentorName}</TableCell>
                  <TableCell>{r.subjectName}</TableCell>
                  <TableCell>
                    {format(new Date(r.sessionAt), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>{r.durationMinutes}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.paymentStatus}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.hasPaymentSlip ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openPaymentSlip(r.id)}
                      >
                        View slip
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.sessionStatus}</Badge>
                  </TableCell>
                  <TableCell>
                    <RowActions
                      row={r}
                      onDone={load}
                      onMeetingLink={() => {
                        setLinkDialog(r);
                        setLinkUrl(r.meetingLink ?? "");
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Page {page + 1} of {pageCount} ({sorted.length} sessions)
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog
        open={slipViewerOpen}
        onOpenChange={(open) => {
          if (!open) closePaymentSlip();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Payment slip
              {slipViewerSessionId != null
                ? ` (session #${slipViewerSessionId})`
                : ""}
            </DialogTitle>
          </DialogHeader>
          {slipViewerLoading && <Skeleton className="h-64 w-full" />}
          {!slipViewerLoading && slipViewerUrl ? (
            <img
              src={slipViewerUrl}
              alt="Student payment slip"
              className="max-h-[70vh] w-auto max-w-full mx-auto rounded-md border object-contain"
            />
          ) : null}
          {!slipViewerLoading && !slipViewerUrl && slipViewerOpen ? (
            <p className="text-sm text-muted-foreground">No image available.</p>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!linkDialog} onOpenChange={() => setLinkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meeting link</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="https://…"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!linkDialog) return;
                try {
                  const token = await getToken({ template: "skillmentor-auth" });
                  if (!token) throw new Error("Auth required");
                  await adminSetMeetingLink(token, linkDialog.id, linkUrl);
                  toast({ title: "Meeting link saved" });
                  setLinkDialog(null);
                  load();
                } catch (e) {
                  toast({
                    title: "Failed",
                    description: e instanceof Error ? e.message : undefined,
                    variant: "destructive",
                  });
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RowActions({
  row,
  onDone,
  onMeetingLink,
}: {
  row: AdminSessionRow;
  onDone: () => void;
  onMeetingLink: () => void;
}) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const pay = (row.paymentStatus ?? "").toLowerCase();
  const sess = (row.sessionStatus ?? "").toLowerCase();

  const run = async (fn: (token: string) => Promise<void>) => {
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Auth required");
      await fn(token);
      toast({ title: "Updated" });
      onDone();
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {pay === "pending" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => run((t) => adminConfirmPayment(t, row.id))}
        >
          Confirm payment
        </Button>
      )}
      {pay === "confirmed" && sess !== "completed" && (
        <Button
          size="sm"
          onClick={() => run((t) => adminCompleteSession(t, row.id))}
        >
          Mark complete
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={onMeetingLink}>
        Meeting link
      </Button>
    </div>
  );
}
