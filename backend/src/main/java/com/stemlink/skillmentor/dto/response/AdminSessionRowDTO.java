package com.stemlink.skillmentor.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Date;

@Data
@Builder
public class AdminSessionRowDTO {
    private Integer id;
    private String studentName;
    private String mentorName;
    private String subjectName;
    private Date sessionAt;
    private Integer durationMinutes;
    private String paymentStatus;
    private String sessionStatus;
    private String meetingLink;
    /** True when a slip was uploaded at enrollment (full image loaded via payment-slip endpoint). */
    private boolean hasPaymentSlip;
}
