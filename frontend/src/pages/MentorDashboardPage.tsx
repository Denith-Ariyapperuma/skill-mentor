import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router";
import {
  getMentorPortalContext,
  getMentorPortalSessions,
  mentorAddSessionResource,
  mentorDeleteSessionResource,
  mentorMarkSessionComplete,
  FILE_RESOURCE_MAX_BYTES,
  SESSION_RESOURCE_LINK_URL_MAX_CHARS,
  SESSION_RESOURCE_TITLE_MAX_CHARS,
  SESSION_RESOURCE_FILENAME_MAX_CHARS,
} from "@/lib/api";
import type { MentorPortalContext, MentorPortalSessionRow, SessionResourceItem } from "@/types";
import {
  RESOURCE_CARD_MENTOR_SHARED_FILENAME_MAX,
  RESOURCE_CARD_MENTOR_SHARED_LINK_MAX,
  RESOURCE_CARD_MENTOR_SHARED_TITLE_MAX,
  truncateDisplayEnd,
  truncateDisplayMiddle,
} from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { addMinutes, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Copy, RefreshCw, Trash2, Upload } from "lucide-react";
import { Link } from "react-router";

const PAGE_SIZE = 12;
const RESOURCE_FILE_MAX_MB = Math.round(FILE_RESOURCE_MAX_BYTES / (1024 * 1024));

function sessionEndMs(row: MentorPortalSessionRow): number {
  const minutes = row.durationMinutes ?? 60;
  return new Date(row.sessionAt).getTime() + minutes * 60_000;
}

/** UI + server alignment: mentor may mark done only after interval end. */
function canMarkSessionDone(
  row: MentorPortalSessionRow,
  nowMs: number,
): boolean {
  if ((row.sessionStatus ?? "").toLowerCase() === "completed") return false;
  return nowMs >= sessionEndMs(row);
}

function portalSessionTimes(
  row: MentorPortalSessionRow,
): { startMs: number; endMs: number } | null {
  const startMs = new Date(row.sessionAt).getTime();
  if (Number.isNaN(startMs)) return null;
  const mins =
    row.durationMinutes != null && row.durationMinutes > 0
      ? row.durationMinutes
      : 60;
  return { startMs, endMs: startMs + mins * 60_000 };
}

function portalTimingPhase(
  row: MentorPortalSessionRow,
  now: number,
): "cancelled" | "invalid" | "upcoming" | "live" | "past" {
  const status = (row.sessionStatus ?? "").toLowerCase();
  if (status === "cancelled") return "cancelled";
  const t = portalSessionTimes(row);
  if (!t) return "invalid";
  if (status === "completed" || now >= t.endMs) return "past";
  if (now < t.startMs) return "upcoming";
  return "live";
}

function comparePortalRowsNearest(
  a: MentorPortalSessionRow,
  b: MentorPortalSessionRow,
  nowMs: number,
): number {
  const pa = portalTimingPhase(a, nowMs);
  const pb = portalTimingPhase(b, nowMs);
  const tier = (p: typeof pa): number =>
    p === "live" ? 0 : p === "upcoming" ? 1 : p === "past" ? 2 : 3;
  const ua = tier(pa);
  const ub = tier(pb);
  if (ua !== ub) return ua - ub;

  const ta = portalSessionTimes(a);
  const tb = portalSessionTimes(b);
  if (ua === 0 && ta && tb) return ta.endMs - tb.endMs;
  if (ua === 1 && ta && tb) return ta.startMs - tb.startMs;
  if (ua === 2 && ta && tb) return tb.startMs - ta.startMs;

  const sa = ta?.startMs ?? 0;
  const sb = tb?.startMs ?? 0;
  if (sb !== sa) return sb - sa;
  return a.id - b.id;
}

type MentorBookingSortMode =
  | "nearest"
  | "session_asc"
  | "session_desc"
  | "student_az"
  | "subject_az";

type MentorBookingPhaseFilter =
  | "all"
  | "upcoming_live"
  | "past"
  | "cancelled";

