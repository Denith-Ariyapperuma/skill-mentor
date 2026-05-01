package com.stemlink.skillmentor.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class SubjectDTO {

    private Long id;

    @NotNull(message = "cannot be null")
    @Size(min = 5, message = "Subject must be at least 5 characters long")
    private String subjectName;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    private String courseImageUrl;

    @NotNull
    private Long mentorId;

    /** Populated on mentor profile responses — sessions count for this subject */
    private Long enrollmentCount;
}
