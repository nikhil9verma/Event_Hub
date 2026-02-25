package com.eventhub.eventhub_backend.dto.response;

import com.eventhub.eventhub_backend.enums.Role;
import lombok.Builder;
import lombok.Data;

@Data @Builder
public class AuthResponse {
    private String token;
    private String type = "Bearer";
    private Long userId;
    private String course;
    private String batch;
    private String name;
    private String email;
    private Role role;
    private String profileImageUrl;
}
