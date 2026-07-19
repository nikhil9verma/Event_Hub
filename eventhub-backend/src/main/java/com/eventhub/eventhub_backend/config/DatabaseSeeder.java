package com.eventhub.eventhub_backend.config;

import com.eventhub.eventhub_backend.entity.User;
import com.eventhub.eventhub_backend.enums.Role;
import com.eventhub.eventhub_backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        seedSuperAdmin("nikhil9verma@gmail.com");
        seedSuperAdmin("nikhil9verma9947@gmail.com");
    }

    private void seedSuperAdmin(String email) {
        if (userRepository.findByEmail(email).isEmpty()) {
            User superAdmin = new User();
            superAdmin.setName("Nikhil Verma");
            superAdmin.setEmail(email);
            superAdmin.setPassword(passwordEncoder.encode("password123")); 
            superAdmin.setRole(Role.SUPER_ADMIN);
            superAdmin.setCourse("B.Tech");
            superAdmin.setBatch("2024");
            superAdmin.setDeleted(false);
            
            userRepository.save(superAdmin);
            log.info("✅ Seeded SUPER_ADMIN user: {}", email);
        }
    }
}
