package com.eventhub.eventhub_backend.dto.response;


import com.eventhub.eventhub_backend.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class UserResponse {
    private Long id;
    private String name;
    private String course;
    private String batch;
    private String email;
    private Role role;
    private String profileImageUrl;
    private LocalDateTime createdAt;
}
