package com.stemlink.skillmentor.controllers;


import com.stemlink.skillmentor.dto.EnrollSessionDTO;
import com.stemlink.skillmentor.dto.MeetingLinkRequest;
import com.stemlink.skillmentor.dto.SessionDTO;
import com.stemlink.skillmentor.dto.SessionReviewDTO;
import com.stemlink.skillmentor.dto.response.AdminSessionResponseDTO;
import com.stemlink.skillmentor.dto.response.SessionResponseDTO;
import com.stemlink.skillmentor.entities.Session;
import com.stemlink.skillmentor.security.UserPrincipal;
import com.stemlink.skillmentor.services.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping(path = "/api/v1/sessions")
@RequiredArgsConstructor
@Validated
@PreAuthorize("isAuthenticated()")
public class SessionController extends AbstractController {

    private final SessionService sessionService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AdminSessionResponseDTO>> getAllSessionsForAdmin() {
        return sendOkResponse(sessionService.getAllSessionsForAdmin());
    }

    @GetMapping("{id}")
    public Session getSessionById(@PathVariable Integer id) {
        return sessionService.getSessionById(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Session createSession(@Valid @RequestBody SessionDTO sessionDTO) {
        return sessionService.createNewSession(sessionDTO);
    }

    @PutMapping("{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Session updateSession(@PathVariable Integer id, @Valid @RequestBody SessionDTO updatedSessionDTO) {
        return sessionService.updateSessionById(id, updatedSessionDTO);
    }

    @DeleteMapping("{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteSession(@PathVariable Integer id) {
        sessionService.deleteSession(id);
    }

    @PostMapping("/enroll")
    public ResponseEntity<SessionResponseDTO> enroll(
            @Valid @RequestBody EnrollSessionDTO enrollSessionDTO,
            Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Session session = sessionService.enrollSession(userPrincipal, enrollSessionDTO);
        return sendCreatedResponse(toSessionResponseDTO(session));
    }

    @GetMapping("/my-sessions")
    public ResponseEntity<List<SessionResponseDTO>> getMySessions(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        List<Session> sessions = sessionService.getSessionsByStudentEmail(userPrincipal.getEmail());
        List<SessionResponseDTO> response = sessions.stream()
                .map(this::toSessionResponseDTO)
                .collect(Collectors.toList());
        return sendOkResponse(response);
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<SessionResponseDTO> submitReview(
            @PathVariable Integer id,
            @Valid @RequestBody SessionReviewDTO dto,
            Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Session session = sessionService.submitReview(userPrincipal, id, dto);
        return sendOkResponse(toSessionResponseDTO(session));
    }

    @PatchMapping("/{id}/confirm-payment")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SessionResponseDTO> confirmPayment(@PathVariable Integer id) {
        Session session = sessionService.confirmPayment(id);
        return sendOkResponse(toSessionResponseDTO(session));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SessionResponseDTO> markComplete(@PathVariable Integer id) {
        Session session = sessionService.markComplete(id);
        return sendOkResponse(toSessionResponseDTO(session));
    }

    @PatchMapping("/{id}/meeting-link")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SessionResponseDTO> updateMeetingLink(
            @PathVariable Integer id,
            @Valid @RequestBody MeetingLinkRequest body) {
        Session session = sessionService.updateMeetingLink(id, body.getMeetingLink());
        return sendOkResponse(toSessionResponseDTO(session));
    }

    private SessionResponseDTO toSessionResponseDTO(Session session) {
        SessionResponseDTO dto = new SessionResponseDTO();
        dto.setId(session.getId());
        dto.setMentorId(session.getMentor().getId());
        dto.setMentorName(session.getMentor().getFirstName() + " " + session.getMentor().getLastName());
        dto.setMentorProfileImageUrl(session.getMentor().getProfileImageUrl());
        dto.setSubjectId(session.getSubject().getId());
        dto.setSubjectName(session.getSubject().getSubjectName());
        dto.setSessionAt(session.getSessionAt());
        dto.setDurationMinutes(session.getDurationMinutes());
        dto.setSessionStatus(session.getSessionStatus());
        dto.setPaymentStatus(session.getPaymentStatus());
        dto.setMeetingLink(session.getMeetingLink());
        dto.setStudentRating(session.getStudentRating());
        dto.setStudentReview(session.getStudentReview());
        return dto;
    }
}
