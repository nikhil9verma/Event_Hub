package com.eventhub.eventhub_backend.service;


import com.eventhub.eventhub_backend.entity.Event;
import com.eventhub.eventhub_backend.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' hh:mm a");

    @Async
    public void sendRegistrationConfirmation(User user, Event event) {
        String subject = "Registration Confirmed: " + event.getTitle();
        String body = buildEmailHtml(
                "Registration Confirmed! 🎉",
                "Hi " + user.getName() + ",",
                "You've successfully registered for <strong>" + event.getTitle() + "</strong>.",
                List.of(
                        "📅 Date: " + event.getEventDate().format(FORMATTER),
                        "📍 Venue: " + event.getVenue(),
                        "🏷 Category: " + event.getCategory()
                ),
                "View Event",
                frontendUrl + "/events/" + event.getId()
        );
        sendEmail(user.getEmail(), subject, body);
    }

    @Async
    public void sendWaitlistConfirmation(User user, Event event) {
        String subject = "Waitlist Confirmation: " + event.getTitle();
        String body = buildEmailHtml(
                "You're on the Waitlist ⏳",
                "Hi " + user.getName() + ",",
                "You've been added to the waitlist for <strong>" + event.getTitle() + "</strong>. We'll notify you immediately if a spot opens up!",
                List.of(
                        "📅 Date: " + event.getEventDate().format(FORMATTER),
                        "📍 Venue: " + event.getVenue()
                ),
                "View Event",
                frontendUrl + "/events/" + event.getId()
        );
        sendEmail(user.getEmail(), subject, body);
    }
    @Async
    public void sendOtpEmail(String to, String otp) {
        String subject = "Verify your EventHub Account";
        String body = buildEmailHtml(
                "Welcome to EventHub! 🎓",
                "Hello,",
                "Your 6-digit registration verification code is:",
                List.of(
                        // Changed font-size from 36px to 28px
                        "<div style='text-align:center; letter-spacing: 8px; color: #1a1f3a; font-size: 28px; font-weight: bold; margin: 20px 0;'>" + otp + "</div>",
                        "This code will expire in 15 minutes. If you did not request this, please ignore this email."
                ),
                "Go to EventHub",
                frontendUrl
        );
        sendEmail(to, subject, body);
    }

    @Async
    public void sendForgotPasswordOtp(String to, String otp) {
        String subject = "Password Reset Request - EventHub";
        String body = buildEmailHtml(
                "Password Reset 🔒",
                "Hello,",
                "We received a request to reset your password. Your 6-digit reset code is:",
                List.of(
                        // Changed font-size from 36px to 28px
                        "<div style='text-align:center; letter-spacing: 8px; color: #1a1f3a; font-size: 28px; font-weight: bold; margin: 20px 0;'>" + otp + "</div>",
                        "This code will expire in 10 minutes. If you did not request a password reset, please ignore this email."
                ),
                "Return to Login",
                frontendUrl + "/login"
        );
        sendEmail(to, subject, body);
    }
    @Async
    public void sendWaitlistPromotion(User user, Event event) {
        String subject = "Great News! You Got a Spot: " + event.getTitle();
        String body = buildEmailHtml(
                "You're In! 🎊",
                "Hi " + user.getName() + ",",
                "A spot just opened up and you've been automatically registered for <strong>" + event.getTitle() + "</strong>!",
                List.of(
                        "📅 Date: " + event.getEventDate().format(FORMATTER),
                        "📍 Venue: " + event.getVenue()
                ),
                "View Event",
                frontendUrl + "/events/" + event.getId()
        );
        sendEmail(user.getEmail(), subject, body);
    }

    @Async
    public void sendEventReminder(User user, Event event) {
        String subject = "Reminder: " + event.getTitle() + " starts in " + event.getReminderHours() + " hour(s)!";
        String body = buildEmailHtml(
                "Event Starting Soon! ⏰",
                "Hi " + user.getName() + ",",
                "Don't forget! <strong>" + event.getTitle() + "</strong> is starting in " + event.getReminderHours() + " hour(s).",
                List.of(
                        "📅 " + event.getEventDate().format(FORMATTER),
                        "📍 " + event.getVenue()
                ),
                "View Details",
                frontendUrl + "/events/" + event.getId()
        );
        sendEmail(user.getEmail(), subject, body);
    }

    @Async
    public void sendEventCreatedConfirmation(User host, Event event) {
        String subject = "Event Created Successfully: " + event.getTitle();
        String body = buildEmailHtml(
                "Your Event is Live! 🚀",
                "Hi " + host.getName() + ",",
                "Your event <strong>" + event.getTitle() + "</strong> has been created and is now visible to students.",
                List.of(
                        "📅 Date: " + event.getEventDate().format(FORMATTER),
                        "📍 Venue: " + event.getVenue(),
                        "👥 Capacity: " + event.getMaxParticipants() + " participants"
                ),
                "Manage Event",
                frontendUrl + "/events/" + event.getId() + "/analytics"
        );
        sendEmail(host.getEmail(), subject, body);
    }

    private void sendEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email sent to: {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    private String buildEmailHtml(String heading, String greeting, String intro,
                                  java.util.List<String> details, String ctaText, String ctaUrl) {
        StringBuilder detailsHtml = new StringBuilder();
        for (String detail : details) {
            detailsHtml.append("<p style='margin:8px 0;color:#4a5568;'>").append(detail).append("</p>");
        }

        return """
            <!DOCTYPE html>
            <html>
            <body style='font-family: Georgia, serif; background-color: #f7f6f3; margin:0; padding:20px;'>
              <div style='max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);'>
                <div style='background: linear-gradient(135deg, #1a1f3a, #2d3561); padding:32px; text-align:center;'>
                  <h1 style='color:#f5c842; font-size:28px; margin:0;'>EventHub</h1>
                  <p style='color:#a0aec0; margin:8px 0 0;'>University Event Management</p>
                </div>
                <div style='padding:32px;'>
                  <h2 style='color:#1a1f3a; font-size:24px; margin:0 0 16px;'>%s</h2>
                  <p style='color:#2d3748; margin:0 0 16px;'>%s</p>
                  <p style='color:#4a5568; margin:0 0 24px;'>%s</p>
                  <div style='background:#f7f6f3; border-radius:8px; padding:20px; margin-bottom:24px;'>
                    %s
                  </div>
                  <div style='text-align:center;'>
                    <a href='%s' style='background:#f5c842; color:#1a1f3a; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:16px; display:inline-block;'>%s</a>
                  </div>
                </div>
                <div style='background:#f7f6f3; padding:20px; text-align:center;'>
                  <p style='color:#a0aec0; font-size:12px; margin:0;'>EventHub University &bull; Sent by your campus event system</p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(heading, greeting, intro, detailsHtml.toString(), ctaUrl, ctaText);
    }
}
