package com.eventhub.eventhub_backend.repository;


import com.eventhub.eventhub_backend.entity.Event;
import com.eventhub.eventhub_backend.enums.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long>, JpaSpecificationExecutor<Event> {

    @Query("""
        SELECT e FROM Event e WHERE e.status = :status AND e.eventDate >= :now
        ORDER BY e.eventDate ASC
    """)
    Page<Event> findUpcomingEvents(@Param("status") EventStatus status,
                                   @Param("now") LocalDateTime now,
                                   Pageable pageable);

    @Query("""
        SELECT e FROM Event e WHERE e.host.id = :hostId
        ORDER BY e.createdAt DESC
    """)
    Page<Event> findByHostId(@Param("hostId") Long hostId, Pageable pageable);

    @Query("""
        SELECT e FROM Event e
        WHERE e.status IN ('ACTIVE','FULL')
        AND e.eventDate BETWEEN :start AND :end
    """)
    List<Event> findEventsForReminder(@Param("start") LocalDateTime start,
                                      @Param("end") LocalDateTime end);

    @Query("""
        SELECT e FROM Event e WHERE e.status IN ('ACTIVE','FULL')
        AND e.eventEndTime < :now
    """)
    List<Event> findExpiredActiveEvents(@Param("now") LocalDateTime now);

    List<Event> findByHostIdAndStatus(Long hostId, EventStatus status);

    // Used during account deletion: nullify host FK so the user row can be
    // hard deleted while keeping the SUSPENDED event rows intact for history.
    @Modifying
    @Query("UPDATE Event e SET e.host = null WHERE e.host.id = :hostId")
    void detachHostFromAllEvents(@Param("hostId") Long hostId);
}