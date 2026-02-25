package com.eventhub.eventhub_backend.repository;

import com.eventhub.eventhub_backend.entity.VerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {

    Optional<VerificationToken> findByEmailAndOtpCode(String email, String otpCode);

    // Forces the database to delete the old OTP immediately before inserting the new one
    @Modifying
    @Transactional
    @Query("DELETE FROM VerificationToken v WHERE v.email = :email")
    void deleteByEmail(@Param("email") String email);

    // Forces immediate deletion for the cleanup job as well
    @Modifying
    @Transactional
    @Query("DELETE FROM VerificationToken v WHERE v.expiryDate < :now")
    void deleteByExpiryDateBefore(@Param("now") LocalDateTime now);
}