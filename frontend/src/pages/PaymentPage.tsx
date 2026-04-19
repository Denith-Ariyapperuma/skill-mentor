import { useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";
import { enrollInSession } from "@/lib/api";
import { getTokenForBackend } from "@/lib/clerk-token";

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sessionId } = useParams();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");

  const date = searchParams.get("date");
  const courseTitle = searchParams.get("courseTitle");
  const mentorId = searchParams.get("mentorId");
  const mentorName = searchParams.get("mentorName");
  const subjectId = searchParams.get("subjectId");
  const sessionDate = date ? new Date(date).toLocaleString() : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!file || !date || !mentorId || !subjectId || !sessionId) return;

    setIsUploading(true);

    try {
      const token = await getTokenForBackend(getToken);
      if (!token) throw new Error("Not authenticated");

      const mid = Number(mentorId);
      const sid = Number(subjectId);
      if (Number.isNaN(mid) || Number.isNaN(sid)) {
        throw new Error("Invalid mentor or subject. Please schedule again from the mentor page.");
      }

      await enrollInSession(token, {
        mentorId: mid,
        subjectId: sid,
        sessionAt: date,
        durationMinutes: 60,
      });

      toast({
        title: "Session booked",
        description:
          "Your booking was created. Complete any payment steps from your dashboard.",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      if (
        message.toLowerCase().includes("overlap") ||
        message.toLowerCase().includes("past") ||
        message.toLowerCase().includes("not belong")
      ) {
        setConflictMessage(message);
        setConflictOpen(true);
      } else {
        toast({
          title: "Could not book session",
          description: message,
          variant: "destructive",
        });
      }
      setIsUploading(false);
    }
  };

  return (
    <div className="container max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Upload Bank Transfer Slip</CardTitle>
        </CardHeader>
        <form onSubmit={handleUpload}>
          <CardContent className="space-y-4">
            {mentorName && (
              <div className="text-sm font-medium">
                Session with: {mentorName}
              </div>
            )}
            {courseTitle && (
              <div className="text-sm text-muted-foreground">{courseTitle}</div>
            )}
            {sessionDate && (
              <div className="text-sm">
                <strong>Session:</strong> {sessionDate}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="slip">Bank Transfer Slip</Label>
              <Input
                id="slip"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Upload a clear image of your bank transfer slip. The backend will
              record your session; admins confirm payment from the admin
              dashboard.
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={!file || isUploading}
            >
              {isUploading ? "Submitting…" : "Confirm & book session"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scheduling conflict</DialogTitle>
            <DialogDescription>{conflictMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictOpen(false)}>
              OK
            </Button>
            <Button onClick={() => navigate("/")}>Browse mentors</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
