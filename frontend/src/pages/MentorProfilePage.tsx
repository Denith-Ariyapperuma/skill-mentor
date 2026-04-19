import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Building2, Calendar, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMentorProfile } from "@/lib/api";
import type { MentorProfile } from "@/types";
import { SchedulingModal } from "@/components/SchedulingModel";
import { SignupDialog } from "@/components/SignUpDialog";
import { useAuth } from "@clerk/clerk-react";
import type { Mentor } from "@/types";

function profileToMentor(p: MentorProfile): Mentor {
  return {
    id: p.id,
    mentorId: p.mentorId,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    title: p.title,
    profession: p.profession,
    company: p.company,
    experienceYears: p.experienceYears,
    bio: p.bio,
    profileImageUrl: p.profileImageUrl,
    positiveReviews: p.positiveReviewPercent,
    totalEnrollments: Number(p.totalStudentsTaught),
    isCertified: p.isCertified ?? false,
    startYear: p.startYear,
    subjects: p.subjects.map((s) => ({
      id: s.id,
      subjectName: s.subjectName,
      description: s.description,
      courseImageUrl: s.courseImageUrl,
    })),
  };
}

export default function MentorProfilePage() {
  const { mentorId } = useParams();
  const id = Number(mentorId);
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [bookingSubjectId, setBookingSubjectId] = useState<number | undefined>();

  useEffect(() => {
    if (!mentorId || Number.isNaN(id)) {
      setError("Invalid mentor");
      setLoading(false);
      return;
    }
    getMentorProfile(id)
      .then(setProfile)
      .catch(() => setError("Could not load this mentor."))
      .finally(() => setLoading(false));
  }, [mentorId, id]);

  const mentorForModal = useMemo(
    () => (profile ? profileToMentor(profile) : null),
    [profile],
  );

  const openSchedule = (subjectId?: number) => {
    if (!isSignedIn) {
      setSignupOpen(true);
      return;
    }
    setBookingSubjectId(subjectId);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        Loading mentor…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container py-20 text-center space-y-4">
        <p className="text-muted-foreground">{error ?? "Not found"}</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back home
        </Button>
      </div>
    );
  }

  const name = `${profile.firstName} ${profile.lastName}`;

  return (
    <div className="pb-16">
      <div className="border-b bg-muted/30">
        <div className="container py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Mentors
          </Link>
        </div>
      </div>

      <div className="container pt-10 space-y-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:items-start">
          <div className="shrink-0 mx-auto lg:mx-0">
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt={name}
                className="w-40 h-40 md:w-52 md:h-52 rounded-3xl object-cover object-top shadow-lg"
              />
            ) : (
              <div className="w-40 h-40 md:w-52 md:h-52 rounded-3xl bg-muted flex items-center justify-center text-4xl font-bold">
                {profile.firstName.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {name}
              </h1>
              {profile.isCertified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
                  <ShieldCheck className="size-3.5" />
                  Certified
                </span>
              )}
            </div>
            <p className="text-lg text-muted-foreground">{profile.title}</p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-4" />
                {profile.company} · {profile.profession}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-4" />
                Since {profile.startYear}
              </span>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-2 pt-2">
              <div className="flex items-center gap-1">
                <Star className="size-5 fill-amber-400 text-amber-400" />
                <span className="font-semibold">
                  {profile.averageRating != null
                    ? profile.averageRating.toFixed(1)
                    : "—"}
                </span>
                <span className="text-muted-foreground text-sm">
                  ({profile.reviewCount} reviews)
                </span>
              </div>
            </div>
            <div className="pt-4 flex justify-center lg:justify-start">
              <Button size="lg" onClick={() => openSchedule()}>
                Schedule Session
              </Button>
            </div>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">About</h2>
          <p className="text-muted-foreground max-w-3xl leading-relaxed whitespace-pre-wrap">
            {profile.bio}
          </p>
          <p className="text-sm text-muted-foreground">
            {profile.experienceYears} years of professional experience.
          </p>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Students taught", value: profile.totalStudentsTaught },
            { label: "Years experience", value: profile.experienceYears },
            { label: "Positive reviews", value: `${profile.positiveReviewPercent}%` },
            { label: "Subjects", value: profile.subjectsTaughtCount },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{item.value}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {item.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Subjects taught</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {profile.subjects.map((sub) => (
              <Card key={sub.id} className="overflow-hidden flex flex-col">
                <div className="h-36 bg-muted relative">
                  {sub.courseImageUrl ? (
                    <img
                      src={sub.courseImageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                      {sub.subjectName.charAt(0)}
                    </div>
                  )}
                </div>
                <CardContent className="pt-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-lg">{sub.subjectName}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mt-1 flex-1">
                    {sub.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {sub.enrollmentCount} students enrolled
                  </p>
                  <Button
                    className="mt-4 w-full"
                    variant="secondary"
                    onClick={() => openSchedule(sub.id)}
                  >
                    Book this subject
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {profile.recentReviews.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Reviews</h2>
            <div className="space-y-4">
              {profile.recentReviews.map((r, i) => (
                <Card key={`${r.sessionAt}-${i}`}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="font-medium">{r.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.sessionAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            className={`size-4 ${
                              j < r.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">{r.review}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      {mentorForModal && (
        <SchedulingModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          mentor={mentorForModal}
          defaultSubjectId={bookingSubjectId}
        />
      )}

      <SignupDialog
        isOpen={signupOpen}
        onClose={() => setSignupOpen(false)}
      />
    </div>
  );
}
