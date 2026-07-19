package com.eventhub.eventhub_backend.service;

import com.eventhub.eventhub_backend.entity.Event;
import com.eventhub.eventhub_backend.entity.Registration;
import com.eventhub.eventhub_backend.enums.RegistrationStatus;
import com.eventhub.eventhub_backend.repository.EventRepository;
import com.eventhub.eventhub_backend.repository.RegistrationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventDeadlineScheduler {

    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;
    private final EmailService emailService;
    private final EventService eventService;

    @Scheduled(fixedRate = 60000) // Runs every 60 seconds
    @Transactional
    public void processEventDeadlines() {
        List<Event> eventsToProcess = eventRepository.findByRegistrationDeadlineBeforeAndDeadlineProcessedFalse(LocalDateTime.now());

        for (Event event : eventsToProcess) {
            log.info("Processing deadline for event: {}", event.getTitle());
            
            List<Registration> eventRegs = registrationRepository.findByEventId(event.getId());
            
            // 1. Group by team name
            Map<String, List<Registration>> teams = eventRegs.stream()
                    .filter(r -> r.getTeamName() != null && !r.getTeamName().isBlank())
                    .collect(Collectors.groupingBy(Registration::getTeamName));

            // 2. Check team eligibility
            for (Map.Entry<String, List<Registration>> entry : teams.entrySet()) {
                List<Registration> teamMembers = entry.getValue();
                
                long activeCount = teamMembers.stream()
                        .filter(r -> r.getStatus() == RegistrationStatus.REGISTERED || 
                                     r.getStatus() == RegistrationStatus.WAITLIST || 
                                     r.getStatus() == RegistrationStatus.INCOMPLETE)
                        .count();
                        
                if (activeCount < event.getMinTeamSize()) {
                    // Team is ineligible. Cancel all active members.
                    for (Registration r : teamMembers) {
                        if (r.getStatus() != RegistrationStatus.CANCELLED) {
                            r.setStatus(RegistrationStatus.CANCELLED);
                            registrationRepository.save(r);
                            emailService.sendCancellationEmail(r.getUser(), event, "Your team did not meet the minimum member requirement of " + event.getMinTeamSize() + " by the registration deadline.");
                        }
                    }
                }
            }
            
            // 3. Cancel any straggling PENDING_INVITATION
            eventRegs.stream()
                .filter(r -> r.getStatus() == RegistrationStatus.PENDING_INVITATION)
                .forEach(r -> {
                    r.setStatus(RegistrationStatus.CANCELLED);
                    registrationRepository.save(r);
                });

            // 4. Promote Waitlist for the event now that invalid teams are cleared
            eventService.promoteWaitlistForEvent(event);
            event.setDeadlineProcessed(true);
            eventRepository.save(event);
            log.info("Finished processing deadline for event: {}", event.getTitle());
        }
    }
}
