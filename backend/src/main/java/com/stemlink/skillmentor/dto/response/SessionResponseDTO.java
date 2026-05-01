package com.stemlink.skillmentor.dto.response;

import lombok.Data;

import java.util.Date;
import java.util.List;

@Data
public class SessionResponseDTO {
    private Integer id;
    private Long mentorId;
    private Long subjectId;
    private String mentorName;
    private String mentorProfileImageUrl;
    private String subjectName;
    private String subjectDescription;
    private String courseImageUrl;
    private Date sessionAt;
    private Integer durationMinutes;
    private String sessionStatus;
    private String paymentStatus;
    private String meetingLink;
    /** Materials added by the mentor (links + files). */
    private List<SessionResourceItemDTO> resources;
}
