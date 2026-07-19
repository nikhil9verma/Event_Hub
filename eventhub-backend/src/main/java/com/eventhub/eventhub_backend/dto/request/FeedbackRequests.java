package com.eventhub.eventhub_backend.dto.request;


import jakarta.validation.constraints.*;
import lombok.Data;

public class FeedbackRequests {

    @Data
    public static class CommentRequest {
        @NotBlank(message = "Message is required")
        @Size(min = 1, max = 1000, message = "Comment must be between 5 and 1000 characters")
        private String message;
    }
}
