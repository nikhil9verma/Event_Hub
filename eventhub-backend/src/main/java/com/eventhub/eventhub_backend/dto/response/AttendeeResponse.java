package com.eventhub.eventhub_backend.dto.response;

import com.eventhub.eventhub_backend.enums.RegistrationStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data @Builder
public class AttendeeResponse {
    private Long userId;
    private String name;
    private String email;
    private String course;
    private String batch;
    private RegistrationStatus status;
    private LocalDateTime registeredAt;
}