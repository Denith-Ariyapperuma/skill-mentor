package com.stemlink.skillmentor.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.util.Date;

@Entity
@Table(name = "session_resource")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionResource implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonIgnore
    private Session session;

    @Column(nullable = false, length = 255)
    private String title;

    /** {@code LINK} — external URL; {@code FILE} — blob stored as data URL in {@link #fileData}. */
    @Column(nullable = false, length = 20)
    private String kind;

    @Column(name = "link_url", length = 4096)
    private String linkUrl;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "mime_type", length = 120)
    private String mimeType;

    @Column(name = "file_data", columnDefinition = "TEXT")
    private String fileData;

    @CreationTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at", nullable = false, updatable = false)
    private Date createdAt;
}
