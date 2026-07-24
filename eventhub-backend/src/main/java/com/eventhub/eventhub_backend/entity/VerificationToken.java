package com.eventhub.eventhub_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "verification_tokens")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    private String name;

    @Builder.Default
    @Column(name = "token")
    private String token = java.util.UUID.randomUUID().toString();

    // --- ADD THESE TWO LINES ---
    private String course;
    private String batch;
    // ---------------------------

    private String password;

    @Column(nullable = false)
    private String otpCode;

    @Column(nullable = false)
    private LocalDateTime expiryDate;

    // --- LEGACY COLUMN FIX ---
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @PrePersist
    public void prePersist() {
        if (this.expiresAt == null) {
            this.expiresAt = this.expiryDate;
        }
    }
    // -------------------------
}