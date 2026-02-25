package com.eventhub.eventhub_backend.repository;


import com.eventhub.eventhub_backend.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {

    Optional<Rating> findByUserIdAndEventId(Long userId, Long eventId);

    @Query("SELECT AVG(r.stars) FROM Rating r WHERE r.event.id = :eventId")
    Double findAverageRatingByEventId(@Param("eventId") Long eventId);

    long countByEventId(Long eventId);

    // Hard delete all ratings by this user
    @Modifying
    @Query("DELETE FROM Rating r WHERE r.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}

