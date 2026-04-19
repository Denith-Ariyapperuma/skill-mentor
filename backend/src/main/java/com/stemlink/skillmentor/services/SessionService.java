package com.stemlink.skillmentor.services;

import com.stemlink.skillmentor.dto.EnrollSessionDTO;
import com.stemlink.skillmentor.dto.SessionDTO;
import com.stemlink.skillmentor.dto.SessionReviewDTO;
import com.stemlink.skillmentor.dto.response.AdminSessionResponseDTO;
import com.stemlink.skillmentor.entities.Session;
import com.stemlink.skillmentor.security.UserPrincipal;

import java.util.List;

public interface SessionService {

    Session createNewSession(SessionDTO sessionDTO);

    List<AdminSessionResponseDTO> getAllSessionsForAdmin();

    Session getSessionById(Integer id);

    Session updateSessionById(Integer id, SessionDTO updatedSessionDTO);

    void deleteSession(Integer id);

    Session confirmPayment(Integer id);

    Session markComplete(Integer id);

    Session updateMeetingLink(Integer id, String meetingLink);

    Session enrollSession(UserPrincipal userPrincipal, EnrollSessionDTO dto);

    List<Session> getSessionsByStudentEmail(String email);

    Session submitReview(UserPrincipal userPrincipal, Integer sessionId, SessionReviewDTO dto);
}
