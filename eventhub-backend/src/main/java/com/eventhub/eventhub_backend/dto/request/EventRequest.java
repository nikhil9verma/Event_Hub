package com.eventhub.eventhub_backend.dto.request;


import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class EventRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 5, max = 200, message = "Title must be between 5 and 200 characters")
    private String title;

    @NotBlank(message = "Description is required")
    @Size(min = 20, max = 2500, message = "Description must be between 20 and 2000 characters")
    private String description;

    @NotNull(message = "Event date is required")
    @Future(message = "Event date must be in the future")
    private LocalDateTime eventDate;

    // Optional — if omitted, service defaults to eventDate + 2 hours
    private LocalDateTime eventEndTime;

    @NotBlank(message = "Venue is required")
    private String venue;

    @NotBlank(message = "Category is required")
    private String category;

    @NotNull(message = "Max participants is required")
    @Min(value = 1, message = "Max participants must be at least 1")
    @Max(value = 10000, message = "Max participants cannot exceed 10000")
    private Integer maxParticipants;

    @NotNull(message = "Registration deadline is required")
    private LocalDateTime registrationDeadline;

    @Min(value = 1) @Max(value = 72)
    private Integer reminderHours ;
}
