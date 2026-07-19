package com.eventhub.eventhub_backend.controller;

import com.eventhub.eventhub_backend.dto.request.EventFilterRequest;
import com.eventhub.eventhub_backend.dto.request.EventRequest;
import com.eventhub.eventhub_backend.dto.request.FeedbackRequests;
import com.eventhub.eventhub_backend.dto.request.TeamRegistrationRequest;
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
    @PreAuthorize("hasAnyRole('HOST', 'SUPER_ADMIN')")
    public ResponseEntity<?> deleteEvent(@PathVariable Long id) {
        eventService.deleteEvent(id, securityUtils.getCurrentUserId());
        return ResponseEntity.ok().body(Map.of("message", "Event deleted successfully"));
    }

    // ─── REGISTRATION & TEAM MANAGEMENT (NO CANCELLATIONS) ───

    @PostMapping("/{id}/register")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<EventService.RegistrationResponse>> register(
            @PathVariable Long id,
            @RequestBody(required = false) @Valid TeamRegistrationRequest request) {

        return ResponseEntity.ok(ApiResponse.success("Registration successful",
                eventService.registerForEvent(id, securityUtils.getCurrentUserId(), request)));
    }

    @DeleteMapping("/{id}/register")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> cancelRegistration(@PathVariable Long id) {
        eventService.cancelRegistration(id, securityUtils.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success("Registration cancelled successfully", null));
    }

    @GetMapping(value = "/{id}/attendees/export", produces = "text/csv")
    @PreAuthorize("hasAnyRole('HOST', 'SUPER_ADMIN')")
    public ResponseEntity<String> exportAttendees(@PathVariable Long id) {
        List<AttendeeResponse> attendees = eventService.getEventAttendees(id, securityUtils.getCurrentUserId());
        
        StringBuilder csv = new StringBuilder();
        csv.append("Name,Email,Course,Batch,Team Name,Status,Registered Date,Registered Time\n");
        
        java.util.Set<String> exportedEmails = new java.util.HashSet<>();
        
        for (AttendeeResponse attendee : attendees) {
            if (attendee.getStatus() != null && "PENDING_INVITATION".equals(attendee.getStatus().name())) {
                continue;
            }
            if (!exportedEmails.add(attendee.getEmail())) {
                continue;
            }

            String regDate = attendee.getRegisteredAt() != null ? attendee.getRegisteredAt().toLocalDate().toString() : "";
            String regTime = attendee.getRegisteredAt() != null ? attendee.getRegisteredAt().toLocalTime().toString() : "";
            
            csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                    escapeCsv(attendee.getName()),
                    escapeCsv(attendee.getEmail()),
                    escapeCsv(attendee.getCourse()),
                    escapeCsv(attendee.getBatch()),
                    escapeCsv(attendee.getTeamName()),
                    attendee.getStatus() != null ? attendee.getStatus().name() : "",
                    regDate,
                    regTime));
                    
            if (attendee.getTeammates() != null) {
                for (AttendeeResponse.TeamMemberResponse tm : attendee.getTeammates()) {
                    if (!exportedEmails.add(tm.getEmail())) {
                        continue;
                    }
                    csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                            escapeCsv(tm.getName()),
                            escapeCsv(tm.getEmail()),
                            "N/A",
                            "N/A",
                            escapeCsv(attendee.getTeamName()),
                            attendee.getStatus() != null ? attendee.getStatus().name() : "",
                            regDate,
                            regTime));
                }
            }
        }
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=attendees_event_" + id + ".csv");
        
        return new ResponseEntity<>(csv.toString(), headers, org.springframework.http.HttpStatus.OK);
    }

    @PostMapping("/{id}/team/accept")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> acceptTeamInvite(@PathVariable Long id) {
        eventService.acceptTeamInvitation(id, securityUtils.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success("Team invitation accepted", null));
    }

    @GetMapping("/{id}/team")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyTeam(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                eventService.getMyTeam(id, securityUtils.getCurrentUserId())));
    }

    @PostMapping("/{id}/team/add")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> addTeamMembers(
            @PathVariable Long id,
            @RequestBody Map<String, List<String>> request) {
        eventService.addTeamMembers(id, securityUtils.getCurrentUserId(), request.get("emails"));
        return ResponseEntity.ok(ApiResponse.success("Teammates invited successfully", null));
    }

    @DeleteMapping("/{id}/team/decline")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> declineTeamInvite(@PathVariable Long id) {
        eventService.declineTeamInvitation(id, securityUtils.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success("Team invitation declined", null));
    }

    // ─── ANALYTICS & FEEDBACK ───

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
    @PreAuthorize("isAuthenticated()")
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

    

    private Long tryGetUserId() {
        try {
            return securityUtils.getCurrentUserId();
        } catch (Exception e) {
            return null;
        }
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        return value.replace("\"", "\"\"");
    }
}