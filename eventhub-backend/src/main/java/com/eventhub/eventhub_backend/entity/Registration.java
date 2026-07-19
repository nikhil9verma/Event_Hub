package com.eventhub.eventhub_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import com.eventhub.eventhub_backend.enums.RegistrationStatus;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "registrations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "event_id"}),
        indexes = {
            @Index(name = "idx_reg_event_team", columnList = "event_id, teamName"),
            @Index(name = "idx_reg_user_status", columnList = "user_id, status")
        })
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Registration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RegistrationStatus status;
    @Column(name = "team_name")
    private String teamName;
    
    // ───  TEAM MEMBERS FIELD ───
    @OneToMany(mappedBy = "registration", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TeamMember> teamMembers = new ArrayList<>();
    // ──────────────────────────────

    @CreationTimestamp
    private LocalDateTime registeredAt;
}