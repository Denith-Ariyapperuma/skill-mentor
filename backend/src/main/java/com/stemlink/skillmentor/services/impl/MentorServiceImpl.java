package com.stemlink.skillmentor.services.impl;

import com.stemlink.skillmentor.dto.MentorDTO;
import com.stemlink.skillmentor.dto.SubjectDTO;
import com.stemlink.skillmentor.dto.response.MentorReviewResponseDTO;
import com.stemlink.skillmentor.entities.Mentor;
import com.stemlink.skillmentor.entities.Subject;
import com.stemlink.skillmentor.exceptions.SkillMentorException;
import com.stemlink.skillmentor.respositories.MentorRepository;
import com.stemlink.skillmentor.respositories.SessionRepository;
import com.stemlink.skillmentor.services.MentorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
@Service
@RequiredArgsConstructor
@Slf4j
public class MentorServiceImpl implements MentorService {

    private final MentorRepository mentorRepository;
    private final SessionRepository sessionRepository;
    private final ModelMapper modelMapper;

    @CacheEvict(value = "mentors", allEntries = true)
    public Mentor createNewMentor(Mentor mentor) {
        try {
            return mentorRepository.save(mentor);
        } catch (DataIntegrityViolationException e) {
            log.error("Data integrity violation while creating mentor: {}", e.getMessage());
            throw new SkillMentorException("Mentor with this email already exists", HttpStatus.CONFLICT);
        } catch (Exception exception) {
            log.error("Failed to create new mentor", exception);
            throw new SkillMentorException("Failed to create new mentor", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Cacheable(value = "mentors", key = "(#name ?: '') + '_' + #pageable.pageNumber + '_' + #pageable.pageSize")
    public Page<Mentor> getAllMentors(String name, Pageable pageable) {
        try {
            log.debug("getting mentors with name: {}", name);
            if (name != null && !name.isEmpty()) {
                return mentorRepository.findByName(name, pageable);
            }
            return mentorRepository.findAll(pageable); // SELECT * FROM mentor
        } catch (Exception exception) {
            log.error("Failed to get all mentors", exception);
            throw new SkillMentorException("Failed to get all mentors", HttpStatus.INTERNAL_SERVER_ERROR);
        }

    }

    @Cacheable(value = "mentors", key = "#id")
    public Mentor getMentorById(Long id) {
        try {

            Mentor mentor = mentorRepository.findById(id).orElseThrow(
                    () -> new SkillMentorException("Mentor Not found", HttpStatus.NOT_FOUND)
            );
            log.info("Successfully fetched mentor {}", id);
            return mentor;
        } catch (SkillMentorException skillMentorException) {
            //System.err.println("Mentor not found " + skillMentorException.getMessage());
            // LOG LEVELS
            // DEBUG, INFO, WARN, ERROR
            // env - dev, prod
            log.warn("Mentor not found with id: {} to fetch", id, skillMentorException);
            throw new SkillMentorException("Mentor Not found", HttpStatus.NOT_FOUND);
        } catch (Exception exception) {
            log.error("Error getting mentor", exception);
            throw new SkillMentorException("Failed to get mentor", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @CacheEvict(value = "mentors", allEntries = true)
    public Mentor updateMentorById(Long id, Mentor updatedMentor) {
        try {
            Mentor mentor = mentorRepository.findById(id).orElseThrow(
                    () -> new SkillMentorException("Mentor Not found", HttpStatus.NOT_FOUND)
            );
            modelMapper.map(updatedMentor, mentor);
            return mentorRepository.save(mentor);
        } catch (SkillMentorException skillMentorException) {
            log.warn("Mentor not found with id: {} to update", id, skillMentorException);
            throw new SkillMentorException("Mentor Not found", HttpStatus.NOT_FOUND);
        } catch (Exception exception) {
            log.error("Error updating mentor", exception);
            throw new SkillMentorException("Failed to update mentor", HttpStatus.INTERNAL_SERVER_ERROR);
        }

    }

    public void deleteMentor(Long id) {
        try {
            mentorRepository.deleteById(id);
        } catch (Exception exception) {
            log.error("Failed to delete mentor with id {}", id, exception);
            throw new SkillMentorException("Failed to delete mentor", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    public MentorDTO getMentorProfile(Long id) {
        try {
            Mentor mentor = mentorRepository.findByIdWithSubjects(id).orElseThrow(
                    () -> new SkillMentorException("Mentor Not found", HttpStatus.NOT_FOUND));

            MentorDTO dto = modelMapper.map(mentor, MentorDTO.class);
            dto.setSubjects(mapSubjectsWithEnrollments(mentor));

            long distinctStudents = sessionRepository.countDistinctStudentsByMentor_Id(id);
            Double avg = sessionRepository.averageRatingByMentor_Id(id);
            long revCount = sessionRepository.countReviewsByMentor_Id(id);
            long positive = sessionRepository.countPositiveReviewsByMentor_Id(id);

            dto.setTotalStudentsTaught((int) distinctStudents);
            if (revCount > 0 && avg != null) {
                dto.setAverageRating(Math.round(avg * 10.0) / 10.0);
                dto.setReviewCount((int) revCount);
                dto.setPositiveReviewPercent((positive * 100.0) / revCount);
            } else {
                dto.setAverageRating(null);
                dto.setReviewCount(0);
                dto.setPositiveReviewPercent(null);
            }
            List<Subject> subs = mentor.getSubjects();
            dto.setSubjectCount(subs != null ? subs.size() : 0);
            return dto;
        } catch (SkillMentorException e) {
            throw e;
        } catch (Exception exception) {
            log.error("Failed to build mentor profile", exception);
            throw new SkillMentorException("Failed to get mentor", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    public List<MentorReviewResponseDTO> getMentorReviews(Long mentorId) {
        mentorRepository.findById(mentorId).orElseThrow(
                () -> new SkillMentorException("Mentor Not found", HttpStatus.NOT_FOUND));
        return sessionRepository.findRatedSessionsForMentor(mentorId).stream()
                .map(s -> MentorReviewResponseDTO.builder()
                        .reviewerName(s.getStudent().getFirstName() + " " + s.getStudent().getLastName())
                        .rating(s.getStudentRating())
                        .comment(s.getStudentReview())
                        .reviewedAt(s.getUpdatedAt())
                        .build())
                .toList();
    }

    private List<SubjectDTO> mapSubjectsWithEnrollments(Mentor mentor) {
        if (mentor.getSubjects() == null) {
            return List.of();
        }
        List<SubjectDTO> out = new ArrayList<>();
        for (Subject sub : mentor.getSubjects()) {
            SubjectDTO sd = modelMapper.map(sub, SubjectDTO.class);
            sd.setMentorId(mentor.getId());
            sd.setEnrollmentCount(sessionRepository.countBySubject_Id(sub.getId()));
            out.add(sd);
        }
        return out;
    }

}
