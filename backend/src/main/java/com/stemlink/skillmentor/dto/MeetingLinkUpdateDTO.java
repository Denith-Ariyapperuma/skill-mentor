package com.stemlink.skillmentor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MeetingLinkUpdateDTO {

    @NotBlank(message = "Meeting link is required")
    @Size(max = 2048)
    private String meetingLink;
}
