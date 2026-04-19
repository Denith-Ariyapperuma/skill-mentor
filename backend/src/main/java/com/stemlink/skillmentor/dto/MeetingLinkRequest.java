package com.stemlink.skillmentor.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MeetingLinkRequest {
    @NotBlank(message = "Meeting link is required")
    private String meetingLink;
}
