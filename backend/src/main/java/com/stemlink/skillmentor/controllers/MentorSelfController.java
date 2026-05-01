package com.stemlink.skillmentor.controllers;

import com.stemlink.skillmentor.dto.MentorSessionResourceCreateDTO;
import com.stemlink.skillmentor.dto.response.MentorPortalContextDTO;
import com.stemlink.skillmentor.dto.response.MentorPortalSessionDTO;
import com.stemlink.skillmentor.exceptions.SkillMentorException;
import com.stemlink.skillmentor.security.UserPrincipal;
import com.stemlink.skillmentor.services.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/me/mentor")
@RequiredArgsConstructor
@Validated
@PreAuthorize("isAuthenticated()")
public class MentorSelfController extends AbstractController {

    private final SessionService sessionService;

    @GetMapping("/context")
    public ResponseEntity<MentorPortalContextDTO> context(Authentication authentication) {
        UserPrincipal p = requireEmailPrincipal(authentication);
        return sessionService.getMentorPortalContext(p.getEmail())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<MentorPortalSessionDTO>> sessions(Authentication authentication) {
        UserPrincipal p = requireEmailPrincipal(authentication);
        return sendOkResponse(sessionService.getMentorPortalSessions(p.getEmail()));
    }

    @PatchMapping("/sessions/{sessionId}/complete")
    public ResponseEntity<MentorPortalSessionDTO> completeSession(
            Authentication authentication,
            @PathVariable Integer sessionId) {
        UserPrincipal p = requireEmailPrincipal(authentication);
        return sendOkResponse(sessionService.completeSessionAsMentor(p.getEmail(), sessionId));
    }

    @PostMapping("/sessions/{sessionId}/resources")
    public ResponseEntity<MentorPortalSessionDTO> addSessionResource(
            Authentication authentication,
            @PathVariable Integer sessionId,
            @Valid @RequestBody MentorSessionResourceCreateDTO body) {
        UserPrincipal p = requireEmailPrincipal(authentication);
        return sendOkResponse(sessionService.addMentorSessionResource(p.getEmail(), sessionId, body));
    }

    @DeleteMapping("/sessions/{sessionId}/resources/{resourceId}")
    public ResponseEntity<MentorPortalSessionDTO> deleteSessionResource(
            Authentication authentication,
            @PathVariable Integer sessionId,
            @PathVariable Long resourceId) {
        UserPrincipal p = requireEmailPrincipal(authentication);
        return sendOkResponse(
                sessionService.deleteMentorSessionResource(p.getEmail(), sessionId, resourceId));
    }

    private static UserPrincipal requireEmailPrincipal(Authentication authentication) {
        UserPrincipal p = (UserPrincipal) authentication.getPrincipal();
        if (p.getEmail() == null || p.getEmail().isBlank()) {
            throw new SkillMentorException(
                    "Your session has no email. Add \"email\" to your Clerk JWT template (skillmentor-auth).",
                    HttpStatus.BAD_REQUEST);
        }
        return p;
    }
}
