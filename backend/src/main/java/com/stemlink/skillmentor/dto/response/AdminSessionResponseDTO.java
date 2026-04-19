package com.stemlink.skillmentor.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Date;

@Data
@Builder
public class AdminSessionResponseDTO {
    private Integer id;
    private String studentFirstName;
    private String studentLastName;
    private String studentEmail;
    private String mentorFirstName;
    private String mentorLastName;
    private String subjectName;
    private Date sessionAt;
    private Integer durationMinutes;
    private String paymentStatus;
    private String sessionStatus;
    private String meetingLink;
}
