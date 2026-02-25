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

    // GET http://localhost:8080/api/admin/host-requests
    @GetMapping("/host-requests")
    public ResponseEntity<ApiResponse<List<HostRequestResponse>>> getPendingRequests() {
        return ResponseEntity.ok(ApiResponse.success(authService.getPendingHostRequests()));
    }

    // POST http://localhost:8080/api/admin/host-requests/{id}/approve
    @PostMapping("/host-requests/{id}/approve")
    public ResponseEntity<ApiResponse<UserResponse>> approve(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Host approved", authService.approveHostRequest(id)));
    }

    // POST http://localhost:8080/api/admin/host-requests/{id}/reject
    @PostMapping("/host-requests/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> reject(@PathVariable Long id) {
        authService.rejectHostRequest(id);
        return ResponseEntity.ok(ApiResponse.success("Request rejected", null));
    }

    // Hard delete by email — dev/testing only
    @DeleteMapping("/users/purge")
    public ResponseEntity<ApiResponse<Void>> hardDeleteByEmail(@RequestParam String email) {
        authService.hardDeleteAccountByEmail(email);
        return ResponseEntity.ok(ApiResponse.success("User permanently deleted", null));
    }
}