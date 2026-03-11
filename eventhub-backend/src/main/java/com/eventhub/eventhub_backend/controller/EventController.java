package com.eventhub.eventhub_backend.controller;

import com.eventhub.eventhub_backend.dto.request.EventFilterRequest;
import com.eventhub.eventhub_backend.dto.request.EventRequest;
import com.eventhub.eventhub_backend.dto.request.FeedbackRequests;
import com.eventhub.eventhub_backend.dto.request.TeamRegistrationRequest; // NEW IMPORT
import com.eventhub.eventhub_backend.dto.response.*;
import com.eventhub.eventhub_backend.service.EventService;
import com.eventhub.eventhub_backend.service.FeedbackService;
import com.eventhub.eventhub_backend.service.FileStorageService;
import com.eventhub.eventhub_backend.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final FeedbackService feedbackService;
    private final FileStorageService fileStorageService;
    private final SecurityUtils securityUtils;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<EventResponse>>> getEvents(EventFilterRequest filter) {
        Long userId = tryGetUserId();
        return ResponseEntity.ok(ApiResponse.success(eventService.getEvents(filter, userId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EventResponse>> getEvent(@PathVariable Long id) {
        Long userId = tryGetUserId();
        return ResponseEntity.ok(ApiResponse.success(eventService.getEventById(id, userId)));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('HOST', 'SUPER_ADMIN', 'ROLE_HOST', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<EventResponse>> createEvent(@Valid @RequestBody EventRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.success("Event created",
                eventService.createEvent(securityUtils.getCurrentUserId(), request)));
    }

    @GetMapping("/{id}/attendees")
    @PreAuthorize("hasAnyRole('HOST', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<AttendeeResponse>>> getAttendees(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                eventService.getEventAttendees(id, securityUtils.getCurrentUserId())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('HOST', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<EventResponse>> updateEvent(
            @PathVariable Long id, @Valid @RequestBody EventRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Event updated",
                eventService.updateEvent(id, securityUtils.getCurrentUserId(), request)));
    }

    @PostMapping("/{id}/poster")
    @PreAuthorize("hasAnyRole('HOST', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<EventResponse>> uploadPoster(
            @PathVariable Long id, @RequestParam("file") MultipartFile file) {
        String url = fileStorageService.storeFile(file, "posters");
        return ResponseEntity.ok(ApiResponse.success("Poster uploaded",
                eventService.uploadPoster(id, securityUtils.getCurrentUserId(), url)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEvent(@PathVariable Long id, Principal principal) {
        eventService.deleteEvent(id, principal.getName());
        return ResponseEntity.ok().body(Map.of("message", "Event deleted successfully"));
    }

    // ─── UPDATED: NOW ACCEPTS TEAM DATA ───
    @PostMapping("/{id}/register")
    public ResponseEntity<ApiResponse<EventService.RegistrationResponse>> register(
            @PathVariable Long id,
            @RequestBody(required = false) @Valid TeamRegistrationRequest request) {

        return ResponseEntity.ok(ApiResponse.success("Registration successful",
                eventService.registerForEvent(id, securityUtils.getCurrentUserId(), request)));
    }

    @DeleteMapping("/{id}/register")
    public ResponseEntity<ApiResponse<Void>> cancelRegistration(@PathVariable Long id) {
        eventService.cancelRegistration(id, securityUtils.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success("Registration cancelled", null));
    }

    @GetMapping("/{id}/analytics")
    @PreAuthorize("hasAnyRole('HOST', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<AnalyticsResponse>> getAnalytics(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                eventService.getAnalytics(id, securityUtils.getCurrentUserId())));
    }

    @GetMapping("/my-events")
    @PreAuthorize("hasAnyRole('HOST', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Page<EventResponse>>> getMyEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                eventService.getHostEvents(securityUtils.getCurrentUserId(), page, size)));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(
            @PathVariable Long id, @Valid @RequestBody FeedbackRequests.CommentRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.success("Comment added",
                feedbackService.addComment(id, securityUtils.getCurrentUserId(), request)));
    }

    @PostMapping("/{id}/card-image")
    @PreAuthorize("hasAnyRole('HOST', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<EventResponse>> uploadCardImage(
            @PathVariable Long id, @RequestParam("file") MultipartFile file) {
        String url = fileStorageService.storeFile(file, "cards");
        return ResponseEntity.ok(ApiResponse.success("Card image uploaded",
                eventService.uploadCardImage(id, securityUtils.getCurrentUserId(), url)));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<Page<CommentResponse>>> getComments(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(feedbackService.getComments(id, page, size)));
    }

    @PostMapping("/{id}/rating")
    public ResponseEntity<ApiResponse<RatingResponse>> rateEvent(
            @PathVariable Long id, @Valid @RequestBody FeedbackRequests.RatingRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Rating submitted",
                feedbackService.addOrUpdateRating(id, securityUtils.getCurrentUserId(), request)));
    }

    private Long tryGetUserId() {
        try {
            return securityUtils.getCurrentUserId();
        } catch (Exception e) {
            return null;
        }
    }
}