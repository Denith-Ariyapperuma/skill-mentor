import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { CalendarDays, Star } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { getMyEnrollments, submitSessionReview } from "@/lib/api";
import { getTokenForBackend } from "@/lib/clerk-token";
import type { Enrollment } from "@/types";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/hooks/use-toast";
import { Link } from "react-router";

export default function DashboardPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const router = useNavigate();
  const { toast } = useToast();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeEnrollment, setActiveEnrollment] = useState<Enrollment | null>(
    null,
  );
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchEnrollments() {
      if (!user) return;
      const token = await getTokenForBackend(getToken);
      if (!token) return;
      try {
        const data = await getMyEnrollments(token);
        setEnrollments(data);
      } catch (err) {
        console.error("Failed to fetch enrollments", err);
      }
    }

    if (isLoaded && isSignedIn) {
      fetchEnrollments();
    }
  }, [isLoaded, isSignedIn, getToken, user]);

  const openReview = (e: Enrollment) => {
    setActiveEnrollment(e);
    setRating(5);
    setReviewText("");
    setReviewOpen(true);
  };

  const submitReview = async () => {
    if (!activeEnrollment || !reviewText.trim()) return;
    const token = await getTokenForBackend(getToken);
    if (!token) return;
    setSubmitting(true);
    try {
      await submitSessionReview(token, activeEnrollment.id, {
        rating,
        review: reviewText.trim(),
      });
      toast({ title: "Thanks!", description: "Your review was submitted." });
      setReviewOpen(false);
      const data = await getMyEnrollments(token);
      setEnrollments(data);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Could not submit review",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    router("/login");
    return null;
  }

  if (!enrollments.length) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold tracking-tight mb-6">My Courses</h1>
        <p className="text-muted-foreground mb-6">No courses enrolled yet.</p>
        <Button asChild>
          <Link to="/">Browse mentors</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold tracking-tight mb-6">My Sessions</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {enrollments.map((enrollment) => (
          <div
            key={enrollment.id}
            className="rounded-2xl p-6 relative overflow-hidden bg-linear-to-br from-blue-500 to-blue-600 flex flex-col"
          >
            <div className="absolute top-4 right-4 flex flex-col gap-1 items-end">
              <StatusPill status={enrollment.paymentStatus} variant="payment" />
              <StatusPill
                status={enrollment.sessionStatus}
                variant="session"
              />
            </div>

            <div className="size-24 rounded-full bg-white/10 mb-4 shrink-0">
              {enrollment.mentorProfileImageUrl ? (
                <img
                  src={enrollment.mentorProfileImageUrl}
                  alt={enrollment.mentorName}
                  className="w-full h-full rounded-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {enrollment.mentorName.charAt(0)}
                </div>
              )}
            </div>

            <div className="space-y-1 flex-1">
              <h2 className="text-xl font-semibold text-white">
                {enrollment.subjectName}
              </h2>
              <p className="text-blue-100/80">
                Mentor: {enrollment.mentorName}
              </p>
              <div className="flex items-center text-blue-100/80 text-sm mt-2">
                <CalendarDays className="mr-2 h-4 w-4" />
                Session:{" "}
                {new Date(enrollment.sessionAt).toLocaleString()}
              </div>
              {enrollment.meetingLink && (
                <a
                  href={enrollment.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm text-white underline mt-2"
                >
                  Join meeting
                </a>
              )}
            </div>

            {enrollment.sessionStatus?.toLowerCase() === "completed" &&
              !enrollment.studentRating && (
                <Button
                  variant="secondary"
                  className="mt-4 w-full"
                  onClick={() => openReview(enrollment)}
                >
                  <Star className="size-4 mr-2" />
                  Write review
                </Button>
              )}
          </div>
        ))}
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate your session</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Rating (1–5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Review</Label>
              <textarea
                className="w-full min-h-24 border rounded-md p-2 text-sm"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share what worked well…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReview} disabled={submitting || !reviewText.trim()}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
