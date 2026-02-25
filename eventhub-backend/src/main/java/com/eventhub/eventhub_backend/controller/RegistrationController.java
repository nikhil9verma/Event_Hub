package com.eventhub.eventhub_backend.controller;


import com.eventhub.eventhub_backend.dto.response.ApiResponse;
import com.eventhub.eventhub_backend.dto.response.RegistrationResponse;
import com.eventhub.eventhub_backend.entity.Registration;
import com.eventhub.eventhub_backend.repository.RegistrationRepository;
import com.eventhub.eventhub_backend.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/registrations")
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationRepository registrationRepository;
    private final SecurityUtils securityUtils;

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<RegistrationResponse>>> getMyRegistrations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Long userId = securityUtils.getCurrentUserId();
        Page<RegistrationResponse> result = registrationRepository
                .findByUserId(userId, PageRequest.of(page, size))
                .map(this::toResponse);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private RegistrationResponse toResponse(Registration r) {
        return RegistrationResponse.builder()
                .id(r.getId())
                .userId(r.getUser().getId())
                .userName(r.getUser().getName())
                .eventId(r.getEvent().getId())
                .eventTitle(r.getEvent().getTitle())
                .status(r.getStatus())
                .registeredAt(r.getRegisteredAt())
                .build();
    }
}
