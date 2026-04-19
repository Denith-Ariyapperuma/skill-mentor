import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/clerk-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  ExternalLink,
  CheckCircle2,
  CreditCard,
  Link2,
} from "lucide-react";
import { useToast } from "@/components/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/api";
import { getTokenForBackend } from "@/lib/clerk-token";

interface AdminSession {
  id: number;
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  mentorFirstName: string;
  mentorLastName: string;
  subjectName: string;
  sessionAt: string;
  durationMinutes: number;
  paymentStatus: string;
  sessionStatus: string;
  meetingLink: string | null;
}

export default function ManageBookingsPage() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  );
  const [newMeetingLink, setNewMeetingLink] = useState("");

  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { toast } = useToast();

  const fetchSessions = async () => {
    try {
      const token = await getTokenForBackend(getToken);
      if (!token) throw new Error("Not signed in");
      const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ||
            "Unauthorized — sign out and back in, or check backend CLERK_JWKS_URL matches this Clerk app.",
        );
      }
      if (response.status === 403) {
        throw new Error(
          "Forbidden — JWT needs roles: [\"ADMIN\"]. Update Clerk JWT template + public metadata.",
        );
      }
      if (!response.ok) throw new Error("Failed to fetch sessions");
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Could not load sessions.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      if (isLoaded && !isSignedIn) setLoading(false);
      return;
    }
    void fetchSessions();
  }, [isLoaded, isSignedIn]);

  const handleAction = async (
    id: number,
    action: "confirm-payment" | "complete" | "meeting-link",
    meetingLink?: string,
  ) => {
    try {
      const token = await getTokenForBackend(getToken);
      if (!token) throw new Error("Not signed in");
      const base = `${API_BASE_URL}/api/v1/sessions/${id}/${action}`;
      const response = await fetch(base, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body:
          action === "meeting-link"
            ? JSON.stringify({ meetingLink: meetingLink ?? "" })
            : undefined,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || "Request failed");
      }

      toast({
        title: "Saved",
        description: "Session updated.",
      });

      fetchSessions();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  };

  const filteredSessions = sessions.filter(
    (s) =>
      `${s.studentFirstName} ${s.studentLastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      `${s.mentorFirstName} ${s.mentorLastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      s.studentEmail.toLowerCase().includes(search.toLowerCase()),
  );

  const getStatusBadge = (status: string) => {
    const st = status.toLowerCase();
    switch (st) {
      case "confirmed":
      case "completed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            {status}
          </Badge>
        );
      case "pending":
      case "scheduled":
        return (
          <Badge
            variant="outline"
            className="text-amber-500 border-amber-500/20"
          >
            {status}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manage Bookings</h2>
          <p className="text-white/60">
            Monitor and update all mentoring sessions.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <Input
          placeholder="Search by student or mentor name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-white/5 border-white/10"
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/40">ID</TableHead>
              <TableHead className="text-white/40">Student</TableHead>
              <TableHead className="text-white/40">Mentor</TableHead>
              <TableHead className="text-white/40">Subject</TableHead>
              <TableHead className="text-white/40">Date & Time</TableHead>
              <TableHead className="text-white/40">Payment</TableHead>
              <TableHead className="text-white/40">Status</TableHead>
              <TableHead className="text-white/40 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-white/40"
                >
                  Loading sessions...
                </TableCell>
              </TableRow>
            ) : filteredSessions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-white/40"
                >
                  No sessions found.
                </TableCell>
              </TableRow>
            ) : (
              filteredSessions.map((session) => (
                <TableRow
                  key={session.id}
                  className="border-white/10 hover:bg-white/5 transition-colors"
                >
                  <TableCell className="font-mono text-xs text-white/40">
                    #{session.id}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {session.studentFirstName} {session.studentLastName}
                    </div>
                    <div className="text-xs text-white/40">
                      {session.studentEmail}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {session.mentorFirstName} {session.mentorLastName}
                  </TableCell>
                  <TableCell>{session.subjectName}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {format(new Date(session.sessionAt), "MMM d, yyyy")}
                    </div>
                    <div className="text-xs text-white/40">
                      {format(new Date(session.sessionAt), "p")} (
                      {session.durationMinutes}m)
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(session.paymentStatus)}</TableCell>
                  <TableCell>{getStatusBadge(session.sessionStatus)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-neutral-900 border-white/10 text-white"
                      >
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer focus:bg-white/10"
                          onClick={() =>
                            handleAction(session.id, "confirm-payment")
                          }
                          disabled={session.paymentStatus === "confirmed"}
                        >
                          <CreditCard className="size-4" />
                          Confirm Payment
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer focus:bg-white/10"
                          onClick={() => handleAction(session.id, "complete")}
                          disabled={
                            session.sessionStatus === "completed" ||
                            session.paymentStatus !== "confirmed"
                          }
                        >
                          <CheckCircle2 className="size-4" />
                          Mark Complete
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer focus:bg-white/10"
                          onClick={() => {
                            setSelectedSessionId(session.id);
                            setNewMeetingLink(session.meetingLink || "");
                            setIsLinkDialogOpen(true);
                          }}
                        >
                          <Link2 className="size-4" />
                          {session.meetingLink ? "Update Link" : "Add Link"}
                        </DropdownMenuItem>
                        {session.meetingLink && (
                          <DropdownMenuItem
                            asChild
                            className="focus:bg-white/10"
                          >
                            <a
                              href={session.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <ExternalLink className="size-4" />
                              View Meeting
                            </a>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Update Meeting Link</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="https://zoom.us/j/..."
              value={newMeetingLink}
              onChange={(e) => setNewMeetingLink(e.target.value)}
              className="bg-black/40 border-white/10"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLinkDialogOpen(false)}
              className="border-white/10 text-white bg-transparent hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedSessionId != null) {
                  void handleAction(
                    selectedSessionId,
                    "meeting-link",
                    newMeetingLink,
                  );
                  setIsLinkDialogOpen(false);
                }
              }}
            >
              Save Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
