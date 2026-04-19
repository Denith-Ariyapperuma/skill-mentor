import type { Enrollment, Mentor, MentorProfile } from "@/types";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

async function parseErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  const msg =
    (body as { message?: string }).message ||
    (body as { error?: string }).error ||
    `HTTP ${res.status}`;
  return msg;
}

async function fetchWithAuth(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  return res;
}

// Public route without auth
export async function getPublicMentors(
  page = 0,
  size = 10,
): Promise<{ content: Mentor[]; totalElements: number; totalPages: number }> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/mentors?page=${page}&size=${size}`,
  );
  if (!res.ok) throw new Error("Failed to fetch mentors");
  return res.json();
}

export async function getMentorProfile(
  mentorId: number,
): Promise<MentorProfile> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/mentors/${mentorId}/profile`,
  );
  if (!res.ok) throw new Error("Failed to load mentor profile");
  return res.json();
}

// Enrollments
export async function enrollInSession(
  token: string,
  data: {
    mentorId: number;
    subjectId: number;
    sessionAt: string;
    durationMinutes?: number;
  },
): Promise<Enrollment> {
  const res = await fetchWithAuth("/api/v1/sessions/enroll", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getMyEnrollments(token: string): Promise<Enrollment[]> {
  const res = await fetchWithAuth("/api/v1/sessions/my-sessions", token);
  return res.json();
}

export async function submitSessionReview(
  token: string,
  sessionId: number,
  data: { rating: number; review: string },
): Promise<Enrollment> {
  const res = await fetchWithAuth(`/api/v1/sessions/${sessionId}/review`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}
