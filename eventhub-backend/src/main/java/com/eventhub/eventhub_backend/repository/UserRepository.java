package com.eventhub.eventhub_backend.repository;

import com.eventhub.eventhub_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailAndDeletedFalse(String email);

    // Used by hardDeleteAccountByEmail — finds regardless of deleted flag
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByIdAndDeletedFalse(Long id);
}