import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import PaymentPage from "@/pages/PaymentPage";
import MentorProfilePage from "@/pages/MentorProfilePage";
import AdminLayout from "@/components/AdminLayout";
import CreateMentorPage from "@/pages/CreateMentorPage";
import CreateSubjectPage from "@/pages/CreateSubjectPage";
import ManageBookingsPage from "@/pages/ManageBookingsPage";
import AdminMentorsPage from "@/pages/AdminMentorsPage";
import AdminSubjectsPage from "@/pages/AdminSubjectsPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import MentorDashboardPage from "@/pages/MentorDashboardPage";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

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
          <Route
            path="/mentor"
            element={
              <>
                <SignedIn>
                  <MentorDashboardPage />
                </SignedIn>
                <SignedOut>
                  <LoginPage />
                </SignedOut>
              </>
            }
          />
          <Route
            path="/admin"
            element={
              <>
                <SignedIn>
                  <AdminLayout />
                </SignedIn>
                <SignedOut>
                  <Navigate to="/login" replace />
                </SignedOut>
              </>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="mentors" element={<AdminMentorsPage />} />
            <Route path="mentors/create" element={<CreateMentorPage />} />
            <Route path="subjects" element={<AdminSubjectsPage />} />
            <Route path="subjects/create" element={<CreateSubjectPage />} />
            <Route path="bookings" element={<ManageBookingsPage />} />
          </Route>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
