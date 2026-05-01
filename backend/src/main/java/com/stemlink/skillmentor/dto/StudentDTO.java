package com.stemlink.skillmentor.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StudentDTO {

    @Size(max = 255, message = "Learning goals must not exceed 255 characters")
    private String learningGoals;

}