function sortPortalBookingRows(
  list: MentorPortalSessionRow[],
  mode: MentorBookingSortMode,
  nowMs: number,
): MentorPortalSessionRow[] {
  const copy = [...list];
  switch (mode) {
    case "nearest":
      copy.sort((a, b) => comparePortalRowsNearest(a, b, nowMs));
      break;
    case "session_asc":
      copy.sort((a, b) => {
        const ta = new Date(a.sessionAt).getTime();
        const tb = new Date(b.sessionAt).getTime();
        if (Number.isNaN(ta)) return 1;
        if (Number.isNaN(tb)) return -1;
        return ta - tb || a.id - b.id;
      });
      break;
    case "session_desc":
      copy.sort((a, b) => {
        const ta = new Date(a.sessionAt).getTime();
        const tb = new Date(b.sessionAt).getTime();
        if (Number.isNaN(ta)) return 1;
        if (Number.isNaN(tb)) return -1;
        return tb - ta || a.id - b.id;
      });
      break;
    case "student_az":
      copy.sort(
        (a, b) =>
          a.studentName.localeCompare(b.studentName, undefined, {
            sensitivity: "base",
          }) || a.id - b.id,
      );
      break;
    case "subject_az":
      copy.sort(
        (a, b) =>
          a.subjectName.localeCompare(b.subjectName, undefined, {
            sensitivity: "base",
          }) || a.id - b.id,
      );
      break;
    default:
      break;
  }
  return copy;
}

