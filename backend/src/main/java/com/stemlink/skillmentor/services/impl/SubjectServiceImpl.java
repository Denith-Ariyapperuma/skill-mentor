package com.stemlink.skillmentor.services.impl;

import com.stemlink.skillmentor.dto.SubjectDTO;
import com.stemlink.skillmentor.dto.response.AdminSubjectRowDTO;
import com.stemlink.skillmentor.entities.Mentor;
import com.stemlink.skillmentor.entities.Subject;
import com.stemlink.skillmentor.exceptions.SkillMentorException;
import com.stemlink.skillmentor.respositories.MentorRepository;
import com.stemlink.skillmentor.respositories.SubjectRepository;
import com.stemlink.skillmentor.services.SubjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubjectServiceImpl implements SubjectService {

    private final SubjectRepository subjectRepository;
    private final MentorRepository mentorRepository;

    public List<Subject> getAllSubjects(){
        try {
            return subjectRepository.findAll();
        } catch (Exception exception) {
            log.error("Failed to get all subjects", exception);
            throw new SkillMentorException("Failed to get all subjects", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    public List<AdminSubjectRowDTO> getAllSubjectsForAdmin() {
        try {
            List<Subject> subjects = subjectRepository.findAllWithMentor();
            subjects.sort(Comparator.comparing(Subject::getId));
            return subjects.stream().map(s -> AdminSubjectRowDTO.builder()
                            .id(s.getId())
                            .subjectName(s.getSubjectName())
                            .description(s.getDescription())
                            .courseImageUrl(s.getCourseImageUrl())
                            .mentorId(s.getMentor().getId())
                            .mentorName(s.getMentor().getFirstName() + " " + s.getMentor().getLastName())
                            .build())
                    .toList();
        } catch (Exception exception) {
            log.error("Failed to get subjects for admin", exception);
            throw new SkillMentorException("Failed to get subjects for admin", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Transactional
    public Subject addNewSubject(Long mentorId, Subject subject){
        try {
            subject.setId(null);
            String name = subject.getSubjectName() == null ? "" : subject.getSubjectName().trim();
            subject.setSubjectName(name);

            Mentor mentor = mentorRepository.findById(mentorId).orElseThrow(
                    () -> new SkillMentorException("Mentor not found", HttpStatus.NOT_FOUND)
            );
            rejectDuplicateSubjectNameCreate(mentorId, name);
            subject.setMentor(mentor);
            return subjectRepository.save(subject);
        } catch (SkillMentorException e) {
            throw e;
        } catch (DataIntegrityViolationException e) {
            log.error("Data integrity violation while adding subject: {}", specificMessage(e));
            throw subjectDataIntegrityException(e);
        } catch (Exception exception) {
            log.error("Failed to add new subject", exception);
            throw new SkillMentorException("Failed to add new subject", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public Subject getSubjectById(Long id){
        return subjectRepository.findById(id).orElseThrow(
                () -> new SkillMentorException("Subject not found", HttpStatus.NOT_FOUND)
        );
    }

    /** Apply DTO fields on the loaded entity — ModelMapper merges can wipe {@code mentor} and cause bad saves. */
    @Transactional
    public Subject updateSubjectById(Long id, SubjectDTO dto) {
        try {
            Subject subject = subjectRepository.findById(id).orElseThrow(
                    () -> new SkillMentorException("Subject not found", HttpStatus.NOT_FOUND));

            String name = dto.getSubjectName() == null ? "" : dto.getSubjectName().trim();
            subject.setSubjectName(name);

            if (dto.getDescription() != null) {
                subject.setDescription(dto.getDescription().trim());
            }

            if (dto.getCourseImageUrl() != null) {
                String url = dto.getCourseImageUrl().trim();
                subject.setCourseImageUrl(url.isEmpty() ? null : url);
            }

            if (dto.getMentorId() != null) {
                Mentor mentor = mentorRepository.findById(dto.getMentorId()).orElseThrow(
                        () -> new SkillMentorException("Mentor not found", HttpStatus.NOT_FOUND));
                subject.setMentor(mentor);
            }

            Long mentorPk = subject.getMentor().getId();
            rejectDuplicateSubjectNameUpdate(id, mentorPk, name);

            return subjectRepository.save(subject);
        } catch (SkillMentorException e) {
            throw e;
        } catch (DataIntegrityViolationException e) {
            log.error("Data integrity violation while updating subject: {}", specificMessage(e));
            throw subjectDataIntegrityException(e);
        } catch (Exception exception) {
            log.error("Error updating subject", exception);
            throw new SkillMentorException("Failed to update subject", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Transactional
    public void deleteSubject(Long id){
        try {
            subjectRepository.deleteById(id);
        } catch (Exception exception) {
            log.error("Failed to delete subject with id {}", id, exception);
            throw new SkillMentorException("Failed to delete subject", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private void rejectDuplicateSubjectNameCreate(Long mentorId, String name) {
        if (subjectRepository.existsByMentor_IdAndSubjectNameIgnoreCase(mentorId, name)) {
            throw new SkillMentorException(
                    "This mentor already has a subject with this name — pick a different name.",
                    HttpStatus.CONFLICT);
        }
    }

    private void rejectDuplicateSubjectNameUpdate(long subjectId, Long mentorPk, String name) {
        if (subjectRepository.existsByMentor_IdAndSubjectNameIgnoreCaseAndIdNot(mentorPk, name, subjectId)) {
            throw new SkillMentorException(
                    "This mentor already has another subject with this name — pick a different name.",
                    HttpStatus.CONFLICT);
        }
    }

    private static SkillMentorException subjectDataIntegrityException(DataIntegrityViolationException e) {
        String raw = specificMessage(e);
        String lower = raw.toLowerCase();
        if (lower.contains("too long") || lower.contains("value too large")) {
            return new SkillMentorException(
                    "A field is too long for the database (description up to 255 characters, image URL up to 2048).",
                    HttpStatus.BAD_REQUEST);
        }
        return new SkillMentorException(conflictMessageForDataIntegrity(e), HttpStatus.CONFLICT);
    }

    private static String specificMessage(DataIntegrityViolationException e) {
        Throwable c = e.getMostSpecificCause();
        if (c != null && c.getMessage() != null) {
            return c.getMessage();
        }
        return e.getMessage() != null ? e.getMessage() : "";
    }

    private static String conflictMessageForDataIntegrity(DataIntegrityViolationException e) {
        String raw = specificMessage(e);
        String lower = raw.toLowerCase();
        if (lower.contains("duplicate") || lower.contains("unique")) {
            return "That value conflicts with existing data — usually a duplicate subject name. "
                    + "Rename the subject or align the catalogue with your database uniqueness rules.";
        }
        return "Could not save subject (database constraint).";
    }
}
