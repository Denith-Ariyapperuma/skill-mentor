package com.stemlink.skillmentor.respositories;

import com.stemlink.skillmentor.entities.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SessionRepository extends JpaRepository<Session, Integer> {
    List<Session> findByStudent_Email(String email);

    /** Soonest scheduled session first (student My Courses ordering). */
    List<Session> findByStudent_EmailOrderBySessionAtAsc(String email);

    @Query("SELECT s FROM Session s JOIN FETCH s.student JOIN FETCH s.mentor JOIN FETCH s.subject")
    List<Session> findAllWithRelations();

    List<Session> findByStudent_Id(Integer studentId);

    List<Session> findByMentor_Id(Long mentorId);

    long countBySubject_Id(Long subjectId);

    @Query("SELECT COUNT(DISTINCT s.student.id) FROM Session s WHERE s.mentor.id = :mentorId")
    long countDistinctStudentsByMentor_Id(@Param("mentorId") Long mentorId);

    @Query("SELECT COALESCE(AVG(s.studentRating), 0.0) FROM Session s WHERE s.mentor.id = :mentorId AND s.studentRating IS NOT NULL")
    Double averageRatingByMentor_Id(@Param("mentorId") Long mentorId);

    @Query("SELECT COUNT(s) FROM Session s WHERE s.mentor.id = :mentorId AND s.studentRating IS NOT NULL")
    long countReviewsByMentor_Id(@Param("mentorId") Long mentorId);

    @Query("SELECT COUNT(s) FROM Session s WHERE s.mentor.id = :mentorId AND s.studentRating >= 4")
    long countPositiveReviewsByMentor_Id(@Param("mentorId") Long mentorId);

    @Query("SELECT s FROM Session s JOIN FETCH s.student WHERE s.mentor.id = :mentorId AND s.studentRating IS NOT NULL ORDER BY s.updatedAt DESC")
    List<Session> findRatedSessionsForMentor(@Param("mentorId") Long mentorId);

    @Query("SELECT s FROM Session s JOIN FETCH s.student JOIN FETCH s.subject WHERE s.mentor.id = :mentorId ORDER BY s.sessionAt DESC")
    List<Session> findDashboardSessionsForMentor(@Param("mentorId") Long mentorId);
}
