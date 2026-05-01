package com.stemlink.skillmentor.controllers;

import com.stemlink.skillmentor.dto.SubjectDTO;
import com.stemlink.skillmentor.entities.Subject;
import com.stemlink.skillmentor.services.SubjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.stemlink.skillmentor.constants.UserRoles.ROLE_ADMIN;

@RestController
@RequestMapping(path = "/api/v1/subjects")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class SubjectController extends AbstractController {

    private final ModelMapper modelMapper;
    private final SubjectService subjectService;

    @GetMapping
    public List<Subject> getAllSubjects() {
        return subjectService.getAllSubjects();
    }

    @GetMapping("{id}")
    public Subject getSubjectById(@PathVariable Long id) {
        return subjectService.getSubjectById(id);
    }

//    @PostMapping
//    public Subject createSubject(@Valid @RequestBody Subject subject) {
//        Long mentorId = 1L;
//
//        // check validation
//        if(subject.getSubjectName().length() < 3){
//            return null;
//        }
//        return subjectService.addNewSubject(mentorId, subject);
//    }

    @PostMapping
    @PreAuthorize("hasRole('" + ROLE_ADMIN + "')")
    public Subject createSubject(@Valid @RequestBody SubjectDTO subjectDTO) {
        Subject subject = modelMapper.map(subjectDTO, Subject.class);
        return subjectService.addNewSubject(subjectDTO.getMentorId(), subject);
    }

    @PutMapping("{id}")
    @PreAuthorize("hasRole('" + ROLE_ADMIN + "')")
    public Subject updateSubject(@PathVariable Long id, @Valid @RequestBody SubjectDTO updatedSubjectDTO) {
        return subjectService.updateSubjectById(id, updatedSubjectDTO);
    }

    @DeleteMapping("{id}")
    @PreAuthorize("hasRole('" + ROLE_ADMIN + "')")
    public void deleteSubject(@PathVariable Long id) {
        subjectService.deleteSubject(id);
    }
}
