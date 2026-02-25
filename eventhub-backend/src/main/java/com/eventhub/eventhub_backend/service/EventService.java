package com.eventhub.eventhub_backend.service;

import com.eventhub.eventhub_backend.dto.request.EventFilterRequest;
import com.eventhub.eventhub_backend.dto.request.EventRequest;
import com.eventhub.eventhub_backend.dto.response.AnalyticsResponse;
import com.eventhub.eventhub_backend.dto.response.AttendeeResponse;
import com.eventhub.eventhub_backend.dto.response.EventResponse;
import com.eventhub.eventhub_backend.entity.Event;
import com.eventhub.eventhub_backend.entity.Registration;
import com.eventhub.eventhub_backend.entity.User;
import com.eventhub.eventhub_backend.enums.EventStatus;
import com.eventhub.eventhub_backend.enums.RegistrationStatus;
import com.eventhub.eventhub_backend.enums.Role;
import com.eventhub.eventhub_backend.exception.BusinessException;
import com.eventhub.eventhub_backend.exception.ResourceNotFoundException;
import com.eventhub.eventhub_backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final RegistrationRepository registrationRepository;
    private final RatingRepository ratingRepository;
    private final FileStorageService fileStorageService;
    private final EmailService emailService;
    private final NotificationService notificationService;

    @Transactional
    public EventResponse createEvent(Long hostId, EventRequest request) {
        User host = userRepository.findByIdAndDeletedFalse(hostId)
                .orElseThrow(() -> new ResourceNotFoundException("Host not found"));

        if (host.getRole() != Role.HOST && host.getRole() != Role.SUPER_ADMIN) {
            throw new BusinessException("Only hosts can create events");
        }

        if (request.getRegistrationDeadline().isAfter(request.getEventDate())) {
            throw new BusinessException("Registration deadline must be before event date");
        }

        // FIX 4: Default eventEndTime to eventDate + 2 hours if not provided
        LocalDateTime endTime = request.getEventEndTime() != null
                ? request.getEventEndTime()
                : request.getEventDate().plusHours(2);

        Event event = Event.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .eventDate(request.getEventDate())
                .eventEndTime(endTime)
                .venue(request.getVenue())
                .category(request.getCategory())
                .maxParticipants(request.getMaxParticipants())
                .registrationDeadline(request.getRegistrationDeadline())
                .reminderHours(request.getReminderHours())
                .host(host)
                .status(EventStatus.ACTIVE)
                .build();

        Event saved = eventRepository.save(event);
        emailService.sendEventCreatedConfirmation(host, saved);
        return toResponse(saved, Optional.empty());
    }
    // Add this method anywhere inside EventService.java
    public List<AttendeeResponse> getEventAttendees(Long eventId, Long hostId) {
        Event event = getEventOrThrow(eventId);
        verifyHostOwnership(event, hostId); // Security check!

        return registrationRepository.findByEventIdOrderByRegisteredAtDesc(eventId).stream()
                .map(reg -> AttendeeResponse.builder()
                        .userId(reg.getUser().getId())
                        .name(reg.getUser().getName())
                        .email(reg.getUser().getEmail())
                        .course(reg.getUser().getCourse())
                        .batch(reg.getUser().getBatch())
                        .status(reg.getStatus())
                        .registeredAt(reg.getRegisteredAt())
                        .build())
                .toList();
    }
    @Transactional
    public EventResponse updateEvent(Long eventId, Long hostId, EventRequest request) {
        Event event = getEventOrThrow(eventId);
        verifyHostOwnership(event, hostId);

        if (event.getStatus() == EventStatus.COMPLETED || event.getStatus() == EventStatus.SUSPENDED) {
            throw new BusinessException("Cannot edit a completed or suspended event");
        }

        LocalDateTime endTime = request.getEventEndTime() != null
                ? request.getEventEndTime()
                : request.getEventDate().plusHours(2);

        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setEventDate(request.getEventDate());
        event.setEventEndTime(endTime);
        event.setVenue(request.getVenue());
        event.setCategory(request.getCategory());
        event.setMaxParticipants(request.getMaxParticipants());
        event.setRegistrationDeadline(request.getRegistrationDeadline());
        event.setReminderHours(request.getReminderHours());

        updateEventStatus(event);
        return toResponse(eventRepository.save(event), Optional.empty());
    }

    @Transactional
    public EventResponse uploadPoster(Long eventId, Long hostId, String fileUrl) {
        Event event = getEventOrThrow(eventId);
        verifyHostOwnership(event, hostId);

        if (event.getPosterUrl() != null) {
            fileStorageService.deleteFile(event.getPosterUrl());
        }
        event.setPosterUrl(fileUrl);
        return toResponse(eventRepository.save(event), Optional.empty());
    }

    public Page<EventResponse> getEvents(EventFilterRequest filter, @Nullable Long currentUserId) {
        // Pass currentUserId into the specification builder
        Specification<Event> spec = buildSpecification(filter, currentUserId);

        // Remove the hardcoded Sort here. The Specification will handle the sorting now.
        PageRequest pageable = PageRequest.of(filter.getPage(), filter.getSize());

        return eventRepository.findAll(spec, pageable)
                .map(event -> toResponse(event, Optional.ofNullable(currentUserId)));
    }

    public EventResponse getEventById(Long eventId, @Nullable Long currentUserId) {
        Event event = getEventOrThrow(eventId);
        return toResponse(event, Optional.ofNullable(currentUserId));
    }

    public Page<EventResponse> getHostEvents(Long hostId, int page, int size) {
        return eventRepository.findByHostId(hostId, PageRequest.of(page, size))
                .map(event -> toResponse(event, Optional.empty()));
    }

    @Transactional
    public RegistrationResponse registerForEvent(Long eventId, Long userId) {
        Event event = getEventOrThrow(eventId);
        User user = userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (event.getStatus() == EventStatus.SUSPENDED || event.getStatus() == EventStatus.COMPLETED) {
            throw new BusinessException("Cannot register for this event");
        }

        if (LocalDateTime.now().isAfter(event.getRegistrationDeadline())) {
            throw new BusinessException("Registration deadline has passed");
        }

        Optional<Registration> existing = registrationRepository.findByUserIdAndEventId(userId, eventId);
        if (existing.isPresent()) {
            RegistrationStatus existingStatus = existing.get().getStatus();
            if (existingStatus == RegistrationStatus.REGISTERED || existingStatus == RegistrationStatus.WAITLIST) {
                throw new BusinessException("You are already registered or on waitlist for this event");
            }
            // Re-registration after cancellation: delete old record and re-insert
            // so @CreationTimestamp fires correctly on the new INSERT
            registrationRepository.delete(existing.get());
            registrationRepository.flush();

            RegistrationStatus newStatus = determineStatus(event);
            Registration fresh = Registration.builder()
                    .user(user).event(event).status(newStatus).build();

            Registration saved = registrationRepository.save(fresh);
            handlePostRegistration(user, event, newStatus);
            updateEventStatus(event);
            eventRepository.save(event);
            return toRegResponse(saved);
        }

        RegistrationStatus status = determineStatus(event);
        Registration registration = Registration.builder()
                .user(user).event(event).status(status).build();

        Registration saved = registrationRepository.save(registration);
        handlePostRegistration(user, event, status);
        updateEventStatus(event);
        eventRepository.save(event);
        return toRegResponse(saved);
    }

    @Transactional
    public void cancelRegistration(Long eventId, Long userId) {
        Event event = getEventOrThrow(eventId);

        if (LocalDateTime.now().isAfter(event.getEventDate())) {
            throw new BusinessException("Cannot cancel registration after event has started");
        }

        Registration registration = registrationRepository.findByUserIdAndEventId(userId, eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found"));

        if (registration.getStatus() == RegistrationStatus.CANCELLED) {
            throw new BusinessException("Registration is already cancelled");
        }

        boolean wasRegistered = registration.getStatus() == RegistrationStatus.REGISTERED;
        registration.setStatus(RegistrationStatus.CANCELLED);
        registrationRepository.save(registration);

        if (wasRegistered) {
            promoteFromWaitlist(event);
        }

        updateEventStatus(event);
        eventRepository.save(event);
    }

    @Transactional
    public void promoteFromWaitlist(Event event) {
        List<Registration> waitlist = registrationRepository.findWaitlistByEventIdOrdered(event.getId());
        long registered = registrationRepository.countByEventIdAndStatus(event.getId(), RegistrationStatus.REGISTERED);

        if (registered < event.getMaxParticipants() && !waitlist.isEmpty()) {
            Registration toPromote = waitlist.get(0);
            toPromote.setStatus(RegistrationStatus.REGISTERED);
            registrationRepository.save(toPromote);

            emailService.sendWaitlistPromotion(toPromote.getUser(), event);
            notificationService.createNotification(
                    toPromote.getUser().getId(),
                    "You got a spot! 🎊",
                    "You've been promoted from the waitlist for: " + event.getTitle()
            );
            log.info("Promoted user {} from waitlist for event {}", toPromote.getUser().getId(), event.getId());
        }
    }

    @Transactional
    public void suspendHostEvents(Long hostId) {
        List<Event> events = new ArrayList<>(eventRepository.findByHostIdAndStatus(hostId, EventStatus.ACTIVE));
        events.addAll(eventRepository.findByHostIdAndStatus(hostId, EventStatus.FULL));
        events.forEach(event -> {
            event.setStatus(EventStatus.SUSPENDED);
            eventRepository.save(event);
        });
    }

    public AnalyticsResponse getAnalytics(Long eventId, Long hostId) {
        Event event = getEventOrThrow(eventId);
        verifyHostOwnership(event, hostId);

        long totalRegistrations = registrationRepository.countByEventIdAndStatus(eventId, RegistrationStatus.REGISTERED);
        long waitlistCount = registrationRepository.countByEventIdAndStatus(eventId, RegistrationStatus.WAITLIST);
        double fillPercentage = event.getMaxParticipants() > 0
                ? (totalRegistrations * 100.0) / event.getMaxParticipants()
                : 0;

        Double avgRating = ratingRepository.findAverageRatingByEventId(eventId);
        long ratingCount = ratingRepository.countByEventId(eventId);

        List<Object[]> rawCounts = registrationRepository.findDailyRegistrationCounts(eventId);
        List<Map<String, Object>> daily = rawCounts.stream().map(row -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("date", row[0].toString());
            map.put("count", row[1]);
            return map;
        }).toList();

        return AnalyticsResponse.builder()
                .eventId(eventId)
                .eventTitle(event.getTitle())
                .totalRegistrations(totalRegistrations)
                .waitlistCount(waitlistCount)
                .fillPercentage(Math.round(fillPercentage * 10.0) / 10.0)
                .maxParticipants(event.getMaxParticipants())
                .availableSeats(event.getAvailableSeats())
                .averageRating(avgRating)
                .ratingCount(ratingCount)
                .dailyRegistrationCounts(daily)
                .build();
    }

    // FIX 4: Use eventEndTime instead of eventDate for COMPLETED transition.
    // Previously events were marked COMPLETED as soon as they started (eventDate < now),
    // which prevented users from commenting immediately after attending.
    // Now we wait until the event has actually ended (eventEndTime < now).
    @Transactional
    public void markExpiredEventsCompleted() {
        List<Event> expired = eventRepository.findExpiredActiveEvents(LocalDateTime.now());
        expired.forEach(event -> {
            event.setStatus(EventStatus.COMPLETED);
            eventRepository.save(event);
        });
        if (!expired.isEmpty()) {
            log.info("Marked {} events as COMPLETED", expired.size());
        }
    }

    @Transactional
    public void detachHostFromEvents(Long hostId) {
        // Nullify host FK on all this user's events so the user row can be
        // hard deleted without violating the FK constraint. Events stay in DB
        // (as SUSPENDED) so other users' registration history is preserved.
        eventRepository.detachHostFromAllEvents(hostId);
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    private RegistrationStatus determineStatus(Event event) {
        long registered = registrationRepository.countByEventIdAndStatus(event.getId(), RegistrationStatus.REGISTERED);
        return registered < event.getMaxParticipants() ? RegistrationStatus.REGISTERED : RegistrationStatus.WAITLIST;
    }

    private void handlePostRegistration(User user, Event event, RegistrationStatus status) {
        if (status == RegistrationStatus.REGISTERED) {
            emailService.sendRegistrationConfirmation(user, event);
            notificationService.createNotification(user.getId(), "Registration Confirmed ✅",
                    "You're registered for: " + event.getTitle());
        } else {
            emailService.sendWaitlistConfirmation(user, event);
            notificationService.createNotification(user.getId(), "Added to Waitlist ⏳",
                    "You're on the waitlist for: " + event.getTitle());
        }
    }

    private void updateEventStatus(Event event) {
        if (event.getStatus() == EventStatus.SUSPENDED || event.getStatus() == EventStatus.COMPLETED) return;
        long registered = registrationRepository.countByEventIdAndStatus(event.getId(), RegistrationStatus.REGISTERED);
        if (registered >= event.getMaxParticipants()) {
            event.setStatus(EventStatus.FULL);
        } else {
            event.setStatus(EventStatus.ACTIVE);
        }
    }

    private Specification<Event> buildSpecification(EventFilterRequest filter, @Nullable Long currentUserId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            LocalDateTime now = LocalDateTime.now();

            // Keep SUSPENDED events hidden
            predicates.add(cb.notEqual(root.get("status"), EventStatus.SUSPENDED));

            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("title")),
                        "%" + filter.getSearch().toLowerCase() + "%"));
            }

            if (filter.getCategory() != null && !filter.getCategory().isBlank()) {
                predicates.add(cb.equal(root.get("category"), filter.getCategory()));
            }

            if (Boolean.TRUE.equals(filter.getAvailable())) {
                predicates.add(cb.equal(root.get("status"), EventStatus.ACTIVE));
            }

            if (filter.getDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<LocalDateTime>get("eventDate"), filter.getDateFrom()));
            }

            if (filter.getDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.<LocalDateTime>get("eventDate"), filter.getDateTo()));
            }

            // --- ADVANCED DYNAMIC SORTING LOGIC ---

            // 1. Group Events into Phases (0 = Open, 1 = Reg Closed, 2 = Completed)
            Expression<Integer> eventPhase = cb.<Integer>selectCase()
                    .when(cb.equal(root.get("status"), EventStatus.COMPLETED), 2)
                    .when(cb.lessThan(root.<LocalDateTime>get("registrationDeadline"), now), 1)
                    .otherwise(0);

            // 2. Create Date column for Active events (We will sort this Ascending)
            Expression<LocalDateTime> activeDateSort = cb.<LocalDateTime>selectCase()
                    .when(cb.notEqual(root.get("status"), EventStatus.COMPLETED), root.<LocalDateTime>get("eventDate"))
                    .otherwise(cb.nullLiteral(LocalDateTime.class));

            // 3. Create Date column for Completed events (We will sort this Descending)
            Expression<LocalDateTime> completedDateSort = cb.<LocalDateTime>selectCase()
                    .when(cb.equal(root.get("status"), EventStatus.COMPLETED), root.<LocalDateTime>get("eventDate"))
                    .otherwise(cb.nullLiteral(LocalDateTime.class));

            if (currentUserId != null) {
                Join<Event, Registration> regJoin = root.join("registrations", JoinType.LEFT);
                regJoin.on(
                        cb.equal(regJoin.get("user").get("id"), currentUserId),
                        cb.equal(regJoin.get("status"), RegistrationStatus.REGISTERED)
                );

                // 4. Is the user registered?
                // Notice the extra rule: It only equals 1 if the event is NOT completed.
                // This ensures that when an event completes or a user cancels, it drops back to normal sorting.
                Expression<Integer> isRegistered = cb.<Integer>selectCase()
                        .when(cb.and(
                                cb.isNotNull(regJoin.get("id")),
                                cb.notEqual(root.get("status"), EventStatus.COMPLETED)
                        ), 1)
                        .otherwise(0);

                query.orderBy(
                        cb.asc(eventPhase),           // Priority 1: Open -> Closed -> Completed
                        cb.desc(isRegistered),        // Priority 2: Push registered to the top of their current bucket
                        cb.asc(activeDateSort),       // Priority 3: Active events sort closest-date-first
                        cb.desc(completedDateSort)    // Priority 4: Completed events sort latest-date-first
                );
            } else {
                // Sorting for visitors who are not logged in
                query.orderBy(
                        cb.asc(eventPhase),
                        cb.asc(activeDateSort),
                        cb.desc(completedDateSort)
                );
            }
            // --------------------------------------

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Event getEventOrThrow(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + eventId));
    }

    private void verifyHostOwnership(Event event, Long hostId) {
        User host = userRepository.findByIdAndDeletedFalse(hostId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!event.getHost().getId().equals(hostId) && host.getRole() != Role.SUPER_ADMIN) {
            throw new BusinessException("You are not authorized to manage this event");
        }
    }

    public EventResponse toResponse(Event event, Optional<Long> currentUserId) {
        Double avgRating = ratingRepository.findAverageRatingByEventId(event.getId());
        long ratingCount = ratingRepository.countByEventId(event.getId());

        String userRegStatus = currentUserId
                .flatMap(uid -> registrationRepository.findByUserIdAndEventId(uid, event.getId()))
                .map(r -> r.getStatus().name())
                .orElse(null);

        return EventResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .eventDate(event.getEventDate())
                .eventEndTime(event.getEventEndTime())
                .venue(event.getVenue())
                .category(event.getCategory())
                .maxParticipants(event.getMaxParticipants())
                .registrationDeadline(event.getRegistrationDeadline())
                .posterUrl(event.getPosterUrl())
                .status(event.getStatus())
                .cardImageUrl(event.getCardImageUrl())
                .reminderHours(event.getReminderHours())
                .hostId(event.getHost() != null ? event.getHost().getId() : null)
                .hostName(event.getHost() != null ? event.getHost().getName() : "Deleted User")
                .hostImageUrl(event.getHost() != null ? event.getHost().getProfileImageUrl() : null)
                .registrationCount(event.getRegistrationCount())
                .waitlistCount(event.getWaitlistCount())
                .availableSeats(event.getAvailableSeats())
                .trending(event.isTrending())
                .averageRating(avgRating)
                .ratingCount(ratingCount)
                .createdAt(event.getCreatedAt())
                .updatedAt(event.getUpdatedAt())
                .currentUserRegistrationStatus(userRegStatus)
                .build();
    }

    private RegistrationResponse toRegResponse(Registration reg) {
        return new RegistrationResponse(
                reg.getId(), reg.getUser().getId(), reg.getUser().getName(),
                reg.getEvent().getId(), reg.getEvent().getTitle(),
                reg.getStatus(), reg.getRegisteredAt()
        );
    }
    @Transactional
    public EventResponse uploadCardImage(Long eventId, Long hostId, String fileUrl) {
        Event event = getEventOrThrow(eventId);
        verifyHostOwnership(event, hostId);

        if (event.getCardImageUrl() != null) {
            fileStorageService.deleteFile(event.getCardImageUrl());
        }
        event.setCardImageUrl(fileUrl);
        return toResponse(eventRepository.save(event), Optional.empty());
    }

    public record RegistrationResponse(
            Long id, Long userId, String userName,
            Long eventId, String eventTitle,
            RegistrationStatus status, LocalDateTime registeredAt) {}
}