package com.eventhub.eventhub_backend.dto.request;


import jakarta.validation.constraints.*;
import lombok.Data;

public class FeedbackRequests {

    @Data
    public static class CommentRequest {
        @NotBlank(message = "Message is required")
        @Size(min = 5, max = 1000, message = "Comment must be between 5 and 1000 characters")
        private String message;
    }

    @Data
    public static class RatingRequest {
        @NotNull(message = "Stars are required")
        @Min(value = 1, message = "Minimum rating is 1")
        @Max(value = 5, message = "Maximum rating is 5")
        private Integer stars;
    }
}
