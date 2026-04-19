package com.stemlink.skillmentor.respositories;

import com.stemlink.skillmentor.entities.Session;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SessionRepository extends JpaRepository<Session, Integer> {
    List<Session> findByStudent_Email(String email);

    List<Session> findByStudent_Id(Integer studentId);

    List<Session> findByMentor_Id(Long mentorId);

    long countBySubject_Id(Long subjectId);

    @Query("SELECT COUNT(DISTINCT s.student.id) FROM Session s WHERE s.mentor.id = :mid")
    long countDistinctStudentsByMentor(@Param("mid") Long mentorId);

    @Query("SELECT AVG(s.studentRating) FROM Session s WHERE s.mentor.id = :mid AND s.studentRating IS NOT NULL")
    Double averageRatingByMentor(@Param("mid") Long mentorId);

    @Query("SELECT s FROM Session s WHERE s.mentor.id = :mid AND s.studentRating IS NOT NULL ORDER BY s.updatedAt DESC")
    List<Session> findRecentReviewsForMentor(@Param("mid") Long mentorId, Pageable pageable);

    long countByMentor_IdAndStudentRatingIsNotNull(Long mentorId);

    @Query("SELECT COUNT(s) FROM Session s WHERE s.mentor.id = :mid AND s.studentRating IS NOT NULL AND s.studentRating >= 4")
    long countPositiveReviewsForMentor(@Param("mid") Long mentorId);
}
