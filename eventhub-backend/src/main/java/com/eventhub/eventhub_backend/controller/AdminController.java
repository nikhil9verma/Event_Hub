package com.eventhub.eventhub_backend.controller;

import com.eventhub.eventhub_backend.dto.response.ApiResponse;
import com.eventhub.eventhub_backend.dto.response.HostRequestResponse;
import com.eventhub.eventhub_backend.dto.response.UserResponse;
import com.eventhub.eventhub_backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminController {

    private final AuthService authService;

    @GetMapping("/host-requests")
    public ResponseEntity<ApiResponse<List<HostRequestResponse>>> getPendingRequests() {
        return ResponseEntity.ok(ApiResponse.success(authService.getPendingHostRequests()));
    }

    @PostMapping("/host-requests/{id}/approve")
    public ResponseEntity<ApiResponse<UserResponse>> approve(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Host approved", authService.approveHostRequest(id)));
    }

    @PostMapping("/host-requests/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> reject(@PathVariable Long id) {
        authService.rejectHostRequest(id);
        return ResponseEntity.ok(ApiResponse.success("Request rejected", null));
    }

    @DeleteMapping("/users/purge")
    public ResponseEntity<ApiResponse<Void>> hardDeleteByEmail(@RequestParam String email) {
        authService.hardDeleteAccountByEmail(email);
        return ResponseEntity.ok(ApiResponse.success("User permanently deleted", null));
    }
    @GetMapping("/hosts")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getHostsAndAdmins() {
        return ResponseEntity.ok(ApiResponse.success(authService.getHostsAndAdmins()));
    }

    @PostMapping("/users/{id}/demote")
    public ResponseEntity<ApiResponse<UserResponse>> demoteToStudent(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("User demoted to Student", authService.demoteToStudent(id)));
    }
}