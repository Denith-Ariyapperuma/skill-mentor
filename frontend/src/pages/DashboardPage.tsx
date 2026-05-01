import { useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  CalendarDays,
  Clock,
  Copy,
  Download,
  FolderOpen,
  Radio,
  Star,
  Video,
} from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import {
  downloadSessionResourceFile,
  FILE_RESOURCE_MAX_BYTES,
  SESSION_RESOURCE_LINK_URL_MAX_CHARS,
  getMyEnrollments,
  submitSessionReview,
} from "@/lib/api";
import type { Enrollment, SessionResourceItem } from "@/types";
import {
  RESOURCE_CARD_MENTOR_SHARED_FILENAME_MAX,
  RESOURCE_CARD_MENTOR_SHARED_LINK_MAX,
  RESOURCE_CARD_MENTOR_SHARED_TITLE_MAX,
  truncateDisplayEnd,
  truncateDisplayMiddle,
} from "@/lib/utils";
import { Link, useNavigate } from "react-router";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const RESOURCE_FILE_MAX_MB_UI = Math.round(
  FILE_RESOURCE_MAX_BYTES / (1024 * 1024),
);

function sessionTimes(enrollment: Enrollment): {
  startMs: number;
  endMs: number;
} | null {
  const startMs = new Date(enrollment.sessionAt).getTime();
  if (Number.isNaN(startMs)) return null;
  const mins =
    enrollment.durationMinutes != null && enrollment.durationMinutes > 0
      ? enrollment.durationMinutes
      : 60;
  return {
    startMs,
    endMs: startMs + mins * 60_000,
  };
}

function sessionTimingPhase(
  enrollment: Enrollment,
  now: number,
): "cancelled" | "invalid" | "upcoming" | "live" | "past" {
  const status = enrollment.sessionStatus?.toLowerCase() ?? "";
  if (status === "cancelled") return "cancelled";
  const t = sessionTimes(enrollment);
  if (!t) return "invalid";
  if (status === "completed" || now >= t.endMs) return "past";
  if (now < t.startMs) return "upcoming";
  return "live";
}

/** Live first (ending soonest), then upcoming (soonest start), then past (most recent first), then cancelled/invalid last. */
function compareEnrollmentsByNearestSession(
  a: Enrollment,
  b: Enrollment,
  nowMs: number,
): number {
  const pa = sessionTimingPhase(a, nowMs);
  const pb = sessionTimingPhase(b, nowMs);
  const tier = (p: typeof pa): number =>
    p === "live" ? 0 : p === "upcoming" ? 1 : p === "past" ? 2 : 3;
  const ua = tier(pa);
  const ub = tier(pb);
  if (ua !== ub) return ua - ub;

  const ta = sessionTimes(a);
  const tb = sessionTimes(b);
  if (ua === 0 && ta && tb) return ta.endMs - tb.endMs;
  if (ua === 1 && ta && tb) return ta.startMs - tb.startMs;
  if (ua === 2 && ta && tb) return tb.startMs - ta.startMs;

  const sa = ta?.startMs ?? 0;
  const sb = tb?.startMs ?? 0;
  if (sb !== sa) return sb - sa;
  return a.id - b.id;
}

type CoursePhaseFilter =
  | "all"
  | "upcoming_live"
  | "past"
  | "cancelled"
  | "completed";

type CourseSortMode =
  | "nearest"
  | "session_asc"
  | "session_desc"
  | "mentor_az"
  | "subject_az";

function matchesCoursePhaseFilter(
  enrollment: Enrollment,
  nowMs: number,
  filter: CoursePhaseFilter,
): boolean {
  if (filter === "all") return true;
  const p = sessionTimingPhase(enrollment, nowMs);
  if (filter === "upcoming_live")
    return p === "upcoming" || p === "live";
  if (filter === "past") return p === "past";
  if (filter === "cancelled") return p === "cancelled";
  if (filter === "completed")
    return (enrollment.sessionStatus ?? "").toLowerCase() === "completed";
  return true;
}

