package com.eventhub.eventhub_backend.repository;

import com.eventhub.eventhub_backend.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {

    // Checks if any of the provided emails are already listed as teammates for this
    // specific event
    boolean existsByRegistrationEventIdAndEmailIn(Long eventId, List<String> emails);
}