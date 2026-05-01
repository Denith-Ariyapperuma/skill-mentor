package com.stemlink.skillmentor.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Session material for students (link or downloadable file). No file bytes exposed. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionResourceItemDTO {
    private Long id;
    private String title;
    /** {@code link} or {@code file} */
    private String kind;
    private String linkUrl;
    private String fileName;
    private String mimeType;
}
