package com.eventhub.eventhub_backend.repository;

import com.eventhub.eventhub_backend.entity.Registration;
import com.eventhub.eventhub_backend.enums.RegistrationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RegistrationRepository extends JpaRepository<Registration, Long> {

    @Query("SELECT r FROM Registration r JOIN FETCH r.user WHERE r.event.id = :eventId ORDER BY r.registeredAt DESC")
    List<Registration> findByEventIdOrderByRegisteredAtDesc(@Param("eventId") Long eventId);
    Optional<Registration> findByUserIdAndEventId(Long userId, Long eventId);

    @Query("SELECT COUNT(r) FROM Registration r WHERE r.event.id = :eventId AND r.status = :status")
    long countByEventIdAndStatus(@Param("eventId") Long eventId,
                                 @Param("status") RegistrationStatus status);

    @Query("""
            SELECT r FROM Registration r
            WHERE r.event.id = :eventId AND r.status = 'WAITLIST'
            ORDER BY r.registeredAt ASC
            """)
    List<Registration> findWaitlistByEventIdOrdered(@Param("eventId") Long eventId);

    @Query("SELECT r FROM Registration r WHERE r.user.id = :userId ORDER BY r.registeredAt DESC")
    Page<Registration> findByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT r FROM Registration r WHERE r.user.id = :userId AND r.event.id = :eventId")
    Optional<Registration> findByUserAndEvent(@Param("userId") Long userId,
                                              @Param("eventId") Long eventId);

    @Query("SELECT r FROM Registration r WHERE r.user.id = :userId AND r.status = :status")
    List<Registration> findByUserIdAndStatus(@Param("userId") Long userId,
                                             @Param("status") RegistrationStatus status);

    // ← NEW: fetch all registrations for an event by status (used by scheduler)
    @Query("SELECT r FROM Registration r JOIN FETCH r.user WHERE r.event.id = :eventId AND r.status = :status")
    List<Registration> findByEventIdAndStatus(@Param("eventId") Long eventId,
                                              @Param("status") RegistrationStatus status);

    @Query(value = """
            SELECT CAST(r.registered_at AS date) AS day, COUNT(r.id) AS cnt
            FROM registrations r
            WHERE r.event_id = :eventId AND r.status = 'REGISTERED'
            GROUP BY CAST(r.registered_at AS date)
            ORDER BY CAST(r.registered_at AS date)
            """, nativeQuery = true)
    List<Object[]> findDailyRegistrationCounts(@Param("eventId") Long eventId);

    @Modifying
    @Query("DELETE FROM Registration r WHERE r.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}