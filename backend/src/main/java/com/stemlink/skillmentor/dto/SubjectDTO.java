package com.stemlink.skillmentor.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class SubjectDTO {

    @NotNull(message = "cannot be null")
    @Size(min = 5, message = "Subject must be at least 5 characters long")
    private String subjectName;

    @Size(max = 100, message = "Description must not exceed 100 characters")
    private String description;

    @NotNull
    private Long mentorId;
}
