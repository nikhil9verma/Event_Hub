package com.eventhub.eventhub_backend.entity;


import com.eventhub.eventhub_backend.enums.EventStatus;
import com.eventhub.eventhub_backend.enums.RegistrationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDateTime eventDate;

    // FIX 4: eventEndTime allows proper COMPLETED transition.
    // Scheduler compares now() > eventEndTime instead of eventDate,
    // so events are marked COMPLETED only after they fully finish.
    // Defaults to eventDate + 2 hours if not provided.
    @Column(nullable = false)
    private LocalDateTime eventEndTime;

    @Column(nullable = false)
    private String venue;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private Integer maxParticipants;

    @Column(nullable = false)
    private LocalDateTime registrationDeadline;

    private String posterUrl;       // hero image on event detail page

    private String cardImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EventStatus status = EventStatus.ACTIVE;


    private Integer reminderHours = 2;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = true)
    private User host;

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Registration> registrations = new ArrayList<>();

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Comment> comments = new ArrayList<>();

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Rating> ratings = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public long getRegistrationCount() {
        return registrations.stream()
                .filter(r -> r.getStatus() == RegistrationStatus.REGISTERED)
                .count();
    }

    public long getWaitlistCount() {
        return registrations.stream()
                .filter(r -> r.getStatus() == RegistrationStatus.WAITLIST)
                .count();
    }

    public boolean isTrending() {
        return getRegistrationCount() > 50;
    }

    public int getAvailableSeats() {
        return (int) (maxParticipants - getRegistrationCount());
    }
}
