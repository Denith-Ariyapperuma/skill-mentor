package com.stemlink.skillmentor.services.impl;

import com.stemlink.skillmentor.entities.Session;
import com.stemlink.skillmentor.entities.SessionResource;
import com.stemlink.skillmentor.entities.Student;
import com.stemlink.skillmentor.entities.Mentor;
import com.stemlink.skillmentor.entities.Subject;
import com.stemlink.skillmentor.exceptions.SkillMentorException;
import com.stemlink.skillmentor.respositories.SessionRepository;
import com.stemlink.skillmentor.respositories.SessionResourceRepository;
import com.stemlink.skillmentor.respositories.StudentRepository;
import com.stemlink.skillmentor.respositories.MentorRepository;
import com.stemlink.skillmentor.respositories.SubjectRepository;
import com.stemlink.skillmentor.dto.MentorSessionResourceCreateDTO;
import com.stemlink.skillmentor.dto.SessionDTO;
import com.stemlink.skillmentor.dto.SessionReviewSubmitDTO;
import com.stemlink.skillmentor.dto.response.AdminSessionRowDTO;
import com.stemlink.skillmentor.dto.response.MentorPortalContextDTO;
import com.stemlink.skillmentor.dto.response.MentorPortalSessionDTO;
import com.stemlink.skillmentor.dto.response.PaymentSlipResponseDTO;
import com.stemlink.skillmentor.dto.response.SessionResourceDownloadPayload;
import com.stemlink.skillmentor.dto.response.SessionResourceItemDTO;
import com.stemlink.skillmentor.dto.response.SessionResponseDTO;
import com.stemlink.skillmentor.security.UserPrincipal;
import com.stemlink.skillmentor.services.SessionService;
import com.stemlink.skillmentor.utils.ValidationUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SessionServiceImpl implements SessionService {

    private static final int MAX_PAYMENT_SLIP_CHARS = 6_000_000;
    private static final String RES_KIND_LINK = "LINK";
    private static final String RES_KIND_FILE = "FILE";

    private final SessionRepository sessionRepository;
    private final SessionResourceRepository sessionResourceRepository;
    private final StudentRepository studentRepository;
    private final MentorRepository mentorRepository;
    private final SubjectRepository subjectRepository;
    private final ModelMapper modelMapper;

    @Value("${skillmentor.session-resource.max-decoded-bytes:4194304}")
    private int maxSessionResourceDecodedBytes;

    public Session createNewSession(SessionDTO sessionDTO) {
        // Fetch the related entities by their IDs
        try {
            Student student = studentRepository.findById(sessionDTO.getStudentId()).orElseThrow(
                    () -> new SkillMentorException("Student not found", HttpStatus.NOT_FOUND)
            );
            Mentor mentor = mentorRepository.findById(sessionDTO.getMentorId()).orElseThrow(
                    () -> new SkillMentorException("Mentor not found", HttpStatus.NOT_FOUND)
            );
            Subject subject = subjectRepository.findById(sessionDTO.getSubjectId()).orElseThrow(
                    () -> new SkillMentorException("Subject not found", HttpStatus.NOT_FOUND)
            );
            if (!subject.getMentor().getId().equals(mentor.getId())) {
                throw new SkillMentorException("Subject does not belong to the selected mentor", HttpStatus.BAD_REQUEST);
            }

            // Checking availability
            ValidationUtils.validateMentorAvailability(mentor, sessionDTO.getSessionAt(), sessionDTO.getDurationMinutes());
            ValidationUtils.validateStudentAvailability(student, sessionDTO.getSessionAt(), sessionDTO.getDurationMinutes());


            // Create and populate the Session entity
//        Session session = new Session();
//        session.setSessionAt(sessionDTO.getSessionAt());
//        session.setDurationMinutes(sessionDTO.getDurationMinutes());
//        session.setSessionStatus(sessionDTO.getSessionStatus());
//        session.setMeetingLink(sessionDTO.getMeetingLink());
//        session.setSessionNotes(sessionDTO.getSessionNotes());
//        session.setStudentReview(sessionDTO.getStudentReview());
//        session.setStudentRating(sessionDTO.getStudentRating());

            // using model mapper
            Session session = modelMapper.map(sessionDTO, Session.class);
            session.setStudent(student);
            session.setMentor(mentor);
            session.setSubject(subject);


            return sessionRepository.save(session);
        } catch (SkillMentorException skillMentorException) {
            log.error("Dependencies not found to map: {}, Failed to create new session", skillMentorException.getMessage());
            throw skillMentorException;
        } catch (Exception exception) {
            log.error("Failed to create session", exception);
            throw new SkillMentorException("Failed to create new session", HttpStatus.INTERNAL_SERVER_ERROR);
        }

    }

    public List<Session> getAllSessions() {
        return sessionRepository.findAll(); // SELECT * FROM sessions
    }

    public Session getSessionById(Long id) {
        return sessionRepository.findById(Math.toIntExact(id))
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));
    }

    public Session updateSessionById(Long id, SessionDTO updatedSessionDTO) {
        Session session = sessionRepository.findById(Math.toIntExact(id))
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));

        // source -> destination
        modelMapper.map(updatedSessionDTO, session);

        // Update the related entities
        if (updatedSessionDTO.getStudentId() != null) {
            Student student = studentRepository.findById(updatedSessionDTO.getStudentId()).get();
            session.setStudent(student);
        }
        if (updatedSessionDTO.getMentorId() != null) {
            Mentor mentor = mentorRepository.findById(updatedSessionDTO.getMentorId())
                    .orElseThrow(() -> new SkillMentorException("Mentor not found", HttpStatus.NOT_FOUND));
            session.setMentor(mentor);
        }
        if (updatedSessionDTO.getSubjectId() != null) {
            Subject subject = subjectRepository.findById(updatedSessionDTO.getSubjectId()).get();
            session.setSubject(subject);
        }

