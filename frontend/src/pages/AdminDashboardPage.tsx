import { Link } from "react-router";
import { CalendarRange, Users, BookMarked } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tiles = [
  {
    to: "/admin/bookings",
    title: "Bookings",
    description:
      "View sessions, payment slips, confirm payments, and meeting links.",
    icon: CalendarRange,
  },
  {
    to: "/admin/mentors",
    title: "Mentors",
    description: "Browse mentors, edit profiles, or open the full list.",
    icon: Users,
  },
  {
    to: "/admin/subjects",
    title: "Subjects",
    description: "Manage courses: search, edit, assign mentors, delete.",
    icon: BookMarked,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Choose a section below. Open <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/admin</code>{" "}
          anytime to return here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map(({ to, title, description, icon: Icon }) => (
          <Link key={to} to={to} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card
              className={cn(
                "h-full transition-colors border-muted",
                "hover:border-primary/40 hover:bg-accent/30",
              )}
            >
              <CardHeader className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                  <Icon className="size-6" aria-hidden />
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {title}
                </CardTitle>
                <CardDescription className="text-sm leading-snug">
                  {description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
