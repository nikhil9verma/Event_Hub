package com.eventhub.eventhub_backend.dto.response;

import com.eventhub.eventhub_backend.enums.RegistrationStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AttendeeResponse {
    private Long userId;
    private String name;
    private String email;
    private String course;
    private String batch;
    private RegistrationStatus status;
    private LocalDateTime registeredAt;
    private String teamName;
    private List<TeamMemberResponse> teammates;

    @Data
    @Builder
    public static class TeamMemberResponse {
        private String name;
        private String email;
    }
}