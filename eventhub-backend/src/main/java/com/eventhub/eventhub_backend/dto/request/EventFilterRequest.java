package com.eventhub.eventhub_backend.dto.request;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class EventFilterRequest {
    private String search;
    private String category;
    private Boolean available;
    private LocalDateTime dateFrom;
    private LocalDateTime dateTo;
    private Integer page = 0;
    private Integer size = 10;
    private String eventType;
}