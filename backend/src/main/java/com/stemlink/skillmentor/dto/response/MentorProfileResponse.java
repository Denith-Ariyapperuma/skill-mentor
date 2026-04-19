package com.stemlink.skillmentor.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class MentorProfileResponse {
    private Long id;
    private String mentorId;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private String title;
    private String profession;
    private String company;
    private int experienceYears;
    private String bio;
    private String profileImageUrl;
    private Boolean isCertified;
    private String startYear;
    private Double averageRating;
    private long reviewCount;
    private long totalStudentsTaught;
    private long subjectsTaughtCount;
    private Integer positiveReviewPercent;
    private List<SubjectWithEnrollmentDTO> subjects;
    private List<ReviewItemDTO> recentReviews;

    @Data
    @Builder
    public static class SubjectWithEnrollmentDTO {
        private Long id;
        private String subjectName;
        private String description;
        private String courseImageUrl;
        private long enrollmentCount;
    }

    @Data
    @Builder
    public static class ReviewItemDTO {
        private String studentName;
        private int rating;
        private String review;
        private String sessionAt;
    }
}
