package com.eventhub.eventhub_backend.service;

import com.eventhub.eventhub_backend.dto.request.FeedbackRequests;
import com.eventhub.eventhub_backend.dto.response.CommentResponse;
import com.eventhub.eventhub_backend.entity.Comment;
import com.eventhub.eventhub_backend.entity.Event;
import com.eventhub.eventhub_backend.entity.User;
import com.eventhub.eventhub_backend.enums.EventStatus;
import com.eventhub.eventhub_backend.enums.RegistrationStatus;
import com.eventhub.eventhub_backend.exception.BusinessException;
import com.eventhub.eventhub_backend.exception.ResourceNotFoundException;
import com.eventhub.eventhub_backend.repository.CommentRepository;
import com.eventhub.eventhub_backend.repository.EventRepository;
import com.eventhub.eventhub_backend.repository.RegistrationRepository;
import com.eventhub.eventhub_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final CommentRepository commentRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final RegistrationRepository registrationRepository;

    /* ========================= COMMENT ========================= */

    @Transactional
    public CommentResponse addComment(Long eventId,
                                      Long userId,
                                      FeedbackRequests.CommentRequest request) {

        // 🟢 FIX: Use getValidEventForComment instead of getCompletedEvent
        Event event = getValidEventForComment(eventId);
        User user = getActiveUser(userId);

        // Ensure they are registered to chat
        verifyRegistered(event, user);

        Comment comment = Comment.builder()
                .event(event)
                .user(user)
                .message(request.getMessage())
                .build();

        Comment saved = commentRepository.save(comment);
        return toCommentResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<CommentResponse> getComments(Long eventId, int page, int size) {
        return commentRepository
                .findByEventIdOrderByCreatedAtDesc(
                        eventId,
                        PageRequest.of(page, size)
                )
                .map(this::toCommentResponse);
    }

    /* ========================= VALIDATION ========================= */

    // 🟢 FIX: Renamed and updated the error message to make sense for upcoming events
    private void verifyRegistered(Event event, User user) {
        if (user.getRole() == com.eventhub.eventhub_backend.enums.Role.SUPER_ADMIN) {
            return;
        }
        if (event.getHost().getId().equals(user.getId())) {
            return;
        }
        if (!event.isRequiresRegistration()) {
            return; // Crowd events allow anyone logged in to comment
        }

        boolean hasAccess = registrationRepository
                .findByUserIdAndEventId(user.getId(), event.getId())
                .filter(r -> r.getStatus() == RegistrationStatus.REGISTERED
                        || r.getStatus() == RegistrationStatus.WAITLIST
                        || r.getStatus() == RegistrationStatus.INCOMPLETE)
                .isPresent();

        if (!hasAccess) {
            throw new BusinessException(
                    "You must be registered or waitlisted for this event to participate in the discussion."
            );
        }
    }

    private Event getValidEventForComment(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        if (event.getStatus() == EventStatus.SUSPENDED) {
            throw new BusinessException("Discussion is disabled for suspended events.");
        }

        return event;
    }

    private Event getCompletedEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Event not found"));

        if (event.getStatus() != EventStatus.COMPLETED) {
            throw new BusinessException(
                    "Feedback and ratings can only be given for completed events."
            );
        }

        return event;
    }

    private User getActiveUser(Long userId) {
        return userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));
    }

    /* ========================= MAPPERS ========================= */

    private CommentResponse toCommentResponse(Comment c) {
        User commentUser = c.getUser();
        return CommentResponse.builder()
                .id(c.getId())
                .userId(commentUser != null ? commentUser.getId() : null)
                .userName(commentUser != null ? commentUser.getName() : "[Deleted User]")
                .userImageUrl(commentUser != null ? commentUser.getProfileImageUrl() : null)
                .message(c.getMessage())
                .createdAt(c.getCreatedAt())
                .build();
    }

}