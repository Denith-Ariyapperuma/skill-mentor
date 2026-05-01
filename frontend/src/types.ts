export interface Subject {
  id: number;
  subjectName: string;
  description: string;
  courseImageUrl: string;
  /** Present on mentor profile API */
  enrollmentCount?: number;
}

export interface Mentor {
  id: number;
  mentorId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  title: string;
  profession: string;
  company: string;
  experienceYears: number;
  bio: string;
  profileImageUrl: string;
  positiveReviews: number;
  totalEnrollments: number;
  isCertified: boolean;
  startYear: string;
  subjects: Subject[];
}

export interface MentorProfile extends Mentor {
  totalStudentsTaught?: number;
  averageRating?: number | null;
  reviewCount?: number;
  subjectCount?: number;
  positiveReviewPercent?: number | null;
}

export interface MentorReview {
  reviewerName: string;
  rating: number;
  comment: string;
  reviewedAt: string;
}

export interface SessionResourceItem {
  id: number;
  title: string;
  kind: "link" | "file";
  linkUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}

export interface Enrollment {
  id: number;
  mentorId?: number;
  subjectId?: number;
  mentorName: string;
  mentorProfileImageUrl: string;
  subjectName: string;
  subjectDescription?: string;
  courseImageUrl?: string | null;
  sessionAt: string;
  durationMinutes: number;
  sessionStatus: string;
  paymentStatus:
    | "pending"
    | "confirmed"
    | "accepted"
    | "completed"
    | "cancelled";
  meetingLink: string | null;
  /** Materials added by mentor (links + uploads). */
  resources?: SessionResourceItem[];
}

export interface AdminSessionRow {
  id: number;
  studentName: string;
  mentorName: string;
  subjectName: string;
  sessionAt: string;
  durationMinutes: number;
  paymentStatus: string;
  sessionStatus: string;
  meetingLink: string | null;
  /** Whether a slip was stored at booking (load image via payment-slip endpoint). */
  hasPaymentSlip: boolean;
}

export interface AdminSubjectRow {
  id: number;
  subjectName: string;
  description: string;
  courseImageUrl: string | null;
  mentorId: number;
  mentorName: string;
}

export interface MentorPortalContext {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
}

export interface MentorPortalSessionRow {
  id: number;
  studentName: string;
  studentEmail: string;
  subjectName: string;
  sessionAt: string;
  durationMinutes: number;
  paymentStatus: string;
  sessionStatus: string;
  meetingLink: string | null;
  resources?: SessionResourceItem[];
}

export interface User {
  id: string;
  name: string;
  email: string;
}
