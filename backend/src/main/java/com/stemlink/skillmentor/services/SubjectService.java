package com.stemlink.skillmentor.services;

import com.stemlink.skillmentor.dto.response.AdminSubjectRowDTO;
import com.stemlink.skillmentor.dto.SubjectDTO;
import com.stemlink.skillmentor.entities.Subject;

import java.util.List;

public interface SubjectService {
    List<Subject> getAllSubjects();
    Subject addNewSubject(Long mentorId, Subject subject);

    /** Subjects joined with mentors for admin UI tables. */
    List<AdminSubjectRowDTO> getAllSubjectsForAdmin();

    Subject getSubjectById(Long id);
    Subject updateSubjectById(Long id, SubjectDTO dto);
    void deleteSubject(Long id);
}
