package com.stemlink.skillmentor.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSubjectRowDTO {
    private Long id;
    private String subjectName;
    private String description;
    private String courseImageUrl;
    private Long mentorId;
    private String mentorName;
}
