import { useUser } from "@clerk/clerk-react";
import { Navigate, Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";
import { ToastProvider, ToastViewport } from "./ui/toast";
import { isClerkAppAdmin } from "@/lib/clerk-admin";

export function AdminLayout() {
  const { isLoaded, user } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading...
      </div>
    );
  }

  if (!isClerkAppAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Navigation />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
        <Footer />
      </div>
      <ToastViewport />
    </ToastProvider>
  );
}
