package com.eventhub.eventhub_backend.controller;

import com.eventhub.eventhub_backend.dto.response.ApiResponse;
import com.eventhub.eventhub_backend.dto.response.EventResponse;
import com.eventhub.eventhub_backend.service.EventService;
import com.eventhub.eventhub_backend.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/registrations")
@RequiredArgsConstructor
public class RegistrationController {

    private final EventService eventService;
    private final SecurityUtils securityUtils;

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<EventResponse>>> getMyRegistrations() {
        return ResponseEntity.ok(ApiResponse.success(
                eventService.getMyRegistrations(securityUtils.getCurrentUserId())
        ));
    }
}