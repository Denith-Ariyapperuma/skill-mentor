import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getMentorProfile, getMentorReviews } from "@/lib/api";
import type { MentorProfile, MentorReview } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SchedulingModal } from "@/components/SchedulingModel";
import { ShieldCheck, Star, ArrowLeft, Calendar } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { SignupDialog } from "@/components/SignUpDialog";
import type { Mentor } from "@/types";

export default function MentorProfilePage() {
  const { mentorId } = useParams();
  const id = Number(mentorId);
  const { isSignedIn } = useAuth();
  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [reviews, setReviews] = useState<MentorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [prefSubject, setPrefSubject] = useState<number | undefined>();

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setErr("Invalid mentor");
      setLoading(false);
      return;
    }
    Promise.all([getMentorProfile(id), getMentorReviews(id)])
      .then(([p, rev]) => {
        setProfile(p);
        setReviews(rev);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="container py-10 space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (err || !profile) {
    return (
      <div className="container py-16 text-center space-y-4">
        <p className="text-destructive">{err ?? "Mentor not found"}</p>
        <Button asChild variant="outline">
          <Link to="/">Back</Link>
        </Button>
      </div>
    );
  }

  const mentorForModal: Mentor = {
    ...profile,
    subjects: profile.subjects ?? [],
  };

  const avg = profile.averageRating ?? 0;
  const reviewCount = profile.reviewCount ?? 0;

  const schedule = () => {
    if (!isSignedIn) {
      setSignupOpen(true);
      return;
    }
    setPrefSubject(undefined);
    setScheduleOpen(true);
  };

  const bookSubject = (subjectId: number) => {
    if (!isSignedIn) {
      setSignupOpen(true);
      return;
    }
    setPrefSubject(subjectId);
    setScheduleOpen(true);
  };

  const positivePct =
    profile.positiveReviewPercent != null
      ? Math.round(profile.positiveReviewPercent)
      : profile.positiveReviews ?? 0;

  return (
    <div className="pb-16">
      <div className="bg-linear-to-br from-slate-900 to-slate-800 text-white">
        <div className="container py-8 flex flex-col gap-6">
          <Button variant="ghost" className="text-white w-fit -ml-2" asChild>
            <Link to="/" className="gap-2">
              <ArrowLeft className="size-4" />
              Back to Mentors
            </Link>
          </Button>
          <div className="flex flex-col sm:flex-row gap-6 flex-1 w-full pb-4">
            <div className="shrink-0">
              {profile.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  alt=""
                  className="size-40 rounded-2xl object-cover border-4 border-white/20"
                />
              ) : (
                <div className="size-40 rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-bold">
                  {profile.firstName.charAt(0)}
                </div>
              )}
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap gap-2 items-center">
                <h1 className="text-3xl font-bold tracking-tight">
                  {profile.firstName} {profile.lastName}
                </h1>
                {profile.isCertified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium">
                    <ShieldCheck className="size-3.5" />
                    Certified
                  </span>
                )}
              </div>
              <p className="text-white/80">{profile.title}</p>
              <p className="text-white/70 text-sm">{profile.company}</p>
              <p className="text-white/60 text-sm flex items-center gap-2">
                <Calendar className="size-4" />
                Since {profile.startYear}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <StarRating value={avg} />
                <span className="text-sm text-white/80">
                  {(Number.isFinite(avg) ? avg : 0).toFixed(1)} ({reviewCount}{" "}
                  reviews)
                </span>
              </div>
              <Button
                className="mt-4 bg-primary text-primary-foreground"
                onClick={schedule}
                disabled={!profile.subjects?.length}
              >
                Schedule session
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-10 space-y-12">
        <section>
          <h2 className="text-xl font-semibold mb-3">About</h2>
          <p className="text-muted-foreground max-w-3xl whitespace-pre-wrap">
            {profile.bio}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {profile.experienceYears}+ years experience · {profile.profession}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Subjects taught</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(profile.subjects ?? []).map((s) => (
              <Card key={s.id} className="overflow-hidden flex flex-col">
                <div className="aspect-video bg-muted relative">
                  {s.courseImageUrl ? (
                    <img
                      src={s.courseImageUrl}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-2xl font-bold text-muted-foreground">
                      {s.subjectName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1 gap-2">
                  <h3 className="font-semibold">{s.subjectName}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line break-words leading-relaxed">
                    {s.description?.trim()
                      ? s.description
                      : "No description provided for this subject yet."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-auto">
                    {s.enrollmentCount ?? 0} students enrolled
                  </p>
                  <Button size="sm" onClick={() => bookSubject(s.id)}>
                    Book this subject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Students taught" value={profile.totalStudentsTaught ?? 0} />
            <Stat label="Years experience" value={profile.experienceYears} />
            <Stat label="Positive reviews" value={`${positivePct}%`} />
            <Stat label="Subjects" value={profile.subjectCount ?? 0} />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r, i) => (
                <Card key={`${r.reviewerName}-${i}`} className="p-4 space-y-2">
                  <div className="flex justify-between gap-4 flex-wrap">
                    <span className="font-medium">{r.reviewerName}</span>
                    <StarRating value={r.rating} />
                  </div>
                  <p className="text-sm text-muted-foreground">{r.comment}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.reviewedAt).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      <SchedulingModal
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        mentor={mentorForModal}
        prefilledSubjectId={prefSubject}
      />

      <SignupDialog isOpen={signupOpen} onClose={() => setSignupOpen(false)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </Card>
  );
}

function StarRating({ value }: { value: number }) {
  const safe = Number.isFinite(value) ? value : 0;
  const full = Math.round(safe);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < full ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
        />
      ))}
    </div>
  );
}
