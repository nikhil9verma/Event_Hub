package com.eventhub.eventhub_backend.controller;

import com.eventhub.eventhub_backend.dto.request.AuthRequests;
import com.eventhub.eventhub_backend.dto.response.ApiResponse;
import com.eventhub.eventhub_backend.dto.response.AuthResponse;
import com.eventhub.eventhub_backend.dto.response.UserResponse;
import com.eventhub.eventhub_backend.service.AuthService;
import com.eventhub.eventhub_backend.service.FileStorageService;
import com.eventhub.eventhub_backend.util.SecurityUtils;
import com.eventhub.eventhub_backend.dto.response.HostRequestResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final FileStorageService fileStorageService;
    private final SecurityUtils securityUtils;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> register(@Valid @RequestBody AuthRequests.Register request) {
        return ResponseEntity.status(201).body(ApiResponse.success("Registration initiated", authService.register(request)));
    }

    @PostMapping("/verify-registration")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyRegistration(@RequestParam String email, @RequestParam String otp) {
        return ResponseEntity.ok(ApiResponse.success("Registration complete!", authService.verifyAndRegister(email, otp)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AuthRequests.Login request) {
        return ResponseEntity.ok(ApiResponse.success("Login successful", authService.login(request)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@RequestParam String email) {
        return ResponseEntity.ok(ApiResponse.success(authService.initiateForgotPassword(email)));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@RequestParam String email, @RequestParam String otp, @RequestParam String newPassword) {
        authService.resetPassword(email, otp, newPassword);
        return ResponseEntity.ok(ApiResponse.success("Password reset successful", null));
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile() {
        return ResponseEntity.ok(ApiResponse.success(authService.getProfile(securityUtils.getCurrentUserId())));
    }

    // 🟢 DELEGATES TO SERVICE
    @PatchMapping("/profile")
    public ResponseEntity<ApiResponse<AuthResponse>> updateProfile(@Valid @RequestBody AuthRequests.UpdateProfile request) {
        return ResponseEntity.ok(ApiResponse.success("Profile updated", authService.updateProfile(securityUtils.getCurrentUserId(), request)));
    }

    @PostMapping("/profile/email/request")
    public ResponseEntity<ApiResponse<String>> requestEmailChange(@Valid @RequestBody AuthRequests.RequestEmailChange request) {
        return ResponseEntity.ok(ApiResponse.success(authService.requestEmailChange(securityUtils.getCurrentUserId(), request)));
    }

    // 🟢 DELEGATES TO SERVICE
    @PostMapping("/profile/email/verify")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyEmailChange(@Valid @RequestBody AuthRequests.VerifyEmailChange request) {
        return ResponseEntity.ok(ApiResponse.success("Email successfully updated", authService.verifyEmailChange(securityUtils.getCurrentUserId(), request)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<String>> refreshToken(HttpServletRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Token refreshed", authService.refreshToken(request)));
    }

    @PostMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody AuthRequests.ChangePassword request) {
        authService.changePassword(securityUtils.getCurrentUserId(), request);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
    }

    @PostMapping("/avatar")
    public ResponseEntity<ApiResponse<String>> uploadAvatar(@RequestParam("file") MultipartFile file) {
        String url = fileStorageService.storeFile(file, "avatars");
        authService.updateProfileImage(securityUtils.getCurrentUserId(), url);
        return ResponseEntity.ok(ApiResponse.success("Avatar uploaded", url));
    }

    @PostMapping("/apply-host")
    public ResponseEntity<ApiResponse<HostRequestResponse>> applyForHost(@RequestParam(required = false) String reason) {
        return ResponseEntity.ok(ApiResponse.success("Host request submitted! Awaiting admin approval.", authService.requestHostRole(securityUtils.getCurrentUserId(), reason)));
    }

    @DeleteMapping("/account")
    public ResponseEntity<ApiResponse<Void>> deleteAccount() {
        authService.deleteAccount(securityUtils.getCurrentUserId());
        return ResponseEntity.ok(ApiResponse.success("Account deleted successfully", null));
    }
}