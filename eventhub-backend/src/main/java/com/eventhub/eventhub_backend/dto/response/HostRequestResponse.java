package com.eventhub.eventhub_backend.dto.response;


import com.eventhub.eventhub_backend.enums.HostRequestStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class HostRequestResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private HostRequestStatus status;
    private String reason;
    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;
}