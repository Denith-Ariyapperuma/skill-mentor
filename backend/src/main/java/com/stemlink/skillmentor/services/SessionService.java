package com.stemlink.skillmentor.services;

import com.stemlink.skillmentor.dto.MentorSessionResourceCreateDTO;
import com.stemlink.skillmentor.dto.SessionDTO;
import com.stemlink.skillmentor.dto.SessionReviewSubmitDTO;
import com.stemlink.skillmentor.dto.response.AdminSessionRowDTO;
import com.stemlink.skillmentor.dto.response.MentorPortalContextDTO;
import com.stemlink.skillmentor.dto.response.MentorPortalSessionDTO;
import com.stemlink.skillmentor.dto.response.PaymentSlipResponseDTO;
import com.stemlink.skillmentor.dto.response.SessionResourceDownloadPayload;
import com.stemlink.skillmentor.dto.response.SessionResponseDTO;
import com.stemlink.skillmentor.entities.Session;
import com.stemlink.skillmentor.security.UserPrincipal;

import java.util.List;
import java.util.Optional;

public interface SessionService {

    Session createNewSession(SessionDTO sessionDTO);
    List<Session> getAllSessions();
    Session getSessionById(Long id);
    Session updateSessionById(Long id, SessionDTO updatedSessionDTO);
    void deleteSession(Long id);

    // Frontend enrollment flow — student is resolved from the Clerk JWT
    Session enrollSession(UserPrincipal userPrincipal, SessionDTO sessionDTO);
    List<Session> getSessionsByStudentEmail(String email);

    List<AdminSessionRowDTO> getAllSessionsForAdmin();

    PaymentSlipResponseDTO getPaymentSlipForAdmin(Integer sessionId);

    Session confirmPaymentForAdmin(Integer sessionId);

    Session completeSessionForAdmin(Integer sessionId);

    Session updateMeetingLinkForAdmin(Integer sessionId, String meetingLink);

    Session submitStudentReview(UserPrincipal principal, Integer sessionId, SessionReviewSubmitDTO dto);

    /** Signed-in email matches a mentor row (admin-created profile). */
    Optional<MentorPortalContextDTO> getMentorPortalContext(String email);

    /** Paid & confirmed bookings only for this mentor. */
    List<MentorPortalSessionDTO> getMentorPortalSessions(String email);

    /**
     * Mentor marks session completed only after scheduled end ({@code sessionAt + duration}); must own session and payment confirmed.
     */
    MentorPortalSessionDTO completeSessionAsMentor(String mentorEmail, Integer sessionId);

    SessionResponseDTO toSessionResponseDTO(Session session);

    MentorPortalSessionDTO addMentorSessionResource(
            String mentorEmail,
            Integer sessionId,
            MentorSessionResourceCreateDTO dto);

    MentorPortalSessionDTO deleteMentorSessionResource(
            String mentorEmail,
            Integer sessionId,
            Long resourceId);

    SessionResourceDownloadPayload getSessionResourceDownloadForParticipant(
            UserPrincipal principal,
            Integer sessionId,
            Long resourceId);
}
