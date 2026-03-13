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
    private final TeamMemberRepository teamMemberRepository;

    // ─── NEW HELPER: TEAM-AWARE SLOT COUNTING ───
    private long countOccupiedSlots(Long eventId) {
        List<Registration> allRegs = registrationRepository.findByEventId(eventId);

        Set<String> registeredTeams = new HashSet<>();
        long soloRegistrations = 0;

        for (Registration reg : allRegs) {
            // Count registered and incomplete teams/users as taking up a spot
            if (reg.getStatus() == RegistrationStatus.REGISTERED ||
                    reg.getStatus() == RegistrationStatus.INCOMPLETE) {

                if (reg.getTeamName() != null && !reg.getTeamName().isBlank()) {
                    registeredTeams.add(reg.getTeamName());
                } else {
                    soloRegistrations++;
                }
            }
        }
        return registeredTeams.size() + soloRegistrations;
    }

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
                .requiresRegistration(request.getRequiresRegistration() == null || request.getRequiresRegistration())
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
        event.setRequiresRegistration(request.getRequiresRegistration() == null || request.getRequiresRegistration());

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
        PageRequest pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        return eventRepository.findByHostId(hostId, pageable)
                .map(event -> toResponse(event, Optional.empty()));
    }

    // ─── UPDATED TEAM REGISTRATION LOGIC ───
    @Transactional
    public RegistrationResponse registerForEvent(Long eventId, Long userId, TeamRegistrationRequest request) {
        Event event = getEventOrThrow(eventId);
        User user = userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Block registrations for crowd events
        if (!event.isRequiresRegistration()) {
            throw new BusinessException("This is a Crowd Event. No registration is required!");
        }

        if (event.getStatus() == EventStatus.SUSPENDED || event.getStatus() == EventStatus.COMPLETED) {
            throw new BusinessException("Cannot register for this event");
        }

        if (LocalDateTime.now().isAfter(event.getRegistrationDeadline())) {
            throw new BusinessException("Registration deadline has passed");
        }

        int totalTeamSize = 1;
        List<User> teammateUsers = new ArrayList<>();
        List<String> emailsToCheck = new ArrayList<>();
        emailsToCheck.add(user.getEmail());

        if (request != null && request.getTeamMembers() != null && !request.getTeamMembers().isEmpty()) {
            if (request.getTeamName() == null || request.getTeamName().trim().isEmpty()) {
                throw new BusinessException("Team name is required for team registrations.");
            }
            if (registrationRepository.existsByEventIdAndTeamName(eventId, request.getTeamName())) {
                throw new BusinessException("The team name '" + request.getTeamName() + "' is already taken for this event. Please choose a different name.");
            }
            totalTeamSize += request.getTeamMembers().size();

            for (TeamRegistrationRequest.TeammateDto dto : request.getTeamMembers()) {
                if (emailsToCheck.contains(dto.getEmail())) {
                    throw new BusinessException("Duplicate emails found within your team registration.");
                }

                User teammateUser = userRepository.findByEmailAndDeletedFalse(dto.getEmail())
                        .orElseThrow(() -> new BusinessException("Registration failed: User with email '" + dto.getEmail() + "' is not registered on EventHub."));

                emailsToCheck.add(dto.getEmail());
                teammateUsers.add(teammateUser);
            }
        }

        int minTeam = event.getMinTeamSize() != null ? event.getMinTeamSize() : 1;
        int maxTeam = event.getMaxTeamSize() != null ? event.getMaxTeamSize() : 1;

        if (totalTeamSize > maxTeam) {
            throw new BusinessException("Team size cannot exceed " + maxTeam + " members.");
        }

        Optional<Registration> existing = registrationRepository.findByUserIdAndEventId(userId, eventId);
        if (existing.isPresent()) {
            RegistrationStatus existingStatus = existing.get().getStatus();
            if (existingStatus == RegistrationStatus.REGISTERED || existingStatus == RegistrationStatus.WAITLIST || existingStatus == RegistrationStatus.INCOMPLETE) {
                throw new BusinessException("You are already registered or on waitlist for this event");
            }
            registrationRepository.delete(existing.get());
            registrationRepository.flush();
        }

        for (User teammate : teammateUsers) {
            Optional<Registration> tmExisting = registrationRepository.findByUserIdAndEventId(teammate.getId(), eventId);
            if (tmExisting.isPresent()) {
                throw new BusinessException("Registration failed: " + teammate.getName() + " (" + teammate.getEmail() + ") is already registered or invited to this event.");
            }
        }

        // ─── 1. CREATE LEADER REGISTRATION ───
        RegistrationStatus leaderStatus = (minTeam > 1) ? RegistrationStatus.INCOMPLETE : determineStatus(event);
        Registration leaderRegistration = Registration.builder()
                .user(user)
                .event(event)
                .status(leaderStatus)
                .teamName(request != null ? request.getTeamName() : null)
                .registeredAt(LocalDateTime.now())
                .build();

        List<TeamMember> teamMemberLinks = new ArrayList<>();

        // ─── 2. CREATE PENDING INVITATIONS FOR TEAMMATES ───
        for (User teammate : teammateUsers) {
            Registration teammateInvite = Registration.builder()
                    .user(teammate)
                    .event(event)
                    .status(RegistrationStatus.PENDING_INVITATION)
                    .teamName(request != null ? request.getTeamName() : null)
                    .registeredAt(LocalDateTime.now())
                    .build();
            registrationRepository.save(teammateInvite);

            TeamMember tm = TeamMember.builder()
                    .name(teammate.getName())
                    .email(teammate.getEmail())
                    .registration(leaderRegistration)
                    .build();
            teamMemberLinks.add(tm);

            if (request != null && request.getTeamName() != null) {
                notificationService.createNotification(teammate.getId(), "New Team Invite! 📧",
                        user.getName() + " invited you to join '" + request.getTeamName() + "' for the event: " + event.getTitle());
            }
        }

        leaderRegistration.setTeamMembers(teamMemberLinks);
        Registration savedLeader = registrationRepository.save(leaderRegistration);

        // Check if team is immediately complete (e.g., solo event)
        checkAndUpgradeTeamStatus(event, leaderRegistration.getTeamName());

        handlePostRegistration(user, event, leaderStatus, teamMemberLinks);
        updateEventStatus(event);
        eventRepository.save(event);

        return toRegResponse(savedLeader);
    }

    @Transactional
    public void declineTeamInvitation(Long eventId, Long userId) {
        Registration invite = registrationRepository.findByUserIdAndEventId(userId, eventId)
                .orElseThrow(() -> new BusinessException("No invitation found."));

        registrationRepository.delete(invite);
    }

    @Transactional
    public void acceptTeamInvitation(Long eventId, Long userId) {
        Registration invite = registrationRepository.findByUserIdAndEventId(userId, eventId)
                .orElseThrow(() -> new BusinessException("No invitation found."));

        if (invite.getStatus() != RegistrationStatus.PENDING_INVITATION) {
            throw new BusinessException("This invitation is no longer valid.");
        }

        Event event = getEventOrThrow(eventId);

        invite.setStatus(event.getMinTeamSize() > 1 ? RegistrationStatus.INCOMPLETE : determineStatus(event));
        registrationRepository.save(invite);

        checkAndUpgradeTeamStatus(event, invite.getTeamName());
        updateEventStatus(event);
    }

    private void checkAndUpgradeTeamStatus(Event event, String teamName) {
        if (teamName == null || event.getMinTeamSize() <= 1) return;

        List<Registration> teamMembers = registrationRepository.findByEventIdAndTeamName(event.getId(), teamName);

        long acceptedCount = teamMembers.stream()
                .filter(r -> r.getStatus() == RegistrationStatus.REGISTERED
                        || r.getStatus() == RegistrationStatus.WAITLIST
                        || r.getStatus() == RegistrationStatus.INCOMPLETE)
                .count();

        if (acceptedCount >= event.getMinTeamSize()) {
            RegistrationStatus newStatus = determineStatus(event);
            for (Registration r : teamMembers) {
                if (r.getStatus() == RegistrationStatus.INCOMPLETE) {
                    r.setStatus(newStatus);
                    registrationRepository.save(r);

                    notificationService.createNotification(r.getUser().getId(),
                            "Team Registration Confirmed! 🎉",
                            "Your team '" + teamName + "' has enough members and is now officially " + newStatus + " for " + event.getTitle());
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public Page<EventResponse> getMyRegistrations(Long userId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);

        return registrationRepository.findByUserIdOrderByRegisteredAtDesc(userId, pageable)
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

        // Uses slot count now so Teams equal 1 registration slot
        long totalRegistrations = countOccupiedSlots(eventId);
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
        long occupiedSlots = countOccupiedSlots(event.getId());
        return occupiedSlots < event.getMaxParticipants() ? RegistrationStatus.REGISTERED : RegistrationStatus.WAITLIST;
    }

    private void handlePostRegistration(User user, Event event, RegistrationStatus status, List<TeamMember> teamMembers) {
        boolean isWaitlist = (status == RegistrationStatus.WAITLIST);

        if (teamMembers != null && !teamMembers.isEmpty()) {
            emailService.sendTeamRegistrationConfirmation(user, teamMembers, event, isWaitlist);
        } else {
            if (isWaitlist) {
                emailService.sendWaitlistConfirmation(user, event);
            } else {
                emailService.sendRegistrationConfirmation(user, event);
            }
        }

        if (!isWaitlist) {
            notificationService.createNotification(user.getId(), "Registration Process Started",
                    "You initiated registration for: " + event.getTitle());
        } else {
            notificationService.createNotification(user.getId(), "Added to Waitlist ⏳",
                    "You're on the waitlist for: " + event.getTitle());
        }
    }

    private void updateEventStatus(Event event) {
        if (event.getStatus() == EventStatus.SUSPENDED || event.getStatus() == EventStatus.COMPLETED)
            return;
        long occupiedSlots = countOccupiedSlots(event.getId());
        if (occupiedSlots >= event.getMaxParticipants()) {
            event.setStatus(EventStatus.FULL);
        } else {
            event.setStatus(EventStatus.ACTIVE);
        }
    }

    private Specification<Event> buildSpecification(EventFilterRequest filter, @Nullable Long currentUserId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            LocalDateTime now = LocalDateTime.now();

            // Always hide suspended events
            predicates.add(cb.notEqual(root.get("status"), EventStatus.SUSPENDED));

            // ─── SEARCH FILTER ───
            if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("title")),
                        "%" + filter.getSearch().toLowerCase() + "%"));
            }

            // ─── CATEGORY FILTER ───
            if (filter.getCategory() != null && !filter.getCategory().isBlank()) {
                predicates.add(cb.equal(root.get("category"), filter.getCategory()));
            }

            // ─── EVENT TYPE FILTER (Fail-Safe for old DB records) ───
            if (filter.getEventType() != null && !filter.getEventType().isBlank()) {
                String type = filter.getEventType().toUpperCase();

                // Treat null requiresRegistration as TRUE (standard events)
                Predicate isRegRequired = cb.or(
                        cb.isTrue(root.get("requiresRegistration")),
                        cb.isNull(root.get("requiresRegistration"))
                );

                if (type.equals("SOLO")) {
                    // maxTeamSize is 1 OR maxTeamSize is NULL (fallback for old solo events)
                    Predicate isSolo = cb.or(cb.equal(root.get("maxTeamSize"), 1), cb.isNull(root.get("maxTeamSize")));
                    predicates.add(cb.and(isSolo, isRegRequired));
                } else if (type.equals("TEAM")) {
                    predicates.add(cb.and(cb.greaterThan(root.get("maxTeamSize"), 1), isRegRequired));
                } else if (type.equals("CROWD")) {
                    // strictly false
                    predicates.add(cb.isFalse(root.get("requiresRegistration")));
                }
            }

            // ─── AVAILABILITY FILTER (Open for Registration) ───
            if (Boolean.TRUE.equals(filter.getAvailable())) {
                // 1. Event must be ACTIVE (not FULL, SUSPENDED, or COMPLETED)
                predicates.add(cb.equal(root.get("status"), EventStatus.ACTIVE));

                // 2. The deadline must be in the future OR it must be a Crowd Event (no registration needed)
                Predicate isCrowdEvent = cb.isFalse(root.get("requiresRegistration"));
                Predicate deadlineInFuture = cb.greaterThan(root.<LocalDateTime>get("registrationDeadline"), now);

                predicates.add(cb.or(isCrowdEvent, deadlineInFuture));
            }

            // ─── DATE FILTERS ───
            if (filter.getDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<LocalDateTime>get("eventDate"), filter.getDateFrom()));
            }
            if (filter.getDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.<LocalDateTime>get("eventDate"), filter.getDateTo()));
            }

            // ─── SORTING LOGIC ───
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
                        cb.desc(root.get("createdAt")),
                        cb.asc(activeDateSort),
                        cb.desc(completedDateSort)
                );
            } else {
                query.orderBy(
                        cb.asc(eventPhase),
                        cb.desc(root.get("createdAt")),
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
        long occupiedSlots = countOccupiedSlots(event.getId());
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
                .registrationCount((int) occupiedSlots)
                .waitlistCount(event.getWaitlistCount())
                .availableSeats(Math.max(0, event.getMaxParticipants() - (int) occupiedSlots))
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
                .requiresRegistration(event.isRequiresRegistration())
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

    // ─── TEAM MANAGEMENT METHODS ───

    @Transactional(readOnly = true)
    public Map<String, Object> getMyTeam(Long eventId, Long userId) {
        // FIXED: Allow users with a PENDING_INVITATION to fetch the team details
        Registration myReg = registrationRepository.findByUserIdAndEventId(userId, eventId)
                .orElseThrow(() -> new BusinessException("No registration or invitation found for this event."));

        if (myReg.getTeamName() == null || myReg.getTeamName().isBlank()) {
            throw new BusinessException("Not part of a team");
        }

        List<Registration> teamRegs = registrationRepository.findByEventIdAndTeamName(eventId, myReg.getTeamName());

        List<Map<String, String>> members = teamRegs.stream()
                .sorted((r1, r2) -> {
                    int s1 = r1.getStatus() == RegistrationStatus.PENDING_INVITATION ? 1 : 0;
                    int s2 = r2.getStatus() == RegistrationStatus.PENDING_INVITATION ? 1 : 0;
                    return Integer.compare(s1, s2);
                })
                .map(r -> {
                    Map<String, String> map = new HashMap<>();
                    map.put("name", r.getUser().getName());
                    map.put("email", r.getUser().getEmail());
                    map.put("status", r.getStatus().name());
                    return map;
                }).toList();

        Map<String, Object> response = new HashMap<>();
        response.put("teamName", myReg.getTeamName());
        response.put("members", members);
        return response;
    }

    @Transactional
    public void addTeamMembers(Long eventId, Long userId, List<String> newEmails) {
        Event event = getEventOrThrow(eventId);
        Registration myReg = registrationRepository.findByUserIdAndEventId(userId, eventId)
                .orElseThrow(() -> new BusinessException("Not registered"));

        List<Registration> currentTeam = registrationRepository.findByEventIdAndTeamName(eventId, myReg.getTeamName());

        if (currentTeam.size() + newEmails.size() > event.getMaxTeamSize()) {
            throw new BusinessException("Adding these members exceeds the maximum team size limit of " + event.getMaxTeamSize());
        }

        for (String email : newEmails) {
            User teammate = userRepository.findByEmailAndDeletedFalse(email)
                    .orElseThrow(() -> new BusinessException("User " + email + " is not registered on EventHub"));

            if (registrationRepository.findByUserIdAndEventId(teammate.getId(), eventId).isPresent()) {
                throw new BusinessException(email + " is already registered or invited to this event.");
            }

            Registration invite = Registration.builder()
                    .user(teammate)
                    .event(event)
                    .status(RegistrationStatus.PENDING_INVITATION)
                    .teamName(myReg.getTeamName())
                    .registeredAt(LocalDateTime.now())
                    .build();
            registrationRepository.save(invite);

            notificationService.createNotification(teammate.getId(), "New Team Invite! 📧",
                    myReg.getUser().getName() + " added you to '" + myReg.getTeamName() + "' for the event: " + event.getTitle());
        }
    }
}