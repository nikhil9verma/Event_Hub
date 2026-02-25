package com.eventhub.eventhub_backend.dto.response;


import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;


@Data @Builder
public class CommentResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String userImageUrl;
    private String message;
    private LocalDateTime createdAt;
}
