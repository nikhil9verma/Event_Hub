package com.eventhub.eventhub_backend.service;

import com.eventhub.eventhub_backend.dto.request.EventFilterRequest;
import com.eventhub.eventhub_backend.dto.request.EventRequest;
import com.eventhub.eventhub_backend.dto.request.TeamRegistrationRequest;
import com.eventhub.eventhub_backend.dto.response.AnalyticsResponse;
import com.eventhub.eventhub_backend.dto.response.AttendeeResponse;
import com.eventhub.eventhub_backend.dto.response.EventResponse;
import com.eventhub.eventhub_backend.entity.Event;
import com.eventhub.eventhub_backend.entity.EventStage;
import com.eventhub.eventhub_backend.entity.Registration;
import com.eventhub.eventhub_backend.entity.TeamMember;
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
import org.springframework.data.domain.Sort; // NEW IMPORT
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
    private final TeamMemberRepository teamMemberRepository;

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
                .minTeamSize(request.getMinTeamSize() != null ? request.getMinTeamSize() : 1)
                .maxTeamSize(request.getMaxTeamSize() != null ? request.getMaxTeamSize() : 1)
                .contactEmail(request.getContactEmail())
                .prizes(request.getPrizes())
                .build();

        if (request.getStages() != null && !request.getStages().isEmpty()) {
            List<EventStage> stages = request.getStages().stream().map(stageReq -> {
                return EventStage.builder()
                        .title(stageReq.getTitle())
                        .description(stageReq.getDescription())
                        .stageDate(stageReq.getStageDate())
                        .event(event)
                        .build();
            }).toList();
            event.setStages(stages);
        }

        Event saved = eventRepository.save(event);
        emailService.sendEventCreatedConfirmation(host, saved);
        return toResponse(saved, Optional.empty());
    }

    public List<AttendeeResponse> getEventAttendees(Long eventId, Long hostId) {
        Event event = getEventOrThrow(eventId);
        verifyHostOwnership(event, hostId);

        return registrationRepository.findByEventIdOrderByRegisteredAtDesc(eventId).stream()
                .map(reg -> AttendeeResponse.builder()
                        .userId(reg.getUser().getId())
                        .name(reg.getUser().getName())
                        .email(reg.getUser().getEmail())
                        .course(reg.getUser().getCourse())
                        .batch(reg.getUser().getBatch())
                        .status(reg.getStatus())
                        .registeredAt(reg.getRegisteredAt())
                        .teamName(reg.getTeamName())
                        .teammates(reg.getTeamMembers().stream()
                                .map(tm -> AttendeeResponse.TeamMemberResponse.builder()
                                        .name(tm.getName())
                                        .email(tm.getEmail())
                                        .build())
                                .toList())
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

        event.setMinTeamSize(request.getMinTeamSize() != null ? request.getMinTeamSize() : 1);
        event.setMaxTeamSize(request.getMaxTeamSize() != null ? request.getMaxTeamSize() : 1);
        event.setContactEmail(request.getContactEmail());
        event.setPrizes(request.getPrizes());

        if (request.getStages() != null) {
            event.getStages().clear();
            List<EventStage> newStages = request.getStages().stream().map(stageReq -> {
                return EventStage.builder()
                        .title(stageReq.getTitle())
                        .description(stageReq.getDescription())
                        .stageDate(stageReq.getStageDate())
                        .event(event)
                        .build();
            }).toList();
            event.getStages().addAll(newStages);
        }

        updateEventStatus(event);
        return toResponse(eventRepository.save(event), Optional.empty());
    }

    @Transactional
    public void deleteEvent(Long eventId, String userEmail) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        if (!event.getHost().getEmail().equals(userEmail)) {
            throw new RuntimeException("Forbidden: You can only delete your own events.");
        }

        eventRepository.delete(event);
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
        Specification<Event> spec = buildSpecification(filter, currentUserId);

        // ─── UPDATED: Added default DESC sorting by createdAt ───
        PageRequest pageable = PageRequest.of(
                filter.getPage(),
                filter.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return eventRepository.findAll(spec, pageable)
                .map(event -> toResponse(event, Optional.ofNullable(currentUserId)));
    }

    public EventResponse getEventById(Long eventId, @Nullable Long currentUserId) {
        Event event = getEventOrThrow(eventId);
        return toResponse(event, Optional.ofNullable(currentUserId));
    }

    public Page<EventResponse> getHostEvents(Long hostId, int page, int size) {
        // ─── UPDATED: Added default DESC sorting by createdAt ───
        PageRequest pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return eventRepository.findByHostId(hostId, pageable)
                .map(event -> toResponse(event, Optional.empty()));
    }

    @Transactional
    public RegistrationResponse registerForEvent(Long eventId, Long userId, TeamRegistrationRequest request) {
        Event event = getEventOrThrow(eventId);
        User user = userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (event.getStatus() == EventStatus.SUSPENDED || event.getStatus() == EventStatus.COMPLETED) {
            throw new BusinessException("Cannot register for this event");
        }

        if (LocalDateTime.now().isAfter(event.getRegistrationDeadline())) {
            throw new BusinessException("Registration deadline has passed");
        }

        int totalTeamSize = 1;
        List<TeamMember> teamMembers = new ArrayList<>();
        List<String> emailsToCheck = new ArrayList<>();
        emailsToCheck.add(user.getEmail());

        if (request != null && request.getTeamMembers() != null && !request.getTeamMembers().isEmpty()) {

            if (request.getTeamName() == null || request.getTeamName().trim().isEmpty()) {
                throw new BusinessException("Team name is required for team registrations.");
            }

            totalTeamSize += request.getTeamMembers().size();

            for (TeamRegistrationRequest.TeammateDto dto : request.getTeamMembers()) {
                if (emailsToCheck.contains(dto.getEmail())) {
                    throw new BusinessException("Duplicate emails found within your team registration.");
                }

                User teammateUser = userRepository.findByEmailAndDeletedFalse(dto.getEmail())
                        .orElseThrow(() -> new BusinessException("Registration failed: User with email '" + dto.getEmail() + "' is not registered on the platform. All teammates must create an account first."));

                emailsToCheck.add(dto.getEmail());
                teamMembers.add(TeamMember.builder()
                        .name(teammateUser.getName()) // Pulled from DB
                        .email(teammateUser.getEmail())
                        .build());
            }
        }

        int minTeam = event.getMinTeamSize() != null ? event.getMinTeamSize() : 1;
        int maxTeam = event.getMaxTeamSize() != null ? event.getMaxTeamSize() : 1;

        if (totalTeamSize < minTeam || totalTeamSize > maxTeam) {
            throw new BusinessException("Team size must be between " + minTeam + " and " + maxTeam + " (including the leader).");
        }

        Optional<Registration> existing = registrationRepository.findByUserIdAndEventId(userId, eventId);
        if (existing.isPresent()) {
            RegistrationStatus existingStatus = existing.get().getStatus();
            if (existingStatus == RegistrationStatus.REGISTERED || existingStatus == RegistrationStatus.WAITLIST) {
                throw new BusinessException("You are already registered or on waitlist for this event");
            }
            registrationRepository.delete(existing.get());
            registrationRepository.flush();
        }

        boolean leaderConflict = registrationRepository.existsByEventIdAndUserEmailIn(eventId, emailsToCheck);
        boolean teammateConflict = teamMemberRepository.existsByRegistrationEventIdAndEmailIn(eventId, emailsToCheck);

        if (leaderConflict || teammateConflict) {
            throw new BusinessException("Registration failed: One or more emails provided are already registered for this event.");
        }

        RegistrationStatus status = determineStatus(event);
        Registration registration = Registration.builder()
                .user(user)
                .event(event)
                .status(status)
                .teamName(request != null ? request.getTeamName() : null)
                .build();

        for (TeamMember tm : teamMembers) {
            tm.setRegistration(registration);
        }
        registration.setTeamMembers(teamMembers);

        Registration saved = registrationRepository.save(registration);

        handlePostRegistration(user, event, status, teamMembers);
        updateEventStatus(event);
        eventRepository.save(event);

        return toRegResponse(saved);
    }

    @Transactional
    public void cancelRegistration(Long eventId, Long userId) {
        Event event = getEventOrThrow(eventId);

        if (LocalDateTime.now().isAfter(event.getEventDate())) {
            throw new BusinessException("Cancellations are not allowed after the event has started.");
        }

        Registration registration = registrationRepository.findByUserIdAndEventId(userId, eventId)
                .orElseThrow(() -> new BusinessException("Active registration not found for this event."));

        registrationRepository.delete(registration);
        registrationRepository.flush();

        promoteFromWaitlist(event);
        updateEventStatus(event);
        eventRepository.save(event);
    }
    @Transactional(readOnly = true)
    public Page<EventResponse> getMyRegistrations(Long userId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);

        // Find all registrations for this user
        return registrationRepository.findByUserIdOrderByRegisteredAtDesc(userId, pageable)
                // Convert the Registration's Event into an EventResponse
                .map(registration -> toResponse(registration.getEvent(), Optional.of(userId)));
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
                    "You've been promoted from the waitlist for: " + event.getTitle());
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

        long totalRegistrations = registrationRepository.countByEventIdAndStatus(eventId,
                RegistrationStatus.REGISTERED);
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
        eventRepository.detachHostFromAllEvents(hostId);
    }

    private RegistrationStatus determineStatus(Event event) {
        long registered = registrationRepository.countByEventIdAndStatus(event.getId(), RegistrationStatus.REGISTERED);
        return registered < event.getMaxParticipants() ? RegistrationStatus.REGISTERED : RegistrationStatus.WAITLIST;
    }

    private void handlePostRegistration(User user, Event event, RegistrationStatus status, List<TeamMember> teamMembers) {
        boolean isWaitlist = (status == RegistrationStatus.WAITLIST);

        // 1. Send Emails asynchronously
        if (teamMembers != null && !teamMembers.isEmpty()) {
            emailService.sendTeamRegistrationConfirmation(user, teamMembers, event, isWaitlist);
        } else {
            if (isWaitlist) {
                emailService.sendWaitlistConfirmation(user, event);
            } else {
                emailService.sendRegistrationConfirmation(user, event);
            }
        }

        // 2. Send In-App Notifications (to the leader)
        if (!isWaitlist) {
            notificationService.createNotification(user.getId(), "Registration Confirmed ✅",
                    "You're registered for: " + event.getTitle());
        } else {
            notificationService.createNotification(user.getId(), "Added to Waitlist ⏳",
                    "You're on the waitlist for: " + event.getTitle());
        }
    }

    private void updateEventStatus(Event event) {
        if (event.getStatus() == EventStatus.SUSPENDED || event.getStatus() == EventStatus.COMPLETED)
            return;
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

            Expression<Integer> eventPhase = cb.<Integer>selectCase()
                    .when(cb.equal(root.get("status"), EventStatus.COMPLETED), 2)
                    .when(cb.lessThan(root.<LocalDateTime>get("registrationDeadline"), now), 1)
                    .otherwise(0);

            Expression<LocalDateTime> activeDateSort = cb.<LocalDateTime>selectCase()
                    .when(cb.notEqual(root.get("status"), EventStatus.COMPLETED), root.<LocalDateTime>get("eventDate"))
                    .otherwise(cb.nullLiteral(LocalDateTime.class));

            Expression<LocalDateTime> completedDateSort = cb.<LocalDateTime>selectCase()
                    .when(cb.equal(root.get("status"), EventStatus.COMPLETED), root.<LocalDateTime>get("eventDate"))
                    .otherwise(cb.nullLiteral(LocalDateTime.class));

            // ─── UPDATED: Appended cb.desc(root.get("createdAt")) to tie-break and ensure latest events come first ───
            if (currentUserId != null) {
                Join<Event, Registration> regJoin = root.join("registrations", JoinType.LEFT);
                regJoin.on(
                        cb.equal(regJoin.get("user").get("id"), currentUserId),
                        cb.equal(regJoin.get("status"), RegistrationStatus.REGISTERED));

                Expression<Integer> isRegistered = cb.<Integer>selectCase()
                        .when(cb.and(
                                cb.isNotNull(regJoin.get("id")),
                                cb.notEqual(root.get("status"), EventStatus.COMPLETED)), 1)
                        .otherwise(0);

                query.orderBy(
                        cb.asc(eventPhase),
                        cb.desc(isRegistered),
                        cb.desc(root.get("createdAt")), // <--- Ensures newest added events are at the top
                        cb.asc(activeDateSort),
                        cb.desc(completedDateSort)
                );
            } else {
                query.orderBy(
                        cb.asc(eventPhase),
                        cb.desc(root.get("createdAt")), // <--- Ensures newest added events are at the top
                        cb.asc(activeDateSort),
                        cb.desc(completedDateSort));
            }

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

        List<EventResponse.EventStageResponse> stageResponses = null;
        if (event.getStages() != null) {
            stageResponses = event.getStages().stream()
                    .map(stage -> EventResponse.EventStageResponse.builder()
                            .id(stage.getId())
                            .title(stage.getTitle())
                            .description(stage.getDescription())
                            .stageDate(stage.getStageDate())
                            .build())
                    .toList();
        }

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
                .minTeamSize(event.getMinTeamSize())
                .maxTeamSize(event.getMaxTeamSize())
                .contactEmail(event.getContactEmail())
                .prizes(event.getPrizes())
                .stages(stageResponses)
                .build();
    }

    private RegistrationResponse toRegResponse(Registration reg) {
        return new RegistrationResponse(
                reg.getId(), reg.getUser().getId(), reg.getUser().getName(),
                reg.getEvent().getId(), reg.getEvent().getTitle(),
                reg.getStatus(), reg.getRegisteredAt());
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
            RegistrationStatus status, LocalDateTime registeredAt) {
    }
}