package com.eventhub.eventhub_backend.dto.request;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthRequests {

    @Data
    public static class Register {
        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
        private String name;
        @NotBlank(message = "Course is required")
        private String course;

        @NotBlank(message = "Batch is required")
        private String batch;
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        private String password;
    }

    @Data
    public static class Login {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    public static class ChangePassword {
        @NotBlank(message = "Current password is required")
        private String currentPassword;

        @NotBlank(message = "New password is required")
        @Size(min = 8, message = "New password must be at least 8 characters")
        private String newPassword;
    }

    @Data
    public static class UpdateProfile {
        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 100)
        private String name;

        @NotBlank(message = "Course is required")
        private String course;

        @NotBlank(message = "Batch is required")
        private String batch;

        // --- NEW: Added Email Field ---
        @Email(message = "Invalid email format")
        private String email;
    }
    // Inside com.eventhub.eventhub_backend.dto.request.AuthRequests;

    @Data
    public static class RequestEmailChange {
        @NotBlank(message = "New email is required")
        @Email(message = "Invalid email format")
        private String newEmail;
    }

    @Data
    public static class VerifyEmailChange {
        @NotBlank(message = "New email is required")
        @Email(message = "Invalid email format")
        private String newEmail;

        @NotBlank(message = "OTP is required")
        private String otp;
    }

}