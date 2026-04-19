export interface Subject {
  id: number;
  subjectName: string;
  description: string;
  courseImageUrl: string;
}

export interface Mentor {
  id: number;
  mentorId: string;
  firstName: string;
  lastName: string;
  email: string;
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

export interface MentorProfileSubject {
  id: number;
  subjectName: string;
  description: string;
  courseImageUrl: string;
  enrollmentCount: number;
}

export interface MentorReview {
  studentName: string;
  rating: number;
  review: string;
  sessionAt: string;
}

export interface MentorProfile {
  id: number;
  mentorId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  title: string;
  profession: string;
  company: string;
  experienceYears: number;
  bio: string;
  profileImageUrl: string;
  isCertified: boolean;
  startYear: string;
  averageRating: number | null;
  reviewCount: number;
  totalStudentsTaught: number;
  subjectsTaughtCount: number;
  positiveReviewPercent: number;
  subjects: MentorProfileSubject[];
  recentReviews: MentorReview[];
}

export interface Enrollment {
  id: number;
  mentorId: number;
  mentorName: string;
  mentorProfileImageUrl: string;
  subjectId: number;
  subjectName: string;
  sessionAt: string;
  durationMinutes: number;
  sessionStatus: string;
  paymentStatus: string;
  meetingLink: string | null;
  studentRating: number | null;
  studentReview: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
}
