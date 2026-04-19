package com.stemlink.skillmentor.services.impl;

import com.stemlink.skillmentor.dto.response.MentorProfileResponse;
import com.stemlink.skillmentor.entities.Mentor;
import com.stemlink.skillmentor.entities.Session;
import com.stemlink.skillmentor.entities.Subject;
import com.stemlink.skillmentor.exceptions.SkillMentorException;
import com.stemlink.skillmentor.respositories.MentorRepository;
import com.stemlink.skillmentor.respositories.SessionRepository;
import com.stemlink.skillmentor.respositories.SubjectRepository;
import com.stemlink.skillmentor.services.MentorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
@Slf4j
public class MentorServiceImpl implements MentorService {

    private final MentorRepository mentorRepository;
    private final SubjectRepository subjectRepository;
    private final SessionRepository sessionRepository;
    private final ModelMapper modelMapper;

    private static final DateTimeFormatter ISO_DT = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

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
    @Transactional(readOnly = true)
    public MentorProfileResponse getMentorProfile(Long id) {
        Mentor m = getMentorById(id);
        List<Subject> subjects = subjectRepository.findByMentor_Id(id);

        List<MentorProfileResponse.SubjectWithEnrollmentDTO> subjectDtos = subjects.stream()
                .map(sub -> MentorProfileResponse.SubjectWithEnrollmentDTO.builder()
                        .id(sub.getId())
                        .subjectName(sub.getSubjectName())
                        .description(sub.getDescription())
                        .courseImageUrl(sub.getCourseImageUrl())
                        .enrollmentCount(sessionRepository.countBySubject_Id(sub.getId()))
                        .build())
                .collect(Collectors.toList());

        List<Session> reviewSessions = sessionRepository.findRecentReviewsForMentor(id, PageRequest.of(0, 20));
        List<MentorProfileResponse.ReviewItemDTO> reviews = reviewSessions.stream()
                .map(s -> {
                    String ln = s.getStudent().getLastName();
                    String initial = (ln != null && !ln.isEmpty()) ? ln.substring(0, 1) + "." : "";
                    return MentorProfileResponse.ReviewItemDTO.builder()
                            .studentName(s.getStudent().getFirstName() + " " + initial)
                            .rating(s.getStudentRating())
                            .review(s.getStudentReview())
                            .sessionAt(s.getSessionAt() != null
                                    ? s.getSessionAt().toInstant().atOffset(ZoneOffset.UTC).format(ISO_DT)
                                    : null)
                            .build();
                })
                .collect(Collectors.toList());

        Double avg = sessionRepository.averageRatingByMentor(id);
        long reviewCount = sessionRepository.countByMentor_IdAndStudentRatingIsNotNull(id);
        long totalStudents = sessionRepository.countDistinctStudentsByMentor(id);

        long positive = sessionRepository.countPositiveReviewsForMentor(id);
        int positivePct = reviewCount == 0 ? 100
                : (int) Math.round(100.0 * positive / reviewCount);

        return MentorProfileResponse.builder()
                .id(m.getId())
                .mentorId(m.getMentorId())
                .firstName(m.getFirstName())
                .lastName(m.getLastName())
                .email(m.getEmail())
                .phoneNumber(m.getPhoneNumber())
                .title(m.getTitle())
                .profession(m.getProfession())
                .company(m.getCompany())
                .experienceYears(m.getExperienceYears())
                .bio(m.getBio())
                .profileImageUrl(m.getProfileImageUrl())
                .isCertified(m.getIsCertified())
                .startYear(m.getStartYear())
                .averageRating(avg != null ? Math.round(avg * 10.0) / 10.0 : null)
                .reviewCount(reviewCount)
                .totalStudentsTaught(totalStudents)
                .subjectsTaughtCount(subjectDtos.size())
                .positiveReviewPercent(positivePct)
                .subjects(subjectDtos)
                .recentReviews(reviews)
                .build();
    }

}
