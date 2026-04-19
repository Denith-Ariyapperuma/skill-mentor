import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  BookOpen, 
  UserPlus, 
  CalendarCheck,
  ChevronRight
} from "lucide-react";

const sidebarLinks = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard
  },
  {
    name: "Create Subject",
    href: "/admin/subjects/new",
    icon: BookOpen
  },
  {
    name: "Manage Mentors",
    href: "/admin/mentors/new",
    icon: UserPlus
  },
  {
    name: "Manage Bookings",
    href: "/admin/bookings",
    icon: CalendarCheck
  }
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 border-r border-white/10 bg-black hidden md:block">
      <nav className="flex flex-col gap-2 p-4">
        {sidebarLinks.map((link) => {
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.name}
              to={link.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5",
                isActive 
                  ? "bg-white/10 text-white" 
                  : "text-white/60"
              )}
            >
              <link.icon className={cn(
                "size-5",
                isActive ? "text-primary" : "text-white/40 group-hover:text-white/60"
              )} />
              {link.name}
              {isActive && (
                <ChevronRight className="size-4 ml-auto text-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
