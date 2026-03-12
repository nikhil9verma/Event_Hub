package com.eventhub.eventhub_backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class TeamRegistrationRequest {

    @NotBlank(message = "Team name is required")
    private String teamName;

    @Valid
    private List<TeammateDto> teamMembers;

    @Data
    public static class TeammateDto {
        @NotBlank(message = "Teammate email is required")
        @Email(message = "Invalid email format")
        private String email;

        // Note: 'name' has been removed because we fetch their
        // real registered name directly from the database!
    }
}