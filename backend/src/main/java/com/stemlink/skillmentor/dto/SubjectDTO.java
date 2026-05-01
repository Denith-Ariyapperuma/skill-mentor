package com.stemlink.skillmentor.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class SubjectDTO {

    private Long id;

    @NotNull(message = "cannot be null")
    @Size(min = 5, max = 255, message = "Subject name must be 5–255 characters")
    private String subjectName;

    @NotBlank(message = "Description is required")
    @Size(min = 5, max = 255, message = "Description must be 5–255 characters")
    private String description;

    @Size(max = 2048, message = "Course image URL must not exceed 2048 characters")
    private String courseImageUrl;

    @NotNull
    private Long mentorId;

    /** Populated on mentor profile responses — sessions count for this subject */
    private Long enrollmentCount;
}
