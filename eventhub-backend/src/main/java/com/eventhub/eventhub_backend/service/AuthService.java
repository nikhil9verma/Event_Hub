package com.eventhub.eventhub_backend.service;

import com.eventhub.eventhub_backend.dto.request.AuthRequests;
import com.eventhub.eventhub_backend.dto.response.AuthResponse;
import com.eventhub.eventhub_backend.dto.response.HostRequestResponse;
import com.eventhub.eventhub_backend.dto.response.UserResponse;
import com.eventhub.eventhub_backend.entity.HostRequest;
import com.eventhub.eventhub_backend.entity.User;
import com.eventhub.eventhub_backend.entity.VerificationToken;
import com.eventhub.eventhub_backend.enums.HostRequestStatus;
import com.eventhub.eventhub_backend.enums.RegistrationStatus;
import com.eventhub.eventhub_backend.enums.Role;
import com.eventhub.eventhub_backend.exception.BusinessException;
import com.eventhub.eventhub_backend.exception.ResourceNotFoundException;
import com.eventhub.eventhub_backend.repository.*;
import com.eventhub.eventhub_backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final HostRequestRepository hostRequestRepository;
    private final UserRepository userRepository;
    private final VerificationTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final RegistrationRepository registrationRepository;
    private final NotificationRepository notificationRepository;
    private final CommentRepository commentRepository;
    private final RatingRepository ratingRepository;
    private final EventService eventService;
    private final FileStorageService fileStorageService;
    private final EmailService emailService;

    // ─── Auth ───────────────────────────────────────────────────────────────────

    @Transactional
    public String register(AuthRequests.Register request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("Email is already registered");
        }

//        String otp = String.valueOf((int)((Math.random() * 900000) + 100000));
            String otp="123456";
        // Save to temporary table instead of User table
        tokenRepository.deleteByEmail(request.getEmail());
        tokenRepository.save(VerificationToken.builder()
                .email(request.getEmail())
                .name(request.getName())
                .course(request.getCourse()) // Added course
                .batch(request.getBatch())   // Added batch
                .password(passwordEncoder.encode(request.getPassword()))
                .otpCode(otp)
                .expiryDate(LocalDateTime.now().plusMinutes(15))
                .build());

//        emailService.sendOtpEmail(request.getEmail(), otp);
//        return "OTP sent to your email. Verify to complete registration.";
        return "OTP bypassed. Use 123456 to verify.";
    }

    @Transactional
    public AuthResponse verifyAndRegister(String email, String otp) {
        VerificationToken token = tokenRepository.findByEmailAndOtpCode(email, otp)
                .orElseThrow(() -> new BusinessException("Invalid or expired OTP"));

        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            tokenRepository.delete(token);
            throw new BusinessException("OTP has expired. Please register again.");
        }

        // OTP Valid: Create real user
        User user = User.builder()
                .name(token.getName())
                .email(token.getEmail())
                .course(token.getCourse()) // Added course
                .batch(token.getBatch())   // Added batch
                .password(token.getPassword())
                .role(Role.STUDENT)
                .build();

        User savedUser = userRepository.save(user);
        tokenRepository.deleteByEmail(email); // Cleanup temp data

        UserDetails userDetails = userDetailsService.loadUserByUsername(savedUser.getEmail());
        String jwtToken = jwtTokenProvider.generateToken(userDetails);
        return buildAuthResponse(savedUser, jwtToken);
    }

    public AuthResponse login(AuthRequests.Login request) {
        try {
            // Attempt to authenticate
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (BadCredentialsException e) {
            throw new BusinessException("Bad credentials");
        }

        User user = userRepository.findByEmailAndDeletedFalse(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtTokenProvider.generateToken(userDetails);
        return buildAuthResponse(user, token);
    }

    // ─── Profile ────────────────────────────────────────────────────────────────

    public UserResponse getProfile(Long userId) {
        return toUserResponse(findActiveUser(userId));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, AuthRequests.UpdateProfile request) {
        User user = findActiveUser(userId);
        user.setName(request.getName());
        user.setCourse(request.getCourse()); // Added course
        user.setBatch(request.getBatch());   // Added batch
        return toUserResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateProfileImage(Long userId, String imageUrl) {
        User user = findActiveUser(userId);
        if (user.getProfileImageUrl() != null) {
            fileStorageService.deleteFile(user.getProfileImageUrl());
        }
        user.setProfileImageUrl(imageUrl);
        return toUserResponse(userRepository.save(user));
    }

    @Transactional
    public void changePassword(Long userId, AuthRequests.ChangePassword request) {
        User user = findActiveUser(userId);
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BusinessException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    // ─── Host requests ──────────────────────────────────────────────────────────

    @Transactional
    public HostRequestResponse requestHostRole(Long userId, String reason) {
        User user = findActiveUser(userId);

        if (user.getRole() == Role.HOST || user.getRole() == Role.SUPER_ADMIN) {
            throw new BusinessException("You are already a host or admin");
        }

        if (hostRequestRepository.existsByUserIdAndStatus(userId, HostRequestStatus.PENDING)) {
            throw new BusinessException("You already have a pending host request");
        }

        HostRequest hostRequest = HostRequest.builder()
                .user(user)
                .reason(reason)
                .build();

        return toHostRequestResponse(hostRequestRepository.save(hostRequest));
    }

    public List<HostRequestResponse> getPendingHostRequests() {
        return hostRequestRepository
                .findByStatusOrderByRequestedAtAsc(HostRequestStatus.PENDING)
                .stream().map(this::toHostRequestResponse).toList();
    }

    @Transactional
    public UserResponse approveHostRequest(Long requestId) {
        HostRequest hostRequest = hostRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        if (hostRequest.getStatus() != HostRequestStatus.PENDING) {
            throw new BusinessException("Request has already been reviewed");
        }

        hostRequest.setStatus(HostRequestStatus.APPROVED);
        hostRequest.setReviewedAt(LocalDateTime.now());
        hostRequestRepository.save(hostRequest);

        User user = hostRequest.getUser();
        user.setRole(Role.HOST);
        return toUserResponse(userRepository.save(user));
    }

    @Transactional
    public void rejectHostRequest(Long requestId) {
        HostRequest hostRequest = hostRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        if (hostRequest.getStatus() != HostRequestStatus.PENDING) {
            throw new BusinessException("Request has already been reviewed");
        }

        hostRequest.setStatus(HostRequestStatus.REJECTED);
        hostRequest.setReviewedAt(LocalDateTime.now());
        hostRequestRepository.save(hostRequest);
        // User role stays STUDENT — no change needed
    }

    // ─── Account deletion ────────────────────────────────────────────────────────

    @Transactional
    public void deleteAccount(Long userId) {
        User user = findActiveUser(userId);

        // Cancel REGISTERED entries and trigger waitlist promotions
        registrationRepository
                .findByUserIdAndStatus(userId, RegistrationStatus.REGISTERED)
                .forEach(reg -> {
                    reg.setStatus(RegistrationStatus.CANCELLED);
                    registrationRepository.save(reg);
                    eventService.promoteFromWaitlist(reg.getEvent());
                });

        // Suspend hosted events — keep rows for other users' registration history
        eventService.suspendHostEvents(userId);

        // Nullify host FK so user row can be hard deleted
        eventService.detachHostFromEvents(userId);

        // Delete user's own activity — child tables first
        notificationRepository.deleteAllByUserId(userId);
        commentRepository.deleteAllByUserId(userId);
        ratingRepository.deleteAllByUserId(userId);
        registrationRepository.deleteAllByUserId(userId);
        hostRequestRepository.deleteAllByUserId(userId);

        // Delete profile image file
        if (user.getProfileImageUrl() != null) {
            fileStorageService.deleteFile(user.getProfileImageUrl());
        }

        // Hard delete — email is free to reuse
        userRepository.delete(user);
    }

    // ─── Admin: hard delete ──────────────────────────────────────────────────────

    @Transactional
    public void hardDeleteAccountByEmail(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            notificationRepository.deleteAllByUserId(user.getId());
            commentRepository.deleteAllByUserId(user.getId());
            ratingRepository.deleteAllByUserId(user.getId());
            registrationRepository.deleteAllByUserId(user.getId());
            hostRequestRepository.deleteAllByUserId(user.getId());
            eventService.detachHostFromEvents(user.getId());
            userRepository.delete(user);
        });
    }

    // ─── Private helpers ─────────────────────────────────────────────────────────

    private User findActiveUser(Long userId) {
        return userRepository.findByIdAndDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .course(user.getCourse()) // Added course
                .batch(user.getBatch())   // Added batch
                .profileImageUrl(user.getProfileImageUrl())
                .build();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .course(user.getCourse()) // Added course
                .batch(user.getBatch())   // Added batch
                .profileImageUrl(user.getProfileImageUrl())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private HostRequestResponse toHostRequestResponse(HostRequest r) {
        return HostRequestResponse.builder()
                .id(r.getId())
                .userId(r.getUser().getId())
                .userName(r.getUser().getName())
                .userEmail(r.getUser().getEmail())
                .status(r.getStatus())
                .reason(r.getReason())
                .requestedAt(r.getRequestedAt())
                .reviewedAt(r.getReviewedAt())
                .build();
    }

    // ─── Forgot Password Flow ───────────────────────────────────────────────────

    @Transactional
    public String initiateForgotPassword(String email) {
        // Only send OTP if user actually exists in the main users table
        User user = userRepository.findByEmailAndDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("No account found with this email"));

        // Generate 6-digit OTP
//        String otp = String.valueOf((int)((Math.random() * 900000) + 100000));
        String otp="123456";
        // Save OTP to the temporary token table
        tokenRepository.deleteByEmail(email);
        tokenRepository.save(VerificationToken.builder()
                .email(email)
                .otpCode(otp)
                .expiryDate(LocalDateTime.now().plusMinutes(10))
                .build());

//        emailService.sendForgotPasswordOtp(email, otp);
//        return "Password reset OTP sent to your email.";
        return "OTP bypassed. Use 123456 to reset your password.";
    }

    @Transactional
    public void resetPassword(String email, String otp, String newPassword) {
        // 1. Verify the OTP exists and is valid
        VerificationToken token = tokenRepository.findByEmailAndOtpCode(email, otp)
                .orElseThrow(() -> new BusinessException("Invalid or expired OTP"));

        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            tokenRepository.delete(token);
            throw new BusinessException("OTP has expired");
        }

        // 2. Find the actual user
        User user = userRepository.findByEmailAndDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // 3. Update the password and clean up the token
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        tokenRepository.deleteByEmail(email);
    }
}