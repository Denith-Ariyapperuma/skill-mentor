package com.stemlink.skillmentor.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MentorPortalContextDTO {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String title;
}
