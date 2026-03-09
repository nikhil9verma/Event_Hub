package com.eventhub.eventhub_backend.scheduler;

import com.eventhub.eventhub_backend.entity.Event;
import com.eventhub.eventhub_backend.entity.Registration;
import com.eventhub.eventhub_backend.enums.RegistrationStatus;
import com.eventhub.eventhub_backend.repository.EventRepository;
import com.eventhub.eventhub_backend.repository.RegistrationRepository;
import com.eventhub.eventhub_backend.service.EmailService;
import com.eventhub.eventhub_backend.service.EventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class EventScheduler {

    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;
    private final EmailService emailService;
    private final EventService eventService;

    // Set 'app.scheduled.reminder-cron=0 * * * * *' in application.properties for 1-minute testing
    @Scheduled(cron = "${app.scheduled.reminder-cron}")
    public void sendEventReminders() {
        log.info("Checking for upcoming event reminders...");
        LocalDateTime now = LocalDateTime.now();

        // Fetch events starting in the next 24 hours
        List<Event> events = eventRepository.findEventsForReminder(
                now,
                now.plusHours(24));

        for (Event event : events) {
            if (event.getReminderHours() == null) continue;

            // Calculate when the reminder should be sent
            // Example: If event is 5:00 PM and reminderHours is 2, target is 3:00 PM
            LocalDateTime targetReminderTime = event.getEventDate().minusHours(event.getReminderHours());

            /* LOGIC: If 'now' is past the target time, and it's not too late
               (e.g., within 30 mins of the target), send the email.
               NOTE: Adding a 'boolean reminderSent' to your Event entity is highly recommended
               to prevent duplicate emails if the scheduler runs multiple times.
            */
            if (now.isAfter(targetReminderTime) && now.isBefore(targetReminderTime.plusMinutes(30))) {
                // To prevent spamming every minute during testing,
                // you could check a flag here: if (!event.isReminderSent()) { ... }
                sendRemindersForEvent(event);
            }
        }
    }

    private void sendRemindersForEvent(Event event) {
        List<Registration> registeredList = registrationRepository
                .findByEventIdAndStatus(event.getId(), RegistrationStatus.REGISTERED);

        if (registeredList.isEmpty()) {
            log.info("No registered participants for event '{}'", event.getTitle());
            return;
        }

        log.info("Executing reminder broadcast for event '{}' to {} users",
                event.getTitle(), registeredList.size());

        for (Registration registration : registeredList) {
            try {
                emailService.sendEventReminder(registration.getUser(), event);
            } catch (Exception e) {
                log.error("Failed to send email to {}: {}", registration.getUser().getEmail(), e.getMessage());
            }
        }
    }

    @Scheduled(cron = "0 0 * * * *") // Runs every hour
    public void markCompletedEvents() {
        log.info("System Task: Updating expired events to COMPLETED status");
        eventService.markExpiredEventsCompleted();
    }
}