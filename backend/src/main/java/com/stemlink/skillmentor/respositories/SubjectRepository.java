package com.stemlink.skillmentor.respositories;

import com.stemlink.skillmentor.entities.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubjectRepository extends JpaRepository<Subject,Long> {

    @Query("select s from Subject s join fetch s.mentor")
    List<Subject> findAllWithMentor();

    boolean existsByMentor_IdAndSubjectNameIgnoreCase(Long mentorId, String subjectName);

    boolean existsByMentor_IdAndSubjectNameIgnoreCaseAndIdNot(
            Long mentorId, String subjectName, Long id);
}
