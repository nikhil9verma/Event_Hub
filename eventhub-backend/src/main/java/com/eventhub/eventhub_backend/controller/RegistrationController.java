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

@RestController
@RequestMapping("/registrations")
@RequiredArgsConstructor
public class RegistrationController {

    private final EventService eventService;
    private final SecurityUtils securityUtils;

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<EventResponse>>> getMyRegistrations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Long currentUserId = securityUtils.getCurrentUserId();

        return ResponseEntity.ok(ApiResponse.success(
                eventService.getMyRegistrations(currentUserId, page, size)
        ));
    }
}