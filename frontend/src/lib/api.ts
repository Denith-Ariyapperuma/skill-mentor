import type {
  AdminSessionRow,
  AdminSubjectRow,
  Enrollment,
  Mentor,
  MentorPortalContext,
  MentorPortalSessionRow,
  MentorProfile,
  MentorReview,
} from "@/types";

const FILE_RESOURCE_MAX_BYTES = 4 * 1024 * 1024;

/** Matches backend `MentorSessionResourceCreateDTO` @Size caps. */
export const SESSION_RESOURCE_TITLE_MAX_CHARS = 255;
export const SESSION_RESOURCE_FILENAME_MAX_CHARS = 255;
export const SESSION_RESOURCE_LINK_URL_MAX_CHARS = 4096;

export type MentorResourceCreatePayload =
  | { title: string; kind: "LINK"; linkUrl: string }
  | {
      title: string;
      kind: "FILE";
      fileName: string;
      mimeType?: string;
      fileDataUrl: string;
    };

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

export async function parseApiError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.message === "string") return body.message;
    if (typeof body?.error === "string") return body.error;
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`;
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
    throw new Error(await parseApiError(res));
  }

  return res;
}

/** No mentor linked to login email → 404 → null. */
export async function getMentorPortalContext(
  token: string,
): Promise<MentorPortalContext | null> {
  const res = await fetch(`${API_BASE_URL}/api/v1/me/mentor/context`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

export async function getMentorPortalSessions(
  token: string,
): Promise<MentorPortalSessionRow[]> {
  const res = await fetchWithAuth("/api/v1/me/mentor/sessions", token);
  return res.json();
}

export async function mentorMarkSessionComplete(
  token: string,
  sessionId: number,
): Promise<MentorPortalSessionRow> {
  const res = await fetchWithAuth(
    `/api/v1/me/mentor/sessions/${sessionId}/complete`,
    token,
    { method: "PATCH" },
  );
  return res.json();
}

export async function mentorAddSessionResource(
  token: string,
  sessionId: number,
  body: MentorResourceCreatePayload,
): Promise<MentorPortalSessionRow> {
  const res = await fetchWithAuth(
    `/api/v1/me/mentor/sessions/${sessionId}/resources`,
    token,
    { method: "POST", body: JSON.stringify(body) },
  );
  return res.json();
}

export async function mentorDeleteSessionResource(
  token: string,
  sessionId: number,
  resourceId: number,
): Promise<MentorPortalSessionRow> {
  const res = await fetchWithAuth(
    `/api/v1/me/mentor/sessions/${sessionId}/resources/${resourceId}`,
    token,
    { method: "DELETE" },
  );
  return res.json();
}

export async function downloadSessionResourceFile(
  token: string,
  sessionId: number,
  resourceId: number,
): Promise<Blob> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/sessions/${sessionId}/resources/${resourceId}/download`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.blob();
}

export { FILE_RESOURCE_MAX_BYTES };

export async function getPublicMentors(
  page = 0,
  size = 10,
  name?: string,
  authToken?: string,
): Promise<{
  content: Mentor[];
  totalElements: number;
  totalPages: number;
}> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (name?.trim()) {
    params.set("name", name.trim());
  }
  const headers: HeadersInit = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const res = await fetch(
    `${API_BASE_URL}/api/v1/mentors?${params.toString()}`,
    { headers },
  );
  if (!res.ok) throw new Error("Failed to fetch mentors");
  return res.json();
}

export async function getMentorProfile(id: number): Promise<MentorProfile> {
  const res = await fetch(`${API_BASE_URL}/api/v1/mentors/${id}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

export async function getMentorReviews(
  mentorId: number,
): Promise<MentorReview[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/mentors/${mentorId}/reviews`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

export async function enrollInSession(
  token: string,
  data: {
    mentorId: number;
    subjectId: number;
    sessionAt: string;
    durationMinutes?: number;
    paymentSlipDataUrl: string;
  },
): Promise<Enrollment> {
  const res = await fetchWithAuth("/api/v1/sessions/enroll", token, {
    method: "POST",
    body: JSON.stringify({
      studentId: 0,
      mentorId: data.mentorId,
      subjectId: data.subjectId,
      sessionAt: data.sessionAt,
      durationMinutes: data.durationMinutes ?? 60,
      paymentSlipDataUrl: data.paymentSlipDataUrl,
    }),
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
  body: { rating: number; comment?: string },
): Promise<Enrollment> {
  const res = await fetchWithAuth(
    `/api/v1/sessions/${sessionId}/reviews`,
    token,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  return res.json();
}

export async function createAdminMentor(
  token: string,
  body: Record<string, unknown>,
): Promise<Mentor> {
  const res = await fetchWithAuth("/api/v1/admin/mentors", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function createAdminSubject(
  token: string,
  body: {
    subjectName: string;
    description: string;
    courseImageUrl?: string;
    mentorId: number;
  },
): Promise<unknown> {
  const res = await fetchWithAuth("/api/v1/admin/subjects", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function getAdminSubjects(
  token: string,
): Promise<AdminSubjectRow[]> {
  const res = await fetchWithAuth("/api/v1/admin/subjects", token);
  return res.json();
}

export async function updateSubject(
  token: string,
  subjectId: number,
  body: {
    subjectName: string;
    description: string;
    courseImageUrl?: string;
    mentorId: number;
  },
): Promise<void> {
  await fetchWithAuth(`/api/v1/subjects/${subjectId}`, token, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteSubject(
  token: string,
  subjectId: number,
): Promise<void> {
  await fetchWithAuth(`/api/v1/subjects/${subjectId}`, token, {
    method: "DELETE",
  });
}

export async function updateMentor(
  token: string,
  mentorPk: number,
  body: Record<string, unknown>,
): Promise<Mentor> {
  const res = await fetchWithAuth(`/api/v1/mentors/${mentorPk}`, token, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteMentor(
  token: string,
  mentorPk: number,
): Promise<void> {
  await fetchWithAuth(`/api/v1/mentors/${mentorPk}`, token, {
    method: "DELETE",
  });
}

export async function getAdminSessions(token: string): Promise<AdminSessionRow[]> {
  const res = await fetchWithAuth("/api/v1/admin/sessions", token);
  const rows: AdminSessionRow[] = await res.json();
  return rows.map((r) => ({
    ...r,
    hasPaymentSlip: Boolean(r.hasPaymentSlip),
  }));
}

export async function getAdminSessionPaymentSlip(
  token: string,
  sessionId: number,
): Promise<{ paymentSlipDataUrl: string | null }> {
  const res = await fetchWithAuth(
    `/api/v1/admin/sessions/${sessionId}/payment-slip`,
    token,
  );
  return res.json();
}

export async function adminConfirmPayment(
  token: string,
  sessionId: number,
): Promise<void> {
  await fetchWithAuth(
    `/api/v1/admin/sessions/${sessionId}/confirm-payment`,
    token,
    { method: "PATCH" },
  );
}

export async function adminCompleteSession(
  token: string,
  sessionId: number,
): Promise<void> {
  await fetchWithAuth(`/api/v1/admin/sessions/${sessionId}/complete`, token, {
    method: "PATCH",
  });
}

export async function adminSetMeetingLink(
  token: string,
  sessionId: number,
  meetingLink: string,
): Promise<void> {
  await fetchWithAuth(
    `/api/v1/admin/sessions/${sessionId}/meeting-link`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ meetingLink }),
    },
  );
}
