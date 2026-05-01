package com.stemlink.skillmentor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MentorSessionResourceCreateDTO {

    @NotBlank
    @Size(max = 255)
    private String title;

    /** {@code LINK} or {@code FILE} (case-insensitive). */
    @NotBlank
    @Size(max = 20)
    private String kind;

    @Size(max = 4096)
    private String linkUrl;

    @Size(max = 255)
    private String fileName;

    @Size(max = 120)
    private String mimeType;

    /** Base64 data URL for FILE, e.g. {@code data:application/pdf;base64,...}. */
    private String fileDataUrl;
}