//        // Update other fields
//        if (updatedSessionDTO.getSessionAt() != null) {
//            session.setSessionAt(updatedSessionDTO.getSessionAt());
//        }
//        if (updatedSessionDTO.getDurationMinutes() != null) {
//            session.setDurationMinutes(updatedSessionDTO.getDurationMinutes());
//        }
//        if (updatedSessionDTO.getSessionStatus() != null) {
//            session.setSessionStatus(updatedSessionDTO.getSessionStatus());
//        }
//        if (updatedSessionDTO.getMeetingLink() != null) {
//            session.setMeetingLink(updatedSessionDTO.getMeetingLink());
//        }
//        if (updatedSessionDTO.getSessionNotes() != null) {
//            session.setSessionNotes(updatedSessionDTO.getSessionNotes());
//        }
//        if (updatedSessionDTO.getStudentReview() != null) {
//            session.setStudentReview(updatedSessionDTO.getStudentReview());
//        }
//        if (updatedSessionDTO.getStudentRating() != null) {
//            session.setStudentRating(updatedSessionDTO.getStudentRating());
//        }

        return sessionRepository.save(session);
    }

    public void deleteSession(Long id) {
        sessionRepository.deleteById(Math.toIntExact(id));
    }

    public Session enrollSession(UserPrincipal userPrincipal, SessionDTO sessionDTO) {
        Student student = studentRepository.findByEmail(userPrincipal.getEmail())
                .orElseGet(() -> {
                    Student s = new Student();
                    s.setStudentId(userPrincipal.getId());
                    s.setEmail(userPrincipal.getEmail());
                    s.setFirstName(userPrincipal.getFirstName());
                    s.setLastName(userPrincipal.getLastName());
                    return studentRepository.save(s);
                });

        Mentor mentor = mentorRepository.findById(sessionDTO.getMentorId())
                .orElseThrow(() -> new SkillMentorException("Mentor not found", HttpStatus.NOT_FOUND));
        Subject subject = subjectRepository.findById(sessionDTO.getSubjectId())
                .orElseThrow(() -> new SkillMentorException("Subject not found", HttpStatus.NOT_FOUND));

        if (!subject.getMentor().getId().equals(mentor.getId())) {
            throw new SkillMentorException("Subject does not belong to the selected mentor", HttpStatus.BAD_REQUEST);
        }

        Date sessionAt = sessionDTO.getSessionAt();
        int durationMinutes = sessionDTO.getDurationMinutes() != null ? sessionDTO.getDurationMinutes() : 60;

        if (sessionAt.before(new Date())) {
            throw new SkillMentorException("Session date and time must be in the future.", HttpStatus.BAD_REQUEST);
        }

        validateNoDoubleBooking(student.getId(), mentor.getId(), subject.getId(), sessionAt, durationMinutes);

        String slipRaw = sessionDTO.getPaymentSlipDataUrl();
        if (slipRaw == null || slipRaw.isBlank()) {
            throw new SkillMentorException("Payment slip upload is required to complete booking.", HttpStatus.BAD_REQUEST);
        }
        String slip = slipRaw.trim();
        if (!slip.startsWith("data:image/")) {
            throw new SkillMentorException("Payment slip must be an image.", HttpStatus.BAD_REQUEST);
        }
        if (!slip.contains(";base64,")) {
            throw new SkillMentorException("Invalid payment slip format.", HttpStatus.BAD_REQUEST);
        }
        if (slip.length() > MAX_PAYMENT_SLIP_CHARS) {
            throw new SkillMentorException("Payment slip image is too large.", HttpStatus.PAYLOAD_TOO_LARGE);
        }

        Session session = new Session();
        session.setStudent(student);
        session.setMentor(mentor);
        session.setSubject(subject);
        session.setSessionAt(sessionAt);
        session.setDurationMinutes(durationMinutes);
        session.setSessionStatus("scheduled");
        session.setPaymentStatus("pending");
        session.setPaymentSlipDataUrl(slip);

        return sessionRepository.save(session);
    }

    private void validateNoDoubleBooking(Integer studentId, Long mentorId, Long subjectId,
                                         Date sessionAt, int durationMinutes) {
        List<Session> existing = sessionRepository.findByStudent_Id(studentId);
        for (Session e : existing) {
            int existingDur = e.getDurationMinutes() != null ? e.getDurationMinutes() : 60;
            if (!intervalsOverlap(sessionAt, durationMinutes, e.getSessionAt(), existingDur)) {
                continue;
            }
            if (e.getMentor().getId().equals(mentorId)) {
                throw new SkillMentorException(
                        "You already have a session with this mentor at an overlapping time.",
                        HttpStatus.CONFLICT);
            }
            if (e.getSubject().getId().equals(subjectId)) {
                throw new SkillMentorException(
                        "You already booked this subject in an overlapping time window.",
                        HttpStatus.CONFLICT);
            }
        }
    }

    private static boolean intervalsOverlap(Date startA, int durA, Date startB, int durB) {
        long endA = startA.getTime() + durA * 60_000L;
        long endB = startB.getTime() + durB * 60_000L;
        return startA.getTime() < endB && startB.getTime() < endA;
    }

    @Override
    public List<AdminSessionRowDTO> getAllSessionsForAdmin() {
        return sessionRepository.findAllWithRelations().stream().map(this::toAdminRow).toList();
    }

    @Override
    public PaymentSlipResponseDTO getPaymentSlipForAdmin(Integer sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));
        String slip = session.getPaymentSlipDataUrl();
        if (slip == null || slip.isBlank()) {
            throw new SkillMentorException("No payment slip for this session.", HttpStatus.NOT_FOUND);
        }
        return PaymentSlipResponseDTO.builder().paymentSlipDataUrl(slip).build();
    }

    @Override
    public Session confirmPaymentForAdmin(Integer sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));
        session.setPaymentStatus("confirmed");
        return sessionRepository.save(session);
    }

    @Override
    public Session completeSessionForAdmin(Integer sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));
        session.setSessionStatus("completed");
        return sessionRepository.save(session);
    }

    @Override
    public Session updateMeetingLinkForAdmin(Integer sessionId, String meetingLink) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));
        session.setMeetingLink(meetingLink);
        return sessionRepository.save(session);
    }

    @Override
    public Session submitStudentReview(UserPrincipal principal, Integer sessionId, SessionReviewSubmitDTO dto) {
        Student student = studentRepository.findByEmail(principal.getEmail())
                .orElseThrow(() -> new SkillMentorException("Student profile not found", HttpStatus.NOT_FOUND));
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));
        if (!session.getStudent().getId().equals(student.getId())) {
            throw new SkillMentorException("You can only review your own sessions", HttpStatus.FORBIDDEN);
        }
        if (!"completed".equalsIgnoreCase(session.getSessionStatus())) {
            throw new SkillMentorException("Reviews are only allowed for completed sessions", HttpStatus.BAD_REQUEST);
        }
        if (session.getStudentRating() != null) {
            throw new SkillMentorException("A review has already been submitted for this session", HttpStatus.CONFLICT);
        }
        session.setStudentRating(dto.getRating());
        session.setStudentReview(dto.getComment());
        return sessionRepository.save(session);
    }

    @Override
    public Optional<MentorPortalContextDTO> getMentorPortalContext(String email) {
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }
        return mentorRepository.findByEmailIgnoreCase(email.trim())
                .map(m -> MentorPortalContextDTO.builder()
                        .id(m.getId())
                        .firstName(m.getFirstName())
                        .lastName(m.getLastName())
                        .email(m.getEmail())
                        .title(m.getTitle())
                        .build());
    }

    @Override
    public List<MentorPortalSessionDTO> getMentorPortalSessions(String email) {
        if (email == null || email.isBlank()) {
            throw new SkillMentorException(
                    "Your session has no email address. Add \"email\" to your Clerk JWT template.",
                    HttpStatus.BAD_REQUEST);
        }
        Mentor mentor = mentorRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new SkillMentorException(
                        "No mentor profile matches this login email (use the email an admin saved for your mentor).",
                        HttpStatus.NOT_FOUND));
        List<Session> sessions = sessionRepository.findDashboardSessionsForMentor(mentor.getId()).stream()
                .filter(s -> "confirmed".equalsIgnoreCase(s.getPaymentStatus()))
                .sorted(Comparator.comparing(Session::getSessionAt).reversed())
                .toList();
        List<Integer> sessionIds = sessions.stream().map(Session::getId).toList();
        Map<Integer, List<SessionResource>> grouped = loadResourcesGrouped(sessionIds);
        return sessions.stream()
                .map(s -> toMentorPortalDto(s, grouped.getOrDefault(s.getId(), List.of())))
                .toList();
    }

    @Override
    public MentorPortalSessionDTO completeSessionAsMentor(String mentorEmail, Integer sessionId) {
        if (mentorEmail == null || mentorEmail.isBlank()) {
            throw new SkillMentorException(
                    "Your session has no email address.",
                    HttpStatus.BAD_REQUEST);
        }
        Mentor mentor = mentorRepository.findByEmailIgnoreCase(mentorEmail.trim())
                .orElseThrow(() -> new SkillMentorException(
                        "No mentor profile matches this login email.",
                        HttpStatus.NOT_FOUND));
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));
        if (session.getMentor() == null || !session.getMentor().getId().equals(mentor.getId())) {
            throw new SkillMentorException("Not your session.", HttpStatus.FORBIDDEN);
        }
        if (!"confirmed".equalsIgnoreCase(session.getPaymentStatus())) {
            throw new SkillMentorException(
                    "Only payment-approved sessions appear in your dashboard.", HttpStatus.BAD_REQUEST);
        }
        if ("completed".equalsIgnoreCase(session.getSessionStatus())) {
            throw new SkillMentorException("Session is already completed.", HttpStatus.BAD_REQUEST);
        }
        Date start = session.getSessionAt();
        int dur = session.getDurationMinutes() != null ? session.getDurationMinutes() : 60;
        long endMs = start.getTime() + (long) dur * 60_000L;
        if (System.currentTimeMillis() < endMs) {
            throw new SkillMentorException(
                    "You can mark this session done only after the scheduled end time has passed.",
                    HttpStatus.BAD_REQUEST);
        }
        session.setSessionStatus("completed");
        Session saved = sessionRepository.save(session);
        return toMentorPortalDto(saved);
    }

    private Map<Integer, List<SessionResource>> loadResourcesGrouped(List<Integer> sessionIds) {
        if (sessionIds == null || sessionIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return sessionResourceRepository.findBySessionIdsOrderBySessionAndCreated(sessionIds).stream()
                .collect(Collectors.groupingBy(r -> r.getSession().getId(), LinkedHashMap::new, Collectors.toList()));
    }

    private MentorPortalSessionDTO toMentorPortalDto(Session s) {
        List<SessionResource> res = sessionResourceRepository.findBySession_IdOrderByCreatedAtAsc(s.getId());
        return toMentorPortalDto(s, res);
    }

    private MentorPortalSessionDTO toMentorPortalDto(Session s, List<SessionResource> resources) {
        return MentorPortalSessionDTO.builder()
                .id(s.getId())
                .studentName(s.getStudent().getFirstName() + " " + s.getStudent().getLastName())
                .studentEmail(s.getStudent().getEmail())
                .subjectName(s.getSubject().getSubjectName())
                .sessionAt(s.getSessionAt())
                .durationMinutes(s.getDurationMinutes())
                .paymentStatus(s.getPaymentStatus())
                .sessionStatus(s.getSessionStatus())
                .meetingLink(s.getMeetingLink())
                .resources(resources.stream().map(this::toResourceItemDto).toList())
                .build();
    }

    private AdminSessionRowDTO toAdminRow(Session s) {
        return AdminSessionRowDTO.builder()
                .id(s.getId())
                .studentName(s.getStudent().getFirstName() + " " + s.getStudent().getLastName())
                .mentorName(s.getMentor().getFirstName() + " " + s.getMentor().getLastName())
                .subjectName(s.getSubject().getSubjectName())
                .sessionAt(s.getSessionAt())
                .durationMinutes(s.getDurationMinutes())
                .paymentStatus(s.getPaymentStatus())
                .sessionStatus(s.getSessionStatus())
                .meetingLink(s.getMeetingLink())
                .hasPaymentSlip(s.getPaymentSlipDataUrl() != null && !s.getPaymentSlipDataUrl().isBlank())
                .build();
    }

    @Override
    public List<Session> getSessionsByStudentEmail(String email) {
        return sessionRepository.findByStudent_EmailOrderBySessionAtAsc(email);
    }

    @Override
    public SessionResponseDTO toSessionResponseDTO(Session session) {
        List<SessionResource> resources = sessionResourceRepository
                .findBySession_IdOrderByCreatedAtAsc(session.getId());
        return buildSessionResponseDto(session, resources);
    }

    @Override
    public MentorPortalSessionDTO addMentorSessionResource(
            String mentorEmail,
            Integer sessionId,
            MentorSessionResourceCreateDTO dto) {
        if (mentorEmail == null || mentorEmail.isBlank()) {
            throw new SkillMentorException(
                    "Your session has no email address.",
                    HttpStatus.BAD_REQUEST);
        }
        Mentor mentor = mentorRepository.findByEmailIgnoreCase(mentorEmail.trim())
                .orElseThrow(() -> new SkillMentorException(
                        "No mentor profile matches this login email.",
                        HttpStatus.NOT_FOUND));
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));
        if (session.getMentor() == null || !session.getMentor().getId().equals(mentor.getId())) {
            throw new SkillMentorException("Not your session.", HttpStatus.FORBIDDEN);
        }
        if (!"confirmed".equalsIgnoreCase(session.getPaymentStatus())) {
            throw new SkillMentorException(
                    "Resources can only be added to confirmed sessions.",
                    HttpStatus.BAD_REQUEST);
        }
        SessionResource saved = persistNewResource(session, dto);
        sessionResourceRepository.save(saved);
        return toMentorPortalDto(session);
    }

    @Override
    public MentorPortalSessionDTO deleteMentorSessionResource(String mentorEmail, Integer sessionId, Long resourceId) {
        if (mentorEmail == null || mentorEmail.isBlank()) {
            throw new SkillMentorException(
                    "Your session has no email address.",
                    HttpStatus.BAD_REQUEST);
        }
        Mentor mentor = mentorRepository.findByEmailIgnoreCase(mentorEmail.trim())
                .orElseThrow(() -> new SkillMentorException(
                        "No mentor profile matches this login email.",
                        HttpStatus.NOT_FOUND));
        SessionResource resource = sessionResourceRepository.findById(resourceId)
                .orElseThrow(() -> new SkillMentorException("Resource not found", HttpStatus.NOT_FOUND));
        Session session = resource.getSession();
        if (!session.getId().equals(sessionId)) {
            throw new SkillMentorException("Resource does not belong to this session.", HttpStatus.BAD_REQUEST);
        }
        if (session.getMentor() == null || !session.getMentor().getId().equals(mentor.getId())) {
            throw new SkillMentorException("Not your session.", HttpStatus.FORBIDDEN);
        }
        sessionResourceRepository.delete(resource);
        Session refreshed = sessionRepository.findById(sessionId).orElse(session);
        return toMentorPortalDto(refreshed);
    }

    @Override
    public SessionResourceDownloadPayload getSessionResourceDownloadForParticipant(
            UserPrincipal principal,
            Integer sessionId,
            Long resourceId) {
        String email = principal.getEmail();
        if (email == null || email.isBlank()) {
            throw new SkillMentorException("Your session has no email.", HttpStatus.BAD_REQUEST);
        }
        SessionResource resource = sessionResourceRepository.findById(resourceId)
                .orElseThrow(() -> new SkillMentorException("Resource not found", HttpStatus.NOT_FOUND));
        Session session = resource.getSession();
        if (!session.getId().equals(sessionId)) {
            throw new SkillMentorException("Invalid session.", HttpStatus.BAD_REQUEST);
        }
        if (!canAccessSessionResource(email.trim(), session)) {
            throw new SkillMentorException("Forbidden", HttpStatus.FORBIDDEN);
        }
        if (!RES_KIND_FILE.equalsIgnoreCase(resource.getKind())) {
            throw new SkillMentorException("This resource is a link — open it in the app.", HttpStatus.BAD_REQUEST);
        }
        String fileData = resource.getFileData();
        if (fileData == null || fileData.isBlank()) {
            throw new SkillMentorException("File data missing.", HttpStatus.NOT_FOUND);
        }
        byte[] bytes = decodeDataUrlPayload(fileData);
        String mime = resource.getMimeType();
        if (mime == null || mime.isBlank()) {
            mime = "application/octet-stream";
        }
        String fname = resource.getFileName();
        if (fname == null || fname.isBlank()) {
            fname = "resource";
        }
        return new SessionResourceDownloadPayload(bytes, fname, mime);
    }

    private SessionResource persistNewResource(Session session, MentorSessionResourceCreateDTO dto) {
        String rawKind = dto.getKind() != null ? dto.getKind().trim().toUpperCase() : "";
        if (!(RES_KIND_LINK.equals(rawKind) || RES_KIND_FILE.equals(rawKind))) {
            throw new SkillMentorException("kind must be LINK or FILE.", HttpStatus.BAD_REQUEST);
        }
        String title = dto.getTitle() != null ? dto.getTitle().trim() : "";
        if (title.isEmpty()) {
            throw new SkillMentorException("Title is required.", HttpStatus.BAD_REQUEST);
        }

        SessionResource.SessionResourceBuilder b = SessionResource.builder()
                .session(session)
                .title(title)
                .kind(rawKind);

        if (RES_KIND_LINK.equals(rawKind)) {
            String link = dto.getLinkUrl() != null ? dto.getLinkUrl().trim() : "";
            if (link.isEmpty()) {
                throw new SkillMentorException("linkUrl is required for LINK.", HttpStatus.BAD_REQUEST);
            }
            validateHttpsOrHttpUrl(link);
            return b.kind(RES_KIND_LINK)
                    .linkUrl(link)
                    .fileName(null)
                    .mimeType(null)
                    .fileData(null)
                    .build();
        }

        String dataUrl = dto.getFileDataUrl() != null ? dto.getFileDataUrl().trim() : "";
        if (dataUrl.isEmpty()) {
            throw new SkillMentorException("fileDataUrl is required for FILE.", HttpStatus.BAD_REQUEST);
        }
        if (dto.getFileName() == null || dto.getFileName().isBlank()) {
            throw new SkillMentorException("fileName is required for FILE.", HttpStatus.BAD_REQUEST);
        }
        if (!dataUrl.startsWith("data:") || !dataUrl.contains("base64,")) {
            throw new SkillMentorException(
                    "fileDataUrl must be a base64 data URL (e.g. data:application/pdf;base64,...).",
                    HttpStatus.BAD_REQUEST);
        }
        decodeDataUrlPayload(dataUrl);
        String mime = dto.getMimeType() != null && !dto.getMimeType().isBlank()
                ? dto.getMimeType().trim()
                : extractMimeFromDataUrl(dataUrl);
        return b.kind(RES_KIND_FILE)
                .linkUrl(null)
                .fileName(dto.getFileName().trim())
                .mimeType(mime)
                .fileData(dataUrl)
                .build();
    }

    private static String extractMimeFromDataUrl(String dataUrl) {
        int semi = dataUrl.indexOf(';');
        if (dataUrl.startsWith("data:") && semi > 5) {
            return dataUrl.substring(5, semi);
        }
        return "application/octet-stream";
    }

    private byte[] decodeDataUrlPayload(String dataUrl) {
        int comma = dataUrl.indexOf(',');
        if (comma <= 0 || comma >= dataUrl.length() - 1) {
            throw new SkillMentorException("Invalid file data.", HttpStatus.BAD_REQUEST);
        }
        try {
            String b64 = dataUrl.substring(comma + 1);
            byte[] bytes = Base64.getDecoder().decode(b64);
            if (bytes.length > maxSessionResourceDecodedBytes) {
                throw new SkillMentorException(
                        "File is too large. Maximum decoded size is " + maxSessionResourceDecodedBytes + " bytes.",
                        HttpStatus.BAD_REQUEST);
            }
            return bytes;
        } catch (IllegalArgumentException ex) {
            throw new SkillMentorException("Invalid base64 in file.", HttpStatus.BAD_REQUEST);
        }
    }

    private void validateHttpsOrHttpUrl(String link) {
        try {
            URI uri = URI.create(link);
            String scheme = uri.getScheme();
            if (scheme == null
                    || (!scheme.equalsIgnoreCase("https") && !scheme.equalsIgnoreCase("http"))) {
                throw new SkillMentorException("Links must start with http or https.", HttpStatus.BAD_REQUEST);
            }
            if (uri.getHost() == null || uri.getHost().isBlank()) {
                throw new SkillMentorException("Invalid link URL.", HttpStatus.BAD_REQUEST);
            }
        } catch (SkillMentorException e) {
            throw e;
        } catch (Exception e) {
            throw new SkillMentorException("Invalid link URL.", HttpStatus.BAD_REQUEST);
        }
    }

    private boolean canAccessSessionResource(String emailNormalized, Session session) {
        boolean asStudent = studentRepository.findByEmailIgnoreCase(emailNormalized)
                .filter(st -> session.getStudent() != null && st.getId().equals(session.getStudent().getId()))
                .isPresent();
        if (asStudent) {
            return true;
        }
        return mentorRepository.findByEmailIgnoreCase(emailNormalized)
                .filter(m -> session.getMentor() != null && m.getId().equals(session.getMentor().getId()))
                .isPresent();
    }

    private SessionResourceItemDTO toResourceItemDto(SessionResource r) {
        boolean isFile = RES_KIND_FILE.equalsIgnoreCase(r.getKind());
        return SessionResourceItemDTO.builder()
                .id(r.getId())
                .title(r.getTitle())
                .kind(isFile ? "file" : "link")
                .linkUrl(isFile ? null : r.getLinkUrl())
                .fileName(isFile ? r.getFileName() : null)
                .mimeType(isFile ? r.getMimeType() : null)
                .build();
    }

    private SessionResponseDTO buildSessionResponseDto(Session session, List<SessionResource> resources) {
        SessionResponseDTO dto = new SessionResponseDTO();
        dto.setId(session.getId());
        dto.setMentorId(session.getMentor().getId());
        dto.setSubjectId(session.getSubject().getId());
        dto.setMentorName(session.getMentor().getFirstName() + " " + session.getMentor().getLastName());
        dto.setMentorProfileImageUrl(session.getMentor().getProfileImageUrl());
        dto.setSubjectName(session.getSubject().getSubjectName());
        dto.setSubjectDescription(session.getSubject().getDescription());
        dto.setCourseImageUrl(session.getSubject().getCourseImageUrl());
        dto.setSessionAt(session.getSessionAt());
        dto.setDurationMinutes(session.getDurationMinutes());
        dto.setSessionStatus(session.getSessionStatus());
        dto.setPaymentStatus(session.getPaymentStatus());
        dto.setMeetingLink(session.getMeetingLink());
        dto.setResources(resources.stream().map(this::toResourceItemDto).toList());
        return dto;
    }

}
