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
import org.modelmapper.ModelMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubjectServiceImpl implements SubjectService {

    private final SubjectRepository subjectRepository;
    private final MentorRepository mentorRepository;
    private final ModelMapper modelMapper;

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

    public Subject addNewSubject(Long mentorId, Subject subject){
        try {
            subject.setId(null);
            String name = subject.getSubjectName() == null ? "" : subject.getSubjectName().trim();
            subject.setSubjectName(name);

            Mentor mentor = mentorRepository.findById(mentorId).orElseThrow(
                    () -> new SkillMentorException("Mentor not found", HttpStatus.NOT_FOUND)
            );
            if (subjectRepository.existsByMentor_IdAndSubjectNameIgnoreCase(mentorId, name)) {
                throw new SkillMentorException(
                        "This mentor already has a subject with this name — pick a different name.",
                        HttpStatus.CONFLICT);
            }
            subject.setMentor(mentor);
            return subjectRepository.save(subject);
        } catch (SkillMentorException e) {
            throw e;
        } catch (DataIntegrityViolationException e) {
            log.error("Data integrity violation while adding subject: {}", specificMessage(e));
            throw new SkillMentorException(conflictMessageForDataIntegrity(e), HttpStatus.CONFLICT);
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

    public Subject updateSubjectById(Long id, SubjectDTO dto) {
        try {
            Subject subject = subjectRepository.findById(id).orElseThrow(
                    () -> new SkillMentorException("Subject not found", HttpStatus.NOT_FOUND));
            Subject patch = modelMapper.map(dto, Subject.class);
            modelMapper.map(patch, subject);
            if (dto.getMentorId() != null) {
                Mentor mentor = mentorRepository.findById(dto.getMentorId()).orElseThrow(
                        () -> new SkillMentorException("Mentor not found", HttpStatus.NOT_FOUND));
                subject.setMentor(mentor);
            }
            String name = subject.getSubjectName() == null ? "" : subject.getSubjectName().trim();
            subject.setSubjectName(name);
            Long mentorId = subject.getMentor().getId();
            if (subjectRepository.existsByMentor_IdAndSubjectNameIgnoreCaseAndIdNot(mentorId, name, id)) {
                throw new SkillMentorException(
                        "This mentor already has another subject with this name — pick a different name.",
                        HttpStatus.CONFLICT);
            }
            return subjectRepository.save(subject);
        } catch (SkillMentorException e) {
            throw e;
        } catch (DataIntegrityViolationException e) {
            log.error("Data integrity violation while updating subject: {}", specificMessage(e));
            throw new SkillMentorException(conflictMessageForDataIntegrity(e), HttpStatus.CONFLICT);
        } catch (Exception exception) {
            log.error("Error updating subject", exception);
            throw new SkillMentorException("Failed to update subject", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public void deleteSubject(Long id){
        try {
            subjectRepository.deleteById(id);
        } catch (Exception exception) {
            log.error("Failed to delete subject with id {}", id, exception);
            throw new SkillMentorException("Failed to delete subject", HttpStatus.INTERNAL_SERVER_ERROR);
        }
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
        if (raw == null) {
            return "Could not save subject (database constraint).";
        }
        String lower = raw.toLowerCase();
        if (lower.contains("duplicate") || lower.contains("unique")) {
            return "That value conflicts with existing data — try a different subject name "
                    + "(or the database may require a unique name across all subjects).";
        }
        return "Could not save subject (database constraint).";
    }
}
