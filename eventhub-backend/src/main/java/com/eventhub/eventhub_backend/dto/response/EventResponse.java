package com.eventhub.eventhub_backend.dto.response;

import com.eventhub.eventhub_backend.enums.EventStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class EventResponse {
    private Long id;
    private String title;
    private String description;
    private LocalDateTime eventDate;
    private LocalDateTime eventEndTime;
    private String venue;
    private String category;
    private Integer maxParticipants;
    private LocalDateTime registrationDeadline;
    private String posterUrl;
    private String cardImageUrl;
    private EventStatus status;
    private Integer reminderHours;

    private Long hostId;
    private String hostName;
    private String hostImageUrl;

    private long registrationCount;
    private long waitlistCount;
    private int availableSeats;
    private boolean trending;

    private Double averageRating;
    private long ratingCount;
    private boolean requiresRegistration;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private String currentUserRegistrationStatus;

    // ─── NEW FLEXIBLE FIELDS ───
    private Integer minTeamSize;
    private Integer maxTeamSize;
    private String contactEmail;
    private String prizes;
    private List<EventStageResponse> stages;

    @Data
    @Builder
    public static class EventStageResponse {
        private Long id;
        private String title;
        private String description;
        private LocalDateTime stageDate;
    }
}