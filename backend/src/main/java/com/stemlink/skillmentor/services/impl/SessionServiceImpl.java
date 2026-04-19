package com.stemlink.skillmentor.services.impl;

import com.stemlink.skillmentor.dto.EnrollSessionDTO;
import com.stemlink.skillmentor.dto.SessionDTO;
import com.stemlink.skillmentor.dto.SessionReviewDTO;
import com.stemlink.skillmentor.dto.response.AdminSessionResponseDTO;
import com.stemlink.skillmentor.entities.Session;
import com.stemlink.skillmentor.entities.Student;
import com.stemlink.skillmentor.entities.Mentor;
import com.stemlink.skillmentor.entities.Subject;
import com.stemlink.skillmentor.exceptions.SkillMentorException;
import com.stemlink.skillmentor.respositories.SessionRepository;
import com.stemlink.skillmentor.respositories.StudentRepository;
import com.stemlink.skillmentor.respositories.MentorRepository;
import com.stemlink.skillmentor.respositories.SubjectRepository;
import com.stemlink.skillmentor.security.UserPrincipal;
import com.stemlink.skillmentor.services.SessionService;
import com.stemlink.skillmentor.utils.ValidationUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionServiceImpl implements SessionService {

    private final SessionRepository sessionRepository;
    private final StudentRepository studentRepository;
    private final MentorRepository mentorRepository;
    private final SubjectRepository subjectRepository;
    private final ModelMapper modelMapper;

    public Session createNewSession(SessionDTO sessionDTO) {
        try {
            Student student = studentRepository.findById(sessionDTO.getStudentId()).orElseThrow(
                    () -> new SkillMentorException("Student not found", HttpStatus.NOT_FOUND)
            );
            Mentor mentor = mentorRepository.findById(sessionDTO.getMentorId())
                    .orElseThrow(() -> new SkillMentorException("Mentor not found", HttpStatus.NOT_FOUND));
            Subject subject = subjectRepository.findById(sessionDTO.getSubjectId()).orElseThrow(
                    () -> new SkillMentorException("Subject not found", HttpStatus.NOT_FOUND)
            );

            ValidationUtils.validateMentorAvailability(mentor, sessionDTO.getSessionAt(), sessionDTO.getDurationMinutes());
            ValidationUtils.validateStudentAvailability(student, sessionDTO.getSessionAt(), sessionDTO.getDurationMinutes());

            Session session = modelMapper.map(sessionDTO, Session.class);
            session.setStudent(student);
            session.setMentor(mentor);
            session.setSubject(subject);

            return sessionRepository.save(session);
        } catch (SkillMentorException e) {
            throw e;
        } catch (Exception exception) {
            log.error("Failed to create session", exception);
            throw new SkillMentorException("Failed to create new session", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminSessionResponseDTO> getAllSessionsForAdmin() {
        return sessionRepository.findAll().stream()
                .map(this::toAdminDto)
                .collect(Collectors.toList());
    }

    private AdminSessionResponseDTO toAdminDto(Session s) {
        return AdminSessionResponseDTO.builder()
                .id(s.getId())
                .studentFirstName(s.getStudent().getFirstName())
                .studentLastName(s.getStudent().getLastName())
                .studentEmail(s.getStudent().getEmail())
                .mentorFirstName(s.getMentor().getFirstName())
                .mentorLastName(s.getMentor().getLastName())
                .subjectName(s.getSubject().getSubjectName())
                .sessionAt(s.getSessionAt())
                .durationMinutes(s.getDurationMinutes())
                .paymentStatus(s.getPaymentStatus())
                .sessionStatus(s.getSessionStatus())
                .meetingLink(s.getMeetingLink())
                .build();
    }

    public Session getSessionById(Integer id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));
    }

    public Session updateSessionById(Integer id, SessionDTO updatedSessionDTO) {
        Session session = getSessionById(id);
        modelMapper.map(updatedSessionDTO, session);

        if (updatedSessionDTO.getStudentId() != null) {
            Student student = studentRepository.findById(updatedSessionDTO.getStudentId())
                    .orElseThrow(() -> new SkillMentorException("Student not found", HttpStatus.NOT_FOUND));
            session.setStudent(student);
        }
        if (updatedSessionDTO.getMentorId() != null) {
            Mentor mentor = mentorRepository.findById(updatedSessionDTO.getMentorId())
                    .orElseThrow(() -> new SkillMentorException("Mentor not found", HttpStatus.NOT_FOUND));
            session.setMentor(mentor);
        }
        if (updatedSessionDTO.getSubjectId() != null) {
            Subject subject = subjectRepository.findById(updatedSessionDTO.getSubjectId())
                    .orElseThrow(() -> new SkillMentorException("Subject not found", HttpStatus.NOT_FOUND));
            session.setSubject(subject);
        }

        return sessionRepository.save(session);
    }

    public void deleteSession(Integer id) {
        sessionRepository.deleteById(id);
    }

    @Override
    @Transactional
    public Session enrollSession(UserPrincipal userPrincipal, EnrollSessionDTO dto) {
        Student student = studentRepository.findByEmail(userPrincipal.getEmail())
                .orElseGet(() -> {
                    Student s = new Student();
                    s.setStudentId(userPrincipal.getId());
                    s.setEmail(userPrincipal.getEmail());
                    s.setFirstName(userPrincipal.getFirstName());
                    s.setLastName(userPrincipal.getLastName());
                    return studentRepository.save(s);
                });

        Mentor mentor = mentorRepository.findById(dto.getMentorId())
                .orElseThrow(() -> new SkillMentorException("Mentor not found", HttpStatus.NOT_FOUND));
        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new SkillMentorException("Subject not found", HttpStatus.NOT_FOUND));

        if (subject.getMentor() == null || !subject.getMentor().getId().equals(mentor.getId())) {
            throw new SkillMentorException("This subject does not belong to the selected mentor", HttpStatus.BAD_REQUEST);
        }

        int duration = dto.getDurationMinutes() != null ? dto.getDurationMinutes() : 60;
        Date start = dto.getSessionAt();
        Instant cutoff = Instant.now().minus(1, ChronoUnit.MINUTES);
        if (start.toInstant().isBefore(cutoff)) {
            throw new SkillMentorException("Session time cannot be in the past", HttpStatus.BAD_REQUEST);
        }

        assertNoOverlap(sessionRepository.findByStudent_Id(student.getId()), start, duration,
                "You already have another session that overlaps with this time");
        assertNoOverlap(sessionRepository.findByMentor_Id(mentor.getId()), start, duration,
                "The mentor is not available at this time (another session overlaps)");

        Session session = new Session();
        session.setStudent(student);
        session.setMentor(mentor);
        session.setSubject(subject);
        session.setSessionAt(start);
        session.setDurationMinutes(duration);
        session.setSessionStatus("pending");
        session.setPaymentStatus("pending");

        return sessionRepository.save(session);
    }

    private void assertNoOverlap(List<Session> existing, Date newStart, int newDurationMinutes, String message) {
        Date newEnd = ValidationUtils.addMinutesToDate(newStart, newDurationMinutes);
        for (Session s : existing) {
            int d = s.getDurationMinutes() != null ? s.getDurationMinutes() : 60;
            Date es = s.getSessionAt();
            Date ee = ValidationUtils.addMinutesToDate(es, d);
            if (ValidationUtils.isTimeOverlap(newStart, newEnd, es, ee)) {
                throw new SkillMentorException(message, HttpStatus.CONFLICT);
            }
        }
    }

    public List<Session> getSessionsByStudentEmail(String email) {
        return sessionRepository.findByStudent_Email(email);
    }

    @Override
    public Session confirmPayment(Integer id) {
        Session session = sessionRepository.findById(id)
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));
        session.setPaymentStatus("confirmed");
        session.setSessionStatus("confirmed");
        return sessionRepository.save(session);
    }

    @Override
    public Session markComplete(Integer id) {
        Session session = sessionRepository.findById(id)
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));
        if (!"confirmed".equals(session.getPaymentStatus())) {
            throw new SkillMentorException("Payment must be confirmed before marking the session complete", HttpStatus.BAD_REQUEST);
        }
        session.setSessionStatus("completed");
        return sessionRepository.save(session);
    }

    @Override
    public Session updateMeetingLink(Integer id, String meetingLink) {
        Session session = sessionRepository.findById(id)
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));
        session.setMeetingLink(meetingLink);
        return sessionRepository.save(session);
    }

    @Override
    @Transactional
    public Session submitReview(UserPrincipal userPrincipal, Integer sessionId, SessionReviewDTO dto) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new SkillMentorException("Session not found", HttpStatus.NOT_FOUND));
        if (!session.getStudent().getEmail().equalsIgnoreCase(userPrincipal.getEmail())) {
            throw new SkillMentorException("You can only review your own sessions", HttpStatus.FORBIDDEN);
        }
        if (!"completed".equalsIgnoreCase(session.getSessionStatus())) {
            throw new SkillMentorException("You can only review completed sessions", HttpStatus.BAD_REQUEST);
        }
        if (session.getStudentRating() != null) {
            throw new SkillMentorException("This session has already been reviewed", HttpStatus.CONFLICT);
        }
        session.setStudentRating(dto.getRating());
        session.setStudentReview(dto.getReview());
        return sessionRepository.save(session);
    }
}
