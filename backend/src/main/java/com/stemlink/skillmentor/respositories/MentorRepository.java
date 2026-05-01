package com.stemlink.skillmentor.respositories;

import com.stemlink.skillmentor.entities.Mentor;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MentorRepository extends JpaRepository<Mentor, Long> {
    @Query("SELECT m FROM Mentor m WHERE LOWER(m.firstName) LIKE LOWER(CONCAT('%', :name, '%')) OR LOWER(m.lastName) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<Mentor> findByName(@Param("name") String name, Pageable pageable);

    Optional<Mentor> findByEmail(String email);

    Optional<Mentor> findByEmailIgnoreCase(String email);

    Optional<Mentor> findByMentorId(String mentorId);

    @Query("SELECT DISTINCT m FROM Mentor m LEFT JOIN FETCH m.subjects WHERE m.id = :id")
    Optional<Mentor> findByIdWithSubjects(@Param("id") Long id);
}
