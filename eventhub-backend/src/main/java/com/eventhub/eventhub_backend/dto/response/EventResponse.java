package com.eventhub.eventhub_backend.dto.response;


import com.eventhub.eventhub_backend.enums.EventStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class EventResponse {
    private Long id;
    private String title;
    private String description;
    private LocalDateTime eventDate;
    private String venue;
    private String category;
    private Integer maxParticipants;
    private LocalDateTime registrationDeadline;
    private String cardImageUrl;
    private String posterUrl;
    private EventStatus status;
    private Integer reminderHours;
    private Long hostId;
    private LocalDateTime eventEndTime;
    private String hostName;
    private String hostImageUrl;
    private long registrationCount;
    private long waitlistCount;
    private int availableSeats;
    private boolean trending;
    private Double averageRating;
    private long ratingCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String currentUserRegistrationStatus;
}
