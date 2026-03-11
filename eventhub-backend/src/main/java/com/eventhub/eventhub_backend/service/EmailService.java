package com.eventhub.eventhub_backend.service;

import com.eventhub.eventhub_backend.entity.Event;
import com.eventhub.eventhub_backend.entity.TeamMember;
import com.eventhub.eventhub_backend.entity.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    // ─── FIX: Now pulls the correct sender identity instead of the word "resend" ───
    @Value("${app.resend.from-email}")
    private String fromEmail;

    // ─── AUTH & OTP EMAILS ──────────────────────────────────────────────────────

    @Async("emailTaskExecutor")
    public void sendOtpEmail(String to, String otp) {
        String subject = "Verify your Event Hub Account";
        String htmlBody = "<h2>Welcome to Event Hub!</h2>" +
                "<p>Your verification code is: <b style='font-size: 20px; color: #d4af37;'>" + otp + "</b></p>" +
                "<p>This code will expire in 15 minutes.</p>";
        sendHtmlEmail(to, subject, htmlBody);
    }

    @Async("emailTaskExecutor")
    public void sendForgotPasswordOtp(String to, String otp) {
        String subject = "Password Reset Request";
        String htmlBody = "<h2>Password Reset</h2>" +
                "<p>Your OTP to reset your password is: <b style='font-size: 20px; color: #d4af37;'>" + otp + "</b></p>" +
                "<p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>";
        sendHtmlEmail(to, subject, htmlBody);
    }

    // ─── EVENT CONFIRMATION & REMINDER EMAILS ───────────────────────────────────

    @Async("emailTaskExecutor")
    public void sendEventCreatedConfirmation(User host, Event event) {
        sendHtmlEmail(host.getEmail(),
                "Event Created: " + event.getTitle(),
                "<h2>Congratulations " + host.getName() + "!</h2>" +
                        "<p>Your event <b>" + event.getTitle() + "</b> has been successfully published.</p>");
    }

    @Async("emailTaskExecutor")
    public void sendRegistrationConfirmation(User user, Event event) {
        sendHtmlEmail(user.getEmail(),
                "Registration Confirmed: " + event.getTitle(),
                "<p>Hi " + user.getName() + ",</p>" +
                        "<p>You are successfully registered for <b>" + event.getTitle() + "</b>!</p>");
    }

    @Async("emailTaskExecutor")
    public void sendWaitlistConfirmation(User user, Event event) {
        sendHtmlEmail(user.getEmail(),
                "Added to Waitlist: " + event.getTitle(),
                "<p>Hi " + user.getName() + ",</p>" +
                        "<p>You are on the waitlist for <b>" + event.getTitle() + "</b>. We will notify you if a spot opens up.</p>");
    }

    @Async("emailTaskExecutor")
    public void sendWaitlistPromotion(User user, Event event) {
        sendHtmlEmail(user.getEmail(),
                "You got a spot! 🎉 " + event.getTitle(),
                "<h2>Great news, " + user.getName() + "!</h2>" +
                        "<p>A spot opened up and you are now officially registered for <b>" + event.getTitle() + "</b>.</p>");
    }

    @Async("emailTaskExecutor")
    public void sendEventReminder(User user, Event event) {
        String subject = "Reminder: " + event.getTitle() + " is starting soon!";
        String htmlBody = "<h2>Hello " + user.getName() + ",</h2>" +
                "<p>This is a quick reminder that <b>" + event.getTitle() +
                "</b> is happening at <b>" + event.getVenue() + "</b>.</p>" +
                "<p>We look forward to seeing you there!</p>";
        sendHtmlEmail(user.getEmail(), subject, htmlBody);
    }

    // ─── TEAM & BULK EMAILS ─────────────────────────────────────────────────────

    @Async("emailTaskExecutor")
    public void sendTeamRegistrationConfirmation(User leader, List<TeamMember> teamMembers, Event event, boolean isWaitlist) {
        List<String> allEmails = new ArrayList<>();
        allEmails.add(leader.getEmail());
        teamMembers.forEach(tm -> allEmails.add(tm.getEmail()));

        String statusText = isWaitlist ? "on the waitlist" : "successfully registered";
        String subject = isWaitlist ? "Team Waitlisted: " + event.getTitle() : "Team Registered: " + event.getTitle();

        String htmlBody = "<h2>Hello Team!</h2>" +
                "<p>Your team leader, <b>" + leader.getName() + "</b>, has " + statusText + " your team for <b>" + event.getTitle() + "</b>.</p>" +
                "<p>We look forward to seeing you all there!</p>";

        sendBulkBccEmail(allEmails, subject, htmlBody);
    }

    @Async("emailTaskExecutor")
    public void sendBulkBroadcast(List<String> recipientEmails, String subject, String htmlBody) {
        sendBulkBccEmail(recipientEmails, subject, htmlBody);
    }

    // ─── CORE HTML EMAIL LOGIC ──────────────────────────────────────────────────

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true = HTML format

            mailSender.send(message);
            log.info("Email sent to {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send email to {}", to, e);
        }
    }

    private void sendBulkBccEmail(List<String> emails, String subject, String htmlBody) {
        if (emails == null || emails.isEmpty()) return;

        int batchSize = 50;

        for (int i = 0; i < emails.size(); i += batchSize) {
            List<String> batch = emails.subList(i, Math.min(i + batchSize, emails.size()));

            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                helper.setFrom(fromEmail);
                helper.setTo(fromEmail); // Best practice: send to self, BCC everyone else
                helper.setBcc(batch.toArray(new String[0]));
                helper.setSubject(subject);
                helper.setText(htmlBody, true);

                mailSender.send(message);
                log.info("Sent bulk email batch to {} recipients", batch.size());
            } catch (MessagingException e) {
                log.error("Failed to send bulk email batch", e);
            }
        }
    }
}