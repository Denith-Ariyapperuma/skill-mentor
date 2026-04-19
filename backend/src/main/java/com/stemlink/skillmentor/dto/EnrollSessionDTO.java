package com.stemlink.skillmentor.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Date;

@Data
public class EnrollSessionDTO {

    /** Database primary key of the mentor row */
    @NotNull(message = "Mentor ID is required")
    private Long mentorId;

    @NotNull(message = "Subject ID is required")
    private Long subjectId;

    @NotNull(message = "Session date/time is required")
    private Date sessionAt;

    @Min(value = 1, message = "Duration must be at least 1 minute")
    private Integer durationMinutes;
}
