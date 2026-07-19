package com.eventhub.eventhub_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EventHubBackendApplication {

	@jakarta.annotation.PostConstruct
	public void init() {
		// Set JVM default timezone to IST so LocalDateTime.now() matches user inputs
		java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Asia/Kolkata"));
	}

	public static void main(String[] args) {
		SpringApplication.run(EventHubBackendApplication.class, args);
	}

}
