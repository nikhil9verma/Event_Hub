package com.eventhub.eventhub_backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class TeamRegistrationRequest {

    @Valid
    private List<TeammateDto> teamMembers;

    @Data
    public static class TeammateDto {
        @NotBlank(message = "Teammate name is required")
        private String name;

        @NotBlank(message = "Teammate email is required")
        @Email(message = "Invalid email format")
        private String email;
    }
}