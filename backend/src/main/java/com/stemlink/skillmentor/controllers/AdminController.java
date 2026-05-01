package com.stemlink.skillmentor.controllers;

import com.stemlink.skillmentor.dto.MentorDTO;
import com.stemlink.skillmentor.dto.SubjectDTO;
import com.stemlink.skillmentor.dto.response.AdminSessionRowDTO;
import com.stemlink.skillmentor.dto.response.PaymentSlipResponseDTO;
import com.stemlink.skillmentor.entities.Mentor;
import com.stemlink.skillmentor.entities.Session;
import com.stemlink.skillmentor.entities.Subject;
import com.stemlink.skillmentor.dto.MeetingLinkUpdateDTO;
import com.stemlink.skillmentor.dto.response.AdminSubjectRowDTO;
import com.stemlink.skillmentor.services.MentorService;
import com.stemlink.skillmentor.services.SessionService;
import com.stemlink.skillmentor.services.SubjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN')")
public class AdminController extends AbstractController {

    private final MentorService mentorService;
    private final SubjectService subjectService;
    private final SessionService sessionService;
    private final ModelMapper modelMapper;

    /**
     * List subjects with mentor attribution (distinct from POST /admin/subjects which creates a subject).
     */
    @GetMapping("/subjects")
    public ResponseEntity<List<AdminSubjectRowDTO>> listSubjectsForAdmin() {
        return sendOkResponse(subjectService.getAllSubjectsForAdmin());
    }

    @PostMapping("/mentors")
    public ResponseEntity<Mentor> createMentor(@Valid @RequestBody MentorDTO dto) {
        Mentor mentor = modelMapper.map(dto, Mentor.class);
        if (mentor.getMentorId() == null || mentor.getMentorId().isBlank()) {
            mentor.setMentorId("mentor-" + UUID.randomUUID());
        }
        Mentor created = mentorService.createNewMentor(mentor);
        return sendCreatedResponse(created);
    }

    @PostMapping("/subjects")
    public ResponseEntity<Subject> createSubject(@Valid @RequestBody SubjectDTO dto) {
        Subject subject = modelMapper.map(dto, Subject.class);
        Subject saved = subjectService.addNewSubject(dto.getMentorId(), subject);
        return sendCreatedResponse(saved);
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<AdminSessionRowDTO>> listSessions() {
        return sendOkResponse(sessionService.getAllSessionsForAdmin());
    }

    @GetMapping("/sessions/{id}/payment-slip")
    public ResponseEntity<PaymentSlipResponseDTO> getPaymentSlip(@PathVariable Integer id) {
        return sendOkResponse(sessionService.getPaymentSlipForAdmin(id));
    }

    @PatchMapping("/sessions/{id}/confirm-payment")
    public ResponseEntity<Session> confirmPayment(@PathVariable Integer id) {
        return sendOkResponse(sessionService.confirmPaymentForAdmin(id));
    }

    @PatchMapping("/sessions/{id}/complete")
    public ResponseEntity<Session> completeSession(@PathVariable Integer id) {
        return sendOkResponse(sessionService.completeSessionForAdmin(id));
    }

    @PatchMapping("/sessions/{id}/meeting-link")
    public ResponseEntity<Session> meetingLink(
            @PathVariable Integer id,
            @Valid @RequestBody MeetingLinkUpdateDTO body) {
        return sendOkResponse(sessionService.updateMeetingLinkForAdmin(id, body.getMeetingLink()));
    }
}
