import { BrowserRouter, Routes, Route } from "react-router";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import PaymentPage from "@/pages/PaymentPage";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { AdminLayout } from "@/components/AdminLayout";
import CreateSubjectPage from "@/pages/admin/CreateSubjectPage";
import CreateMentorPage from "@/pages/admin/CreateMentorPage";
import ManageBookingsPage from "@/pages/admin/ManageBookingsPage";
import { Navigate } from "react-router";
import MentorProfilePage from "@/pages/MentorProfilePage";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/mentors/:mentorId" element={<MentorProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <>
                <SignedIn>
                  <DashboardPage />
                </SignedIn>
                <SignedOut>
                  <LoginPage />
                </SignedOut>
              </>
            }
          />
          <Route
            path="/payment/:sessionId"
            element={
              <>
                <SignedIn>
                  <PaymentPage />
                </SignedIn>
                <SignedOut>
                  <LoginPage />
                </SignedOut>
              </>
            }
          />
          {/* Admin Routes */}
          <Route element={<AdminLayout />}>
             <Route path="/admin" element={<Navigate to="/admin/bookings" replace />} />
             <Route path="/admin/subjects/new" element={<CreateSubjectPage />} />
             <Route path="/admin/mentors/new" element={<CreateMentorPage />} />
             <Route path="/admin/bookings" element={<ManageBookingsPage />} />
          </Route>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
