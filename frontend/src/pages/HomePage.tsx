import { useEffect, useMemo, useState } from "react";
import { MentorCard } from "@/components/MentorCard";
import { getPublicMentors } from "@/lib/api";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@clerk/clerk-react";
import { Search } from "lucide-react";
import type { Mentor } from "@/types";

const HOME_MENTORS_PAGE_SIZE = 150;

/** Text shown to users matches these fields plus each subject name/description. */
function mentorSearchHaystack(m: Mentor): string {
  const subjects = (m.subjects ?? [])
    .map(
      (s) =>
        `${s.subjectName ?? ""} ${(s.description ?? "").replace(/\s+/g, " ")}`,
    )
    .join(" ");
  return [
    `${m.firstName} ${m.lastName}`,
    m.title,
    m.profession,
    m.company,
    m.bio ?? "",
    subjects,
    String(m.id),
  ]
    .join(" ")
    .toLowerCase();
}

export default function HomePage() {
  const { isSignedIn } = useAuth();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [certifiedFilter, setCertifiedFilter] = useState<"all" | "certified">(
    "all",
  );
  const [sortBy, setSortBy] = useState<
    "recommended" | "name_asc" | "reviews_desc"
  >("recommended");

  useEffect(() => {
    getPublicMentors(0, HOME_MENTORS_PAGE_SIZE)
      .then((data) => setMentors(data.content))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const subjectOptions = useMemo(() => {
    const names = new Set<string>();
    for (const m of mentors) {
      for (const s of m.subjects ?? []) {
        const n = s.subjectName?.trim();
        if (n) names.add(n);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [mentors]);

  const filteredMentors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mentors.filter((m) => {
      if (certifiedFilter === "certified" && !m.isCertified) return false;
      if (subjectFilter !== "all") {
        const matchesSubject = (m.subjects ?? []).some(
          (s) => s.subjectName === subjectFilter,
        );
        if (!matchesSubject) return false;
      }
      if (!q) return true;
      return mentorSearchHaystack(m).includes(q);
    });
  }, [mentors, searchQuery, subjectFilter, certifiedFilter]);

  const sortedMentors = useMemo(() => {
    const list = [...filteredMentors];
    switch (sortBy) {
      case "name_asc":
        list.sort(
          (a, b) =>
            `${a.firstName} ${a.lastName}`.localeCompare(
              `${b.firstName} ${b.lastName}`,
              undefined,
              { sensitivity: "base" },
            ) || a.id - b.id,
        );
        break;
      case "reviews_desc":
        list.sort(
          (a, b) =>
            (b.positiveReviews ?? 0) - (a.positiveReviews ?? 0) || a.id - b.id,
        );
        break;
      case "recommended":
      default:
        list.sort(
          (a, b) =>
            (b.positiveReviews ?? 0) - (a.positiveReviews ?? 0) ||
            `${a.firstName} ${a.lastName}`.localeCompare(
              `${b.firstName} ${b.lastName}`,
              undefined,
              { sensitivity: "base" },
            ),
        );
        break;
    }
    return list;
  }, [filteredMentors, sortBy]);

  const filtersActive =
    searchQuery.trim() !== "" ||
    subjectFilter !== "all" ||
    certifiedFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSubjectFilter("all");
    setCertifiedFilter("all");
    setSortBy("recommended");
  };

  return (
    <div className="py-10">
      <div className="flex flex-col items-center justify-center space-y-8 text-center py-8">
        <div className="space-y-2">
          <h1 className="text-5xl tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Find your SkillMentor
          </h1>
          <p className="mx-auto text-gray-500 md:text-xl dark:text-gray-400 max-w-xs sm:max-w-full">
            Empower your career with personalized mentorship for AWS Developer{" "}
            <br className="hidden sm:block" />
            Associate, Interview Prep, and more.
          </p>
        </div>

        {isSignedIn ? (
          <Link to="/dashboard">
            <Button size="lg" className="text-xl">
              Go to Dashboard
            </Button>
          </Link>
        ) : (
          <Link to="/login">
            <Button size="lg" className="text-xl">
              Sign up to see all tutors
            </Button>
          </Link>
        )}
      </div>

      <div className="space-y-8 mt-8 container bg-background">
        <div className="space-y-2">
          <h1 className="lg:text-5xl md:text-4xl sm:text-3xl text-3xl">
            Schedule a Call
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Search by mentor name, topic, or company. Filter by course or
            certification, then pick a time from their profile.
          </p>
        </div>

        {!loading && mentors.length > 0 && (
          <div className="rounded-xl border bg-card/50 p-4 sm:p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="mentor-search" className="text-xs">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="mentor-search"
                    placeholder="Name, course, company, skill…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Course / subject</Label>
                <Select
                  value={subjectFilter}
                  onValueChange={setSubjectFilter}
                  disabled={subjectOptions.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All courses</SelectItem>
                    {subjectOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mentor type</Label>
                <Select
                  value={certifiedFilter}
                  onValueChange={(v) =>
                    setCertifiedFilter(v as "all" | "certified")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All mentors</SelectItem>
                    <SelectItem value="certified">Certified only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="space-y-1.5 w-full max-w-xs">
                <Label className="text-xs">Sort</Label>
                <Select
                  value={sortBy}
                  onValueChange={(v) =>
                    setSortBy(v as typeof sortBy)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recommended">Recommended</SelectItem>
                    <SelectItem value="reviews_desc">
                      Highest positive reviews
                    </SelectItem>
                    <SelectItem value="name_asc">Name (A–Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!filtersActive && sortBy === "recommended"}
                onClick={clearFilters}
              >
                Reset
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {sortedMentors.length}
              </span>{" "}
              of {mentors.length} mentor{mentors.length !== 1 ? "s" : ""}.
              {(filtersActive || sortBy !== "recommended") &&
                sortedMentors.length > 0 && (
                  <span className="text-muted-foreground/80">
                    {" "}
                    Adjust search or filters to narrow further.
                  </span>
                )}
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">
            Loading mentors...
          </div>
        ) : mentors.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No mentors available yet.
          </div>
        ) : sortedMentors.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed bg-muted/30">
            <p className="text-muted-foreground">
              No mentors match your search or filters.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={clearFilters}
            >
              Clear search &amp; filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedMentors.map((mentor) => (
              <MentorCard key={mentor.id} mentor={mentor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