function sortEnrollments(
  list: Enrollment[],
  mode: CourseSortMode,
  nowMs: number,
): Enrollment[] {
  const copy = [...list];
  switch (mode) {
    case "nearest":
      copy.sort((a, b) =>
        compareEnrollmentsByNearestSession(a, b, nowMs),
      );
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
    case "mentor_az":
      copy.sort((a, b) =>
        a.mentorName.localeCompare(b.mentorName, undefined, {
          sensitivity: "base",
        }) || a.id - b.id,
      );
      break;
    case "subject_az":
      copy.sort((a, b) =>
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

export default function DashboardPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useNavigate();
  const { toast } = useToast();
  const [reviewTarget, setReviewTarget] = useState<Enrollment | null>(null);
  const [resourcesTarget, setResourcesTarget] = useState<Enrollment | null>(
    null,
  );
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [downloadResId, setDownloadResId] = useState<number | null>(null);
  const [courseSearch, setCourseSearch] = useState("");
  const [phaseFilter, setPhaseFilter] =
    useState<CoursePhaseFilter>("all");
  const [courseSort, setCourseSort] =
    useState<CourseSortMode>("nearest");

  useEffect(() => {
    if (!enrollments.length) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [enrollments.length]);

  useEffect(() => {
    async function fetchEnrollments() {
      if (!user) {
        setLoading(false);
        return;
      }
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await getMyEnrollments(token);
        setEnrollments(data);
      } catch (err) {
        console.error("Failed to fetch enrollments", err);
      } finally {
        setLoading(false);
      }
    }

    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    fetchEnrollments();
  }, [isLoaded, isSignedIn, getToken, user]);

  const coursesForGrid = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    const filtered = enrollments.filter((e) => {
      if (!matchesCoursePhaseFilter(e, nowMs, phaseFilter))
        return false;
      if (!q) return true;
      return (
        e.mentorName.toLowerCase().includes(q) ||
        e.subjectName.toLowerCase().includes(q) ||
        String(e.id).includes(q)
      );
    });
    return sortEnrollments(filtered, courseSort, nowMs);
  }, [enrollments, courseSearch, phaseFilter, courseSort, nowMs]);

  if (!isLoaded || loading) {
    return (
      <div className="container py-10 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[22rem] rounded-xl" />
          <Skeleton className="h-[22rem] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    router("/login");
    return null;
  }

  const submitReview = async () => {
    if (!reviewTarget) return;
    setSubmittingReview(true);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Not signed in");
      await submitSessionReview(token, reviewTarget.id, {
        rating,
        comment: comment.trim() || undefined,
      });
      toast({ title: "Thank you for your review!" });
      setReviewTarget(null);
      const refreshed = await getMyEnrollments(token);
      setEnrollments(refreshed);
    } catch (e) {
      toast({
        title: "Review failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  function sessionEndsAt(enrollment: Enrollment): Date | null {
    const t = sessionTimes(enrollment);
    return t ? new Date(t.endMs) : null;
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

  async function copyMeetingLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Meeting link copied" });
    } catch {
      toast({
        title: "Could not copy",
        variant: "destructive",
      });
    }
  }

  async function downloadStudentResource(
    enrollmentId: number,
    item: SessionResourceItem,
  ) {
    if (item.kind !== "file") return;
    setDownloadResId(item.id);
    try {
      const token = await getToken({ template: "skillmentor-auth" });
      if (!token) throw new Error("Sign in required");
      const blob = await downloadSessionResourceFile(
        token,
        enrollmentId,
        item.id,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.fileName || "download";
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Download started" });
    } catch (e) {
      toast({
        title: "Download failed",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDownloadResId(null);
    }
  }

  function canReview(enrollment: Enrollment) {
    return enrollment.sessionStatus?.toLowerCase() === "completed";
  }

  if (!enrollments.length) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold tracking-tight mb-6">My Courses</h1>
        <p className="text-muted-foreground">No courses enrolled yet.</p>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold tracking-tight mb-2">My Courses</h1>
      <p className="text-muted-foreground text-sm mb-6 max-w-2xl">
        Join your live session, open course resources, and leave a review when
        your session is complete.
      </p>

      <div className="flex flex-col xl:flex-row gap-3 flex-wrap items-end mb-8">
        <div className="flex flex-col gap-1 w-full max-w-sm">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <Input
            placeholder="Mentor, subject, or booking #"
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Filter</Label>
          <Select
            value={phaseFilter}
            onValueChange={(v) => setPhaseFilter(v as CoursePhaseFilter)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sessions</SelectItem>
              <SelectItem value="upcoming_live">Upcoming & live</SelectItem>
              <SelectItem value="past">Ended</SelectItem>
              <SelectItem value="completed">Marked complete</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Sort</Label>
          <Select
            value={courseSort}
            onValueChange={(v) => setCourseSort(v as CourseSortMode)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nearest">Nearest session first</SelectItem>
              <SelectItem value="session_asc">Start date (earliest)</SelectItem>
              <SelectItem value="session_desc">Start date (latest)</SelectItem>
              <SelectItem value="mentor_az">Mentor (A–Z)</SelectItem>
              <SelectItem value="subject_az">Subject (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mb-0.5"
          onClick={() => {
            setCourseSearch("");
            setPhaseFilter("all");
            setCourseSort("nearest");
          }}
        >
          Clear
        </Button>
      </div>

      {coursesForGrid.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
          <p className="text-muted-foreground">
            No courses match your search or filters.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => {
              setCourseSearch("");
              setPhaseFilter("all");
              setCourseSort("nearest");
            }}
          >
            Reset filters
          </Button>
        </div>
      ) : (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {coursesForGrid.map((enrollment) => {
          const meeting = enrollment.meetingLink;
          const phase = sessionTimingPhase(enrollment, nowMs);
          return (
            <Card
              key={enrollment.id}
              className="overflow-hidden flex flex-col h-full border shadow-sm"
            >
              {(() => {
                const t = sessionTimes(enrollment);
                if (phase === "cancelled") {
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5 shrink-0" />
                      <span>This session was cancelled.</span>
                    </div>
                  );
                }
                if (phase === "invalid" || !t) {
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b text-xs text-muted-foreground">
                      <Clock className="size-3.5 shrink-0" />
                      <span>Session time unavailable</span>
                    </div>
                  );
                }
                if (phase === "upcoming") {
                  const left = t.startMs - nowMs;
                  return (
                    <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/80 dark:bg-muted/40 border-b">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="size-4 shrink-0 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Starts in
                        </span>
                      </div>
                      <span
                        className="text-sm tabular-nums font-semibold tracking-tight shrink-0"
                        suppressHydrationWarning
                      >
                        {formatCountdownMs(left)}
                      </span>
                    </div>
                  );
                }
                if (phase === "live") {
                  const untilEnd = t.endMs - nowMs;
                  return (
                    <div className="flex flex-col gap-2 px-3 py-2.5 border-b bg-red-600/15 dark:bg-red-950/40">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                          <span className="relative flex size-2.5">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" />
                            <span className="relative inline-flex size-2.5 rounded-full bg-red-600 dark:bg-red-500" />
                          </span>
                          Live now
                        </span>
                        <span
                          className="text-xs tabular-nums text-muted-foreground shrink-0"
                          suppressHydrationWarning
                        >
                          Ends in {formatCountdownMs(untilEnd)}
                        </span>
                      </div>
                      {meeting ? (
                        <Button
                          size="sm"
                          className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white border-0 shadow-md shadow-red-600/25"
                          asChild
                        >
                          <a
                            href={meeting}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Radio className="size-4 shrink-0" />
                            Join live
                          </a>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full gap-2 bg-red-600/80 text-white cursor-not-allowed opacity-90"
                          disabled
                          title="Meeting link missing — contact your mentor or admin."
                        >
                          <Radio className="size-4 shrink-0" />
                          Join live
                        </Button>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/60 border-b text-xs">
                    <span className="font-medium text-muted-foreground">
                      Session ended
                    </span>
                    <span className="tabular-nums text-muted-foreground shrink-0">
                      {new Date(t.endMs).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                );
              })()}

              <div className="aspect-video bg-muted relative shrink-0">
                {enrollment.courseImageUrl ? (
                  <img
                    src={enrollment.courseImageUrl}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : enrollment.mentorProfileImageUrl ? (
                  <img
                    src={enrollment.mentorProfileImageUrl}
                    alt=""
                    className="absolute inset-0 size-full object-cover object-top opacity-95"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-linear-to-br from-blue-600 to-blue-800 text-white text-4xl font-bold">
                    {enrollment.subjectName.charAt(0)}
                  </div>
                )}
                <div className="absolute top-3 right-3 z-10">
                  <span className="shadow-sm rounded-md overflow-hidden backdrop-blur-sm bg-background/90">
                    <StatusPill status={enrollment.paymentStatus} />
                  </span>
                </div>
              </div>

              <CardHeader className="pb-2 space-y-1">
                <CardTitle className="text-lg leading-snug">
                  {enrollment.subjectName}
                </CardTitle>
                <CardDescription>
                  with {enrollment.mentorName}
                </CardDescription>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1">
                  <CalendarDays className="size-4 shrink-0" />
                  <span>
                    {new Date(enrollment.sessionAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground capitalize pt-0.5">
                  Session: {enrollment.sessionStatus}
                </p>
              </CardHeader>

              <CardContent className="pb-3 flex flex-col gap-3 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 min-h-[3.75rem]">
                  {enrollment.subjectDescription?.trim()
                    ? enrollment.subjectDescription
                    : "Course details are in Resources."}
                </p>

                <div className="mt-auto flex flex-col gap-2">
                  {phase !== "live" &&
                    phase !== "cancelled" &&
                    phase !== "invalid" &&
                    (meeting ? (
                      <Button size="lg" className="w-full gap-2" asChild>
                        <a
                          href={meeting}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Video className="size-4 shrink-0" />
                          Join session
                        </a>
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        className="w-full gap-2"
                        disabled
                        title="Your mentor or admin will add a meeting link after payment is confirmed."
                      >
                        <Video className="size-4 shrink-0 opacity-70" />
                        Join session
                      </Button>
                    ))}
                  {phase === "live" && (
                    <p className="text-center text-xs text-muted-foreground -mt-1 mb-1">
                      Use Join live above, or{" "}
                      {meeting ? (
                        <a
                          className="text-primary underline-offset-4 hover:underline font-medium"
                          href={meeting}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          open meeting
                        </a>
                      ) : (
                        "add a meeting link when available"
                      )}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-1.5"
                      disabled={!canReview(enrollment)}
                      title={
                        canReview(enrollment)
                          ? "Rate this session"
                          : "Available after your session is marked complete."
                      }
                      onClick={() => {
                        setReviewTarget(enrollment);
                        setRating(5);
                        setComment("");
                      }}
                    >
                      <Star className="size-4 shrink-0" />
                      Review
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-1.5"
                      title={`Course info and mentor materials (links ≤${SESSION_RESOURCE_LINK_URL_MAX_CHARS} chars; files ≤${RESOURCE_FILE_MAX_MB_UI} MB each).`}
                      onClick={() => setResourcesTarget(enrollment)}
                    >
                      <FolderOpen className="size-4 shrink-0" />
                      Resources
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}

      <Dialog
        open={!!resourcesTarget}
        onOpenChange={(open) => !open && setResourcesTarget(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {resourcesTarget && (
            <>
              <DialogHeader>
                <DialogTitle>{resourcesTarget.subjectName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 text-sm">
                <section>
                  <p className="font-medium mb-2">Course overview</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {resourcesTarget.subjectDescription?.trim()
                      ? resourcesTarget.subjectDescription
                      : "No written overview for this subject yet."}
                  </p>
                </section>

                <section className="rounded-xl border bg-muted/40 p-4 space-y-3">
                  <div>
                    <p className="font-medium">Mentor materials</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Links and files respect server limits (URL up to{" "}
                      {SESSION_RESOURCE_LINK_URL_MAX_CHARS.toLocaleString()}{" "}
                      characters; files up to {RESOURCE_FILE_MAX_MB_UI} MB).
                      Rows use the same short previews as the mentor list — hover
                      for full title, URL, or file name.
                    </p>
                  </div>
                  {(resourcesTarget.resources?.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Your mentor hasn&apos;t shared files or links here yet.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-w-full">
                      {resourcesTarget.resources!.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-2 rounded-md border bg-background/60 p-2.5 sm:p-3"
                        >
                          <div className="min-w-0 flex-1 overflow-hidden pr-1 sm:max-w-[calc(100%-7.25rem)]">
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
                          {item.kind === "link" && item.linkUrl ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0"
                              asChild
                            >
                              <a
                                href={item.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open
                              </a>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1.5 shrink-0 whitespace-nowrap"
                              disabled={downloadResId === item.id}
                              onClick={() =>
                                downloadStudentResource(
                                  resourcesTarget.id,
                                  item,
                                )
                              }
                            >
                              <Download className="size-4 shrink-0" />
                              Download
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-xl border bg-muted/40 p-4 space-y-2">
                  <p className="font-medium">Your booking</p>
                  <ul className="text-muted-foreground space-y-1 list-none">
                    <li>
                      Mentor:{" "}
                      {resourcesTarget.mentorId != null ? (
                        <Link
                          className="text-foreground underline-offset-4 hover:underline font-medium"
                          to={`/mentors/${resourcesTarget.mentorId}`}
                          onClick={() => setResourcesTarget(null)}
                        >
                          {resourcesTarget.mentorName}
                        </Link>
                      ) : (
                        <span className="text-foreground font-medium">
                          {resourcesTarget.mentorName}
                        </span>
                      )}
                    </li>
                    <li>
                      Starts:{" "}
                      {new Date(resourcesTarget.sessionAt).toLocaleString()}
                    </li>
                    {resourcesTarget.durationMinutes != null && (
                      <li>Duration: {resourcesTarget.durationMinutes} min</li>
                    )}
                    {sessionEndsAt(resourcesTarget) && (
                      <li>
                        Ends (approx.):{" "}
                        {sessionEndsAt(resourcesTarget)!.toLocaleString()}
                      </li>
                    )}
                    <li className="font-mono text-xs pt-1">
                      Booking #{resourcesTarget.id}
                    </li>
                  </ul>
                </section>

                <section className="rounded-xl border bg-muted/40 p-4 space-y-3">
                  <p className="font-medium">Meeting link</p>
                  {resourcesTarget.meetingLink ? (
                    <>
                      <p className="text-xs text-muted-foreground break-all">
                        {resourcesTarget.meetingLink}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" asChild className="gap-1">
                          <a
                            href={resourcesTarget.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Video className="size-4" />
                            Open
                          </a>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() =>
                            copyMeetingLink(resourcesTarget.meetingLink!)
                          }
                        >
                          <Copy className="size-4" />
                          Copy
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      No link yet. Check back after payment is confirmed.
                    </p>
                  )}
                </section>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResourcesTarget(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewTarget} onOpenChange={() => setReviewTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="p-1 rounded-md hover:bg-muted"
                    onClick={() => setRating(n)}
                    aria-label={`${n} stars`}
                  >
                    <Star
                      className={`size-8 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rev-comment">Comment</Label>
              <Textarea
                id="rev-comment"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitReview} disabled={submittingReview}>
              Submit review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
