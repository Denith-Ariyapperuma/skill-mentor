/** Mirrors backend MentorDTO @Size caps (characters). */
export const MENTOR = {
  firstName: { max: 50 },
  lastName: { max: 50 },
  email: { max: 100 },
  phoneNumber: { max: 20 },
  title: { max: 100 },
  profession: { max: 100 },
  company: { max: 100 },
  bio: { max: 255 },
  profileImageUrl: { max: 2048 },
  startYear: { max: 10 },
} as const;

/** Mirrors backend SubjectDTO @Size caps. */
export const SUBJECT = {
  subjectName: { min: 5, max: 255 },
  description: { min: 5, max: 255 },
  courseImageUrl: { max: 2048 },
} as const;