function formatCountdownMs(ms: number): string {
  if (ms <= 0) return "0:00";
  const secTotal = Math.floor(ms / 1000);
  const d = Math.floor(secTotal / 86400);
  const h = Math.floor((secTotal % 86400) / 3600);
  const m = Math.floor((secTotal % 3600) / 60);
  const s = secTotal % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${h}h ${pad(m)}m`;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function MentorBookingCountdown({
  row,
  nowMs,
}: {
  row: MentorPortalSessionRow;
  nowMs: number;
}) {
  const phase = portalTimingPhase(row, nowMs);
  const t = portalSessionTimes(row);

  if (phase === "cancelled") {
    return (
      <span className="text-[11px] text-muted-foreground">Cancelled</span>
    );
  }
  if (phase === "invalid") {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }
  if (phase === "past") {
    return <span className="text-[11px] text-muted-foreground">Ended</span>;
  }
  if (phase === "upcoming" && t) {
    const left = t.startMs - nowMs;
    return (
      <span
        className="text-[11px] font-medium tabular-nums text-amber-700 dark:text-amber-400 block leading-tight"
        suppressHydrationWarning
      >
        Starts in {formatCountdownMs(left)}
      </span>
    );
  }
  if (phase === "live" && t) {
    const untilEnd = t.endMs - nowMs;
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 dark:text-red-400">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-55" />
            <span className="relative size-2 rounded-full bg-red-600 dark:bg-red-500" />
          </span>
          Live now
        </span>
        <span
          className="text-[11px] tabular-nums text-muted-foreground block"
          suppressHydrationWarning
        >
          Ends in {formatCountdownMs(untilEnd)}
        </span>
        {row.meetingLink ? (
          <a
            href={row.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
          >
            Open meeting
          </a>
        ) : (
          <span className="text-[10px] text-muted-foreground">No link yet</span>
        )}
      </div>
    );
  }
  return null;
}

export default function MentorDashboardPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<MentorPortalContext | null>(null);
  const [rows, setRows] = useState<MentorPortalSessionRow[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState<
    "all" | "active" | "completed"
  >("all");
  const [phaseFilter, setPhaseFilter] =
    useState<MentorBookingPhaseFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] =
    useState<MentorBookingSortMode>("nearest");
  const [page, setPage] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [materialsFor, setMaterialsFor] = useState<MentorPortalSessionRow | null>(
    null,
  );
  const [matTitle, setMatTitle] = useState("");
  const [matKind, setMatKind] = useState<"LINK" | "FILE">("LINK");
  const [matUrl, setMatUrl] = useState("");
  const [matSaving, setMatSaving] = useState(false);
  const [matDeletingId, setMatDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (rows.length === 0) return;
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [rows.length]);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Sign in required");
      const mentorCtx = await getMentorPortalContext(token);
      if (!mentorCtx) {
        toast({
          title: "No mentor profile for this login",
          description:
            "Ask an admin to add you as a mentor using the same email you use here. Your Clerk JWT must include an email claim.",
          variant: "destructive",
        });
        navigate("/dashboard", { replace: true });
        return;
      }
      setCtx(mentorCtx);
      try {
        const data = await getMentorPortalSessions(token);
        setRows(data);
      } catch (sessErr) {
        setRows([]);
        toast({
          title: "Sessions could not load",
          description:
            sessErr instanceof Error ? sessErr.message : "Try Refresh.",
          variant: "destructive",
        });
      }
      setPage(0);
    } catch (e) {
      toast({
        title: "Could not load mentor dashboard",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
      navigate("/dashboard", { replace: true });
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
      const sess = (r.sessionStatus ?? "").toLowerCase();
      if (sessionFilter === "active" && sess === "completed") return false;
      if (sessionFilter === "completed" && sess !== "completed") return false;

      const p = portalTimingPhase(r, clock);
      if (phaseFilter === "upcoming_live" && !(p === "upcoming" || p === "live"))
        return false;
      if (phaseFilter === "past" && p !== "past") return false;
      if (phaseFilter === "cancelled" && p !== "cancelled") return false;

      if (
        fromDate &&
        new Date(r.sessionAt) < new Date(`${fromDate}T00:00:00`)
      )
        return false;
      if (toDate && new Date(r.sessionAt) > new Date(`${toDate}T23:59:59`))
        return false;

      if (!q) return true;
      const pay = (r.paymentStatus ?? "").toLowerCase();
      return (
        r.studentName.toLowerCase().includes(q) ||
        r.studentEmail.toLowerCase().includes(q) ||
        r.subjectName.toLowerCase().includes(q) ||
        String(r.id).includes(q) ||
        sess.includes(q) ||
        pay.includes(q)
      );
    });
  }, [
    rows,
    globalFilter,
    sessionFilter,
    phaseFilter,
    fromDate,
    toDate,
    clock,
  ]);

  const sortedRows = useMemo(
    () => sortPortalBookingRows(filtered, sortBy, clock),
    [filtered, sortBy, clock],
  );

  const stats = useMemo(() => {
    const completed = rows.filter(
      (r) => (r.sessionStatus ?? "").toLowerCase() === "completed",
    ).length;
    const active = rows.length - completed;
    const readyToMark = rows.filter(
      (r) =>
        (r.sessionStatus ?? "").toLowerCase() !== "completed" &&
        canMarkSessionDone(r, clock),
    ).length;
    return {
      total: rows.length,
      active,
      completed,
      readyToMark,
    };
  }, [rows, clock]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = sortedRows.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const copyLink = async (url: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Copied meeting link" });
    } catch {
      toast({
        title: "Could not copy",
        variant: "destructive",
      });
    }
  };

  const mergeRow = (updated: MentorPortalSessionRow) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleMarkDone = async (sessionId: number): Promise<void> => {
    setMarkingId(sessionId);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Sign in required");
      const updated = await mentorMarkSessionComplete(token, sessionId);
      mergeRow(updated);
      toast({ title: "Marked complete" });
    } catch (e) {
      toast({
        title: "Could not mark complete",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setMarkingId(null);
      setClock(Date.now());
    }
  };

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error ?? new Error("Read failed"));
      fr.readAsDataURL(file);
    });
  }

  const handleAddMaterial = async () => {
    if (!materialsFor || !matTitle.trim()) return;
    const titleLen = matTitle.trim().length;
    if (titleLen > SESSION_RESOURCE_TITLE_MAX_CHARS) {
      toast({
        title: "Title too long",
        description: `Use at most ${SESSION_RESOURCE_TITLE_MAX_CHARS} characters.`,
        variant: "destructive",
      });
      return;
    }
    if (matKind === "LINK" && !matUrl.trim()) {
      toast({ title: "Add a URL", variant: "destructive" });
      return;
    }
    if (matKind === "LINK" && matUrl.trim().length > SESSION_RESOURCE_LINK_URL_MAX_CHARS) {
      toast({
        title: "URL too long",
        description: `Use at most ${SESSION_RESOURCE_LINK_URL_MAX_CHARS} characters.`,
        variant: "destructive",
      });
      return;
    }
    if (matKind === "FILE") {
      const inp = document.querySelector(
        '[data-slot="resource-file-input"]',
      ) as HTMLInputElement | null;
      const file = inp?.files?.[0];
      if (!file) {
        toast({ title: "Choose a file", variant: "destructive" });
        return;
      }
      if (file.name.length > SESSION_RESOURCE_FILENAME_MAX_CHARS) {
        toast({
          title: "File name too long",
          description: `Rename to ${SESSION_RESOURCE_FILENAME_MAX_CHARS} characters or fewer.`,
          variant: "destructive",
        });
        return;
      }
      if (file.size > FILE_RESOURCE_MAX_BYTES) {
        toast({
          title: "File too large",
          description: `Max ${Math.round(FILE_RESOURCE_MAX_BYTES / (1024 * 1024))} MB.`,
          variant: "destructive",
        });
        return;
      }
    }

    setMatSaving(true);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Sign in required");
      let updated: MentorPortalSessionRow;
      if (matKind === "LINK") {
        updated = await mentorAddSessionResource(token, materialsFor.id, {
          title: matTitle.trim(),
          kind: "LINK",
          linkUrl: matUrl.trim(),
        });
      } else {
        const inp = document.querySelector(
          '[data-slot="resource-file-input"]',
        ) as HTMLInputElement | null;
        const file = inp?.files?.[0]!;
        const dataUrl = await readFileAsDataUrl(file);
        updated = await mentorAddSessionResource(token, materialsFor.id, {
          title: matTitle.trim(),
          kind: "FILE",
          fileName: file.name,
          mimeType: file.type || undefined,
          fileDataUrl: dataUrl,
        });
      }
      mergeRow(updated);
      setMaterialsFor(updated);
      setMatTitle("");
      setMatUrl("");
      setMatKind("LINK");
      const inpClear = document.querySelector(
        '[data-slot="resource-file-input"]',
      ) as HTMLInputElement | null;
      if (inpClear) inpClear.value = "";
      toast({ title: "Resource added" });
    } catch (e) {
      toast({
        title: "Could not add resource",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setMatSaving(false);
    }
  };

  const handleDeleteMaterial = async (
    sessionId: number,
    resource: SessionResourceItem,
  ) => {
    setMatDeletingId(resource.id);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Sign in required");
      const updated = await mentorDeleteSessionResource(
        token,
        sessionId,
        resource.id,
      );
      mergeRow(updated);
      setMaterialsFor((cur) => (cur?.id === sessionId ? updated : cur));
      toast({ title: "Removed" });
    } catch (e) {
      toast({
        title: "Could not delete",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setMatDeletingId(null);
    }
  };

  if (loading && ctx === null && rows.length === 0) {
    return (
      <div className="container max-w-6xl py-10 space-y-4">
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!ctx) return null;

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            Mentor dashboard
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">
            {ctx.firstName} {ctx.lastName}
          </h1>
          {ctx.title && (
            <p className="text-muted-foreground text-sm mt-0.5">{ctx.title}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2 max-w-xl">
            Only sessions with{" "}
            <span className="font-medium text-foreground">
              confirmed payment (admin-approved)
            </span>{" "}
            are listed. Live countdown under <strong>Starts</strong> (starts in
            / live / ended). Add <strong>materials</strong> (links or files) per booking so students see them under Resources. After the scheduled end time, use{" "}
            <strong>Mark done</strong> to close the booking (students may then review when applicable).
          </p>
          <Link
            to={`/mentors/${ctx.id}`}
            className="text-sm text-primary font-medium underline-offset-4 hover:underline inline-block mt-2"
          >
            View public profile
          </Link>
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="shrink-0 gap-2"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Paid sessions listed"
          subtitle="Admin-confirmed payment only"
          value={stats.total}
        />
        <StatCard
          label="Active"
          subtitle="Not marked complete yet"
          value={stats.active}
        />
        <StatCard
          label="Ready to mark done"
          subtitle="Session end time has passed"
          value={stats.readyToMark}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col xl:flex-row gap-3 flex-wrap items-end">
          <div className="flex flex-col gap-1 w-full max-w-xs">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <Input
              placeholder="Student, email, subject, status, ID…"
              value={globalFilter}
              className="w-full"
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Completion</Label>
            <Select
              value={sessionFilter}
              onValueChange={(v) => {
                setSessionFilter(v as typeof sessionFilter);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sessions</SelectItem>
                <SelectItem value="active">Active (not completed)</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Timing</Label>
            <Select
              value={phaseFilter}
              onValueChange={(v) => {
                setPhaseFilter(v as MentorBookingPhaseFilter);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All timings</SelectItem>
                <SelectItem value="upcoming_live">
                  Upcoming & live now
                </SelectItem>
                <SelectItem value="past">Ended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Sort</Label>
            <Select
              value={sortBy}
              onValueChange={(v) => {
                setSortBy(v as MentorBookingSortMode);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nearest">
                  Smart (nearest / urgent first)
                </SelectItem>
                <SelectItem value="session_asc">Start date (earliest)</SelectItem>
                <SelectItem value="session_desc">Start date (latest)</SelectItem>
                <SelectItem value="student_az">Student (A–Z)</SelectItem>
                <SelectItem value="subject_az">Subject (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-center">
            <Label className="text-xs whitespace-nowrap text-muted-foreground">
              From
            </Label>
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
            <Label className="text-xs whitespace-nowrap text-muted-foreground">
              To
            </Label>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mb-0.5"
            onClick={() => {
              setGlobalFilter("");
              setSessionFilter("all");
              setPhaseFilter("all");
              setFromDate("");
              setToDate("");
              setSortBy("nearest");
              setPage(0);
            }}
          >
            Clear filters
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="min-w-[9.5rem]">Starts · timer</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Meeting</TableHead>
              <TableHead className="w-[140px]">Materials</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  No payment-approved sessions yet, or none match filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r) => {
                const start = new Date(r.sessionAt);
                const dur = r.durationMinutes ?? 60;
                const end = addMinutes(start, dur);
                const done = (r.sessionStatus ?? "").toLowerCase() === "completed";
                const canMark = canMarkSessionDone(r, clock);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.id}</TableCell>
                    <TableCell className="align-top">
                      <div className="font-medium">{r.studentName}</div>
                      <div className="text-xs text-muted-foreground break-all">
                        {r.studentEmail}
                      </div>
                    </TableCell>
                    <TableCell>{r.subjectName}</TableCell>
                    <TableCell className="align-top text-sm min-w-[9.5rem]">
                      <div className="whitespace-nowrap">
                        {format(start, "MMM d, yyyy HH:mm")}
                      </div>
                      <div className="mt-2 pt-2 border-t border-border/60">
                        <MentorBookingCountdown row={r} nowMs={clock} />
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(end, "MMM d, yyyy HH:mm")}
                      <span className="block text-[11px]">({dur} min)</span>
                    </TableCell>
                    <TableCell>
                      {done ? (
                        <Badge className="bg-green-700">Completed</Badge>
                      ) : (
                        <Badge variant="outline">Scheduled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {r.meetingLink ? (
                        <div className="flex flex-col gap-2">
                          <a
                            href={r.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline truncate"
                          >
                            Open link
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 w-fit gap-1"
                            onClick={() => copyLink(r.meetingLink!)}
                          >
                            <Copy className="size-3.5" />
                            Copy
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Pending from admin
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1 w-full max-w-[128px]"
                        title={`Materials: link URL ≤${SESSION_RESOURCE_LINK_URL_MAX_CHARS} characters, file ≤${RESOURCE_FILE_MAX_MB} MB, title ≤${SESSION_RESOURCE_TITLE_MAX_CHARS} characters.`}
                        onClick={() => {
                          setMaterialsFor(r);
                          setMatTitle("");
                          setMatUrl("");
                          setMatKind("LINK");
                          requestAnimationFrame(() => {
                            const inp = document.querySelector(
                              '[data-slot="resource-file-input"]',
                            ) as HTMLInputElement | null;
                            if (inp) inp.value = "";
                          });
                        }}
                      >
                        <Upload className="size-3.5 shrink-0" />
                        {(r.resources?.length ?? 0) > 0
                          ? `Manage (${r.resources!.length})`
                          : "Add"}
                      </Button>
                    </TableCell>
                    <TableCell className="align-top">
                      {!done ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            !canMark ||
                            markingId === r.id
                          }
                          title={
                            canMark
                              ? "Mark session as finished"
                              : `Available after ${format(end, "MMM d HH:mm")}`
                          }
                          onClick={() => handleMarkDone(r.id)}
                        >
                          {markingId === r.id ? "Saving…" : "Mark done"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Page {page + 1} of {pageCount} ({sortedRows.length} rows)
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
        open={!!materialsFor}
        onOpenChange={(open) => {
          if (!open) setMaterialsFor(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {materialsFor && (
            <>
              <DialogHeader>
                <DialogTitle>Session materials</DialogTitle>
                <p className="text-sm text-muted-foreground text-left pt-1">
                  {materialsFor.subjectName} · {materialsFor.studentName}
                </p>
                <div className="rounded-md border bg-muted/40 p-3 text-left text-xs text-muted-foreground space-y-1.5 mt-2">
                  <p className="font-medium text-foreground">Upload limits (same as server)</p>
                  <ul className="list-disc pl-4 space-y-0.5 leading-relaxed">
                    <li>Title: max {SESSION_RESOURCE_TITLE_MAX_CHARS} characters</li>
                    <li>Link URL: max {SESSION_RESOURCE_LINK_URL_MAX_CHARS} characters</li>
                    <li>File size: max {RESOURCE_FILE_MAX_MB} MB (decoded)</li>
                    <li>File name: max {SESSION_RESOURCE_FILENAME_MAX_CHARS} characters</li>
                  </ul>
                </div>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium mb-2">Shared with this student</p>
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                    Previews are kept short here so rows stay tidy — hover for
                    full title, URL, or file name.
                  </p>
                  {(materialsFor.resources?.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground">
                      No links or files yet.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-w-full">
                      {materialsFor.resources!.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-2 rounded-md border p-2.5 sm:p-3"
                        >
                          <div className="min-w-0 flex-1 max-w-[calc(100%-2.75rem)]">
                            <p
                              className="font-medium text-sm leading-snug line-clamp-2 break-words"
                              title={item.title}
                            >
                              {truncateDisplayEnd(
                                item.title,
                                RESOURCE_CARD_MENTOR_SHARED_TITLE_MAX,
                              )}
                            </p>
                            <p
                              className="text-xs text-muted-foreground mt-0.5 font-mono break-all line-clamp-2"
                              title={
                                item.kind === "link"
                                  ? item.linkUrl ?? ""
                                  : item.fileName ?? ""
                              }
                            >
                              {item.kind === "link"
                                ? truncateDisplayMiddle(
                                    item.linkUrl ?? "Link",
                                    RESOURCE_CARD_MENTOR_SHARED_LINK_MAX,
                                  )
                                : truncateDisplayEnd(
                                    item.fileName ?? "File",
                                    RESOURCE_CARD_MENTOR_SHARED_FILENAME_MAX,
                                  )}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            disabled={matDeletingId === item.id}
                            onClick={() =>
                              handleDeleteMaterial(materialsFor.id, item)
                            }
                            aria-label="Remove resource"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <p className="font-medium">Add resource</p>
                  <div className="space-y-2">
                    <div className="flex justify-between gap-2">
                      <Label htmlFor="mat-title">Title</Label>
                      <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                        {matTitle.length}/{SESSION_RESOURCE_TITLE_MAX_CHARS}
                      </span>
                    </div>
                    <Input
                      id="mat-title"
                      value={matTitle}
                      maxLength={SESSION_RESOURCE_TITLE_MAX_CHARS}
                      onChange={(e) => setMatTitle(e.target.value)}
                      placeholder="e.g. Week 1 slides"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={matKind}
                      onValueChange={(v) => setMatKind(v as "LINK" | "FILE")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LINK">External link</SelectItem>
                        <SelectItem value="FILE">Upload file</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {matKind === "LINK" ? (
                    <div className="space-y-2">
                      <div className="flex justify-between gap-2">
                        <Label htmlFor="mat-url">URL</Label>
                        <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                          {matUrl.length}/{SESSION_RESOURCE_LINK_URL_MAX_CHARS}
                        </span>
                      </div>
                      <Input
                        id="mat-url"
                        value={matUrl}
                        maxLength={SESSION_RESOURCE_LINK_URL_MAX_CHARS}
                        onChange={(e) => setMatUrl(e.target.value)}
                        placeholder="https://…"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="mat-file">File</Label>
                      <p className="text-xs text-muted-foreground">
                        Max {RESOURCE_FILE_MAX_MB} MB decoded size. File name
                        max {SESSION_RESOURCE_FILENAME_MAX_CHARS} characters.
                      </p>
                      <Input
                        id="mat-file"
                        data-slot="resource-file-input"
                        type="file"
                      />
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMaterialsFor(null)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => handleAddMaterial()}
                  disabled={matSaving}
                >
                  {matSaving ? "Saving…" : "Add resource"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  subtitle,
  value,
}: {
  label: string;
  subtitle?: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {subtitle && (
        <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
      )}
      <p className="text-3xl font-semibold mt-2 tabular-nums">{value}</p>
    </div>
  );
}
