package com.eventhub.eventhub_backend.dto.response;


import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data @Builder
public class AnalyticsResponse {
    private Long eventId;
    private String eventTitle;
    private long totalRegistrations;
    private long waitlistCount;
    private double fillPercentage;
    private int maxParticipants;
    private int availableSeats;
    private Double averageRating;
    private long ratingCount;
    private List<Map<String, Object>> dailyRegistrationCounts;
}
