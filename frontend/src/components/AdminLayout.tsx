import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAuth, useUser } from "@clerk/clerk-react";

function isAdminRole(metadata: unknown): boolean {
  const role =
    typeof metadata === "object" &&
    metadata !== null &&
    "role" in metadata &&
    typeof (metadata as { role: unknown }).role === "string"
      ? (metadata as { role: string }).role
      : undefined;
  return role?.toUpperCase() === "ADMIN";
}

export default function AdminLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      navigate("/login", { replace: true });
      return;
    }
    if (!isAdminRole(user?.publicMetadata)) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoaded, isSignedIn, user?.publicMetadata, navigate]);

  if (!isLoaded || !isSignedIn || !isAdminRole(user?.publicMetadata)) {
    return (
      <div className="container py-16 text-center text-muted-foreground">
        Checking access…
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 overflow-auto">
      <Outlet />
    </div>
  );
}
