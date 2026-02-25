package com.eventhub.eventhub_backend.service;

import com.eventhub.eventhub_backend.dto.request.FeedbackRequests;
import com.eventhub.eventhub_backend.dto.response.CommentResponse;
import com.eventhub.eventhub_backend.dto.response.RatingResponse;
import com.eventhub.eventhub_backend.entity.Comment;
import com.eventhub.eventhub_backend.entity.Event;
import com.eventhub.eventhub_backend.entity.Rating;
import com.eventhub.eventhub_backend.entity.User;
import com.eventhub.eventhub_backend.enums.EventStatus;
import com.eventhub.eventhub_backend.enums.RegistrationStatus;
import com.eventhub.eventhub_backend.exception.BusinessException;
import com.eventhub.eventhub_backend.exception.ResourceNotFoundException;
import com.eventhub.eventhub_backend.repository.CommentRepository;
import com.eventhub.eventhub_backend.repository.EventRepository;
import com.eventhub.eventhub_backend.repository.RatingRepository;
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
    private final RatingRepository ratingRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final RegistrationRepository registrationRepository;

    /* ========================= COMMENT ========================= */

    @Transactional
    public CommentResponse addComment(Long eventId,
                                      Long userId,
                                      FeedbackRequests.CommentRequest request) {

        Event event = getCompletedEvent(eventId);
        User user = getActiveUser(userId);
        verifyAttended(eventId, userId);

        Comment comment = Comment.builder()
                .event(event)
                .user(user)
                .message(request.getMessage())
                .build();

        Comment saved = commentRepository.save(comment);
        return toCommentResponse(saved);
    }

    public Page<CommentResponse> getComments(Long eventId, int page, int size) {
        return commentRepository
                .findByEventIdOrderByCreatedAtDesc(
                        eventId,
                        PageRequest.of(page, size)
                )
                .map(this::toCommentResponse);
    }

    /* ========================= RATING ========================= */

    @Transactional
    public RatingResponse addOrUpdateRating(Long eventId,
                                            Long userId,
                                            FeedbackRequests.RatingRequest request) {

        Event event = getCompletedEvent(eventId);
        User user = getActiveUser(userId);
        verifyAttended(eventId, userId);

        if (request.getStars() < 1 || request.getStars() > 5) {
            throw new BusinessException("Rating must be between 1 and 5 stars");
        }

        Rating rating = ratingRepository
                .findByUserIdAndEventId(userId, eventId)
                .orElseGet(() ->
                        Rating.builder()
                                .event(event)
                                .user(user)
                                .build()
                );

        rating.setStars(request.getStars());

        Rating saved = ratingRepository.save(rating);
        return toRatingResponse(saved);
    }

    /* ========================= VALIDATION ========================= */

    private void verifyAttended(Long eventId, Long userId) {

        boolean attended = registrationRepository
                .findByUserIdAndEventId(userId, eventId)
                .filter(r -> r.getStatus() == RegistrationStatus.REGISTERED)
                .isPresent();

        if (!attended) {
            throw new BusinessException(
                    "You must have attended this event to leave feedback"
            );
        }
    }

    private Event getCompletedEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Event not found"));

        if (event.getStatus() != EventStatus.COMPLETED) {
            throw new BusinessException(
                    "Feedback can only be given for completed events"
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
        return CommentResponse.builder()
                .id(c.getId())
                .userId(c.getUser().getId())
                .userName(c.getUser().getName())
                .userImageUrl(c.getUser().getProfileImageUrl())
                .message(c.getMessage())
                .createdAt(c.getCreatedAt())
                .build();
    }

    private RatingResponse toRatingResponse(Rating r) {
        return RatingResponse.builder()
                .id(r.getId())
                .userId(r.getUser().getId())
                .userName(r.getUser().getName())
                .stars(r.getStars())
                .createdAt(r.getCreatedAt())
                .build();
    }
}