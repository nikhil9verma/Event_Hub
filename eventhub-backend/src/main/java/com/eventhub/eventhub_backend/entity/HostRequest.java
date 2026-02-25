package com.eventhub.eventhub_backend.entity;


import com.eventhub.eventhub_backend.enums.HostRequestStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "host_requests")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class HostRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private HostRequestStatus status = HostRequestStatus.PENDING;

    private String reason; // optional message from user

    @CreationTimestamp
    private LocalDateTime requestedAt;

    private LocalDateTime reviewedAt;
}