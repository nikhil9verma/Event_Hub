package com.eventhub.eventhub_backend.repository;

import com.eventhub.eventhub_backend.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {

    // Checks if any of the provided emails are already listed as teammates for this specific event
    boolean existsByRegistrationEventIdAndEmailIn(Long eventId, List<String> emails);
}