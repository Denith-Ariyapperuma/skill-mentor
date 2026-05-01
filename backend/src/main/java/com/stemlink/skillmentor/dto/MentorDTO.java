package com.stemlink.skillmentor.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class MentorDTO {

    private Long id;

    // Admin-only override fields — if provided by an ADMIN caller, these are used
    // directly instead of extracting identity from the JWT claims. Ignored for MENTOR role.
    private String mentorId;

    @Size(max = 50, message = "First name must not exceed 50 characters")
    private String firstName;

    @Size(max = 50, message = "Last name must not exceed 50 characters")
    private String lastName;

    @Email(message = "Email must be valid")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    private String phoneNumber;

    @Size(max = 100, message = "Title must not exceed 100 characters")
    private String title;

    @Size(max = 100, message = "Profession must not exceed 100 characters")
    private String profession;

    @Size(max = 100, message = "Company must not exceed 100 characters")
    private String company;

    private int experienceYears;

    @Size(max = 255, message = "Bio must not exceed 255 characters")
    private String bio;

    @Size(max = 2048, message = "Profile image URL must not exceed 2048 characters")
    private String profileImageUrl;

    private Integer positiveReviews;

    private Integer totalEnrollments;

    private Boolean isCertified;

    @Size(max = 10, message = "Start year must not exceed 10 characters")
    private String startYear;

    /** Distinct students who had at least one session with this mentor */
    private Integer totalStudentsTaught;

    /** Mean rating from submitted reviews */
    private Double averageRating;

    /** Number of sessions with a rating */
    private Integer reviewCount;

    /** Number of subjects taught */
    private Integer subjectCount;

    /** Percent of reviews with rating >= 4 (0–100); profile enrichment */
    private Double positiveReviewPercent;

    /** Profile detail: subjects including enrollment counts */
    private List<SubjectDTO> subjects;
}
