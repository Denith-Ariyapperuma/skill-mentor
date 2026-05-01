package com.stemlink.skillmentor.controllers;


import com.stemlink.skillmentor.dto.SessionDTO;
import com.stemlink.skillmentor.dto.SessionReviewSubmitDTO;
import com.stemlink.skillmentor.dto.response.SessionResourceDownloadPayload;
import com.stemlink.skillmentor.dto.response.SessionResponseDTO;
import com.stemlink.skillmentor.entities.Session;
import com.stemlink.skillmentor.security.UserPrincipal;
import com.stemlink.skillmentor.services.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
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
    public List<Session> getAllSessions() {
        return sessionService.getAllSessions();
    }

    @GetMapping("{id}")
    public Session getSessionById(@PathVariable Long id) {
        return sessionService.getSessionById(id);
    }

    @PostMapping
    public Session createSession(@Valid @RequestBody SessionDTO sessionDTO) {
        return sessionService.createNewSession(sessionDTO);
    }

    @PutMapping("{id}")
    public Session updateSession(@PathVariable Long id, @Valid @RequestBody SessionDTO updatedSessionDTO) {
        return sessionService.updateSessionById(id, updatedSessionDTO);
    }

    @DeleteMapping("{id}")
    public void deleteSession(@PathVariable Long id) {
        sessionService.deleteSession(id);
    }

    // Enrollment endpoint for students to enroll in a session
    @PostMapping("/enroll")
    public ResponseEntity<SessionResponseDTO> enroll(
            @RequestBody SessionDTO sessionDTO,
            Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Session session = sessionService.enrollSession(userPrincipal, sessionDTO);
        return sendCreatedResponse(sessionService.toSessionResponseDTO(session));
    }

    @PostMapping("/{sessionId}/reviews")
    public ResponseEntity<SessionResponseDTO> submitReview(
            @PathVariable Integer sessionId,
            @Valid @RequestBody SessionReviewSubmitDTO body,
            Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Session session = sessionService.submitStudentReview(userPrincipal, sessionId, body);
        return sendOkResponse(sessionService.toSessionResponseDTO(session));
    }

    /**
     * Download a FILE resource uploaded for the session (student or assigned mentor).
     */
    @GetMapping("/{sessionId}/resources/{resourceId}/download")
    public ResponseEntity<byte[]> downloadSessionResource(
            @PathVariable Integer sessionId,
            @PathVariable Long resourceId,
            Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        SessionResourceDownloadPayload payload = sessionService
                .getSessionResourceDownloadForParticipant(principal, sessionId, resourceId);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(payload.filename(), StandardCharsets.UTF_8)
                .build();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(disposition);
        headers.setContentType(MediaType.parseMediaType(payload.contentType()));
        return ResponseEntity.ok().headers(headers).body(payload.bytes());
    }

    @GetMapping("/my-sessions")
    public ResponseEntity<List<SessionResponseDTO>> getMySessions(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        List<Session> sessions = sessionService.getSessionsByStudentEmail(userPrincipal.getEmail());
        List<SessionResponseDTO> response = sessions.stream()
                .map(sessionService::toSessionResponseDTO)
                .collect(Collectors.toList());
        return sendOkResponse(response);
    }
}
