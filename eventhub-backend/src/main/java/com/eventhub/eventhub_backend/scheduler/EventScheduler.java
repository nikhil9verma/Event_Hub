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

    @Scheduled(cron = "${app.scheduled.reminder-cron}")
    public void sendEventReminders() {

        log.info("Running event reminder scheduler...");
        LocalDateTime now = LocalDateTime.now();

        // Fetch all active/full events that haven't completed yet
        // We'll filter per-event based on their individual reminderHours setting
        List<Event> events = eventRepository.findEventsForReminder(
                now.plusMinutes(1),       // start of window: events starting after now
                now.plusHours(24));       // generous upper bound — filtered below per event

        for (Event event : events) {
            if (event.getReminderHours() == null) {
                continue;
            }
            LocalDateTime windowStart = now.plusMinutes(event.getReminderHours() * 60L - 10);
            LocalDateTime windowEnd   = now.plusMinutes(event.getReminderHours() * 60L + 10);

            if (event.getEventDate().isBefore(windowStart) || event.getEventDate().isAfter(windowEnd)) {
                continue; // not in this event's reminder window yet
            }

            sendRemindersForEvent(event);
        }
    }

    private void sendRemindersForEvent(Event event) {
        // Fetch all REGISTERED (not waitlist) participants for this event
        List<Registration> registeredList = registrationRepository
                .findByEventIdAndStatus(event.getId(), RegistrationStatus.REGISTERED);

        if (registeredList.isEmpty()) {
            log.info("No registered participants for event '{}', skipping reminders", event.getTitle());
            return;
        }

        log.info("Sending reminders for event '{}' to {} participants",
                event.getTitle(), registeredList.size());

        for (Registration registration : registeredList) {
            try {
                emailService.sendEventReminder(registration.getUser(), event);
            } catch (Exception e) {
                log.error("Failed to send reminder to user {} for event '{}': {}",
                        registration.getUser().getId(), event.getTitle(), e.getMessage());
            }
        }
    }

    @Scheduled(cron = "0 0 * * * *")
    public void markCompletedEvents() {
        log.info("Marking expired events as COMPLETED...");
        eventService.markExpiredEventsCompleted();
    }
}