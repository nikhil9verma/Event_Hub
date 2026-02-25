package com.eventhub.eventhub_backend.dto.response;


import com.eventhub.eventhub_backend.enums.RegistrationStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class RegistrationResponse {
    private Long id;
    private Long userId;
    private String userName;
    private Long eventId;
    private String eventTitle;
    private RegistrationStatus status;
    private LocalDateTime registeredAt;
}
