package com.eventhub.eventhub_backend.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class EventRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Event date is required")
    @Future(message = "Event date must be in the future")
    private LocalDateTime eventDate;

    // Optional end time
    private LocalDateTime eventEndTime;

    @NotBlank(message = "Venue is required")
    private String venue;

    @NotBlank(message = "Category is required")
    private String category;

    @NotNull(message = "Max participants is required")
    @Min(value = 1, message = "Max participants must be at least 1")
    private Integer maxParticipants;

    @NotNull(message = "Registration deadline is required")
    @Future(message = "Registration deadline must be in the future")
    private LocalDateTime registrationDeadline;

    @Min(value = 1, message = "Reminder hours must be at least 1")
    private Integer reminderHours;

    // ─── NEW FLEXIBLE FIELDS ───
    private Integer minTeamSize;
    private Integer maxTeamSize;
    private String contactEmail;
    private String prizes;
    private List<EventStageRequest> stages;

    @Data
    public static class EventStageRequest {
        @NotBlank(message = "Stage title is required")
        private String title;
        private String description;
        @NotNull(message = "Stage date is required")
        private LocalDateTime stageDate;
    }
}