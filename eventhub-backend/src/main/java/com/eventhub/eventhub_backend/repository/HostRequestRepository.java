package com.eventhub.eventhub_backend.repository;

import com.eventhub.eventhub_backend.entity.HostRequest;
import com.eventhub.eventhub_backend.enums.HostRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HostRequestRepository extends JpaRepository<HostRequest, Long> {

    List<HostRequest> findByStatusOrderByRequestedAtAsc(HostRequestStatus status);

    Optional<HostRequest> findByUserIdAndStatus(Long userId, HostRequestStatus status);

    boolean existsByUserIdAndStatus(Long userId, HostRequestStatus status);

    // Used during account deletion to remove host requests before deleting the user row
    @Modifying
    @Query("DELETE FROM HostRequest h WHERE h.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}