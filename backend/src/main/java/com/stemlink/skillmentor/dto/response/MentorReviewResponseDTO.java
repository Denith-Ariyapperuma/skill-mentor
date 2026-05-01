package com.stemlink.skillmentor.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Date;

@Data
@Builder
public class MentorReviewResponseDTO {
    private String reviewerName;
    private Integer rating;
    private String comment;
    private Date reviewedAt;
}
