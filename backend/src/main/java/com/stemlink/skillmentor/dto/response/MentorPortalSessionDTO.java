package com.stemlink.skillmentor.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MentorPortalSessionDTO {
    private Integer id;
    private String studentName;
    private String studentEmail;
    private String subjectName;
    private Date sessionAt;
    private Integer durationMinutes;
    private String paymentStatus;
    private String sessionStatus;
    private String meetingLink;
    private List<SessionResourceItemDTO> resources;
}
