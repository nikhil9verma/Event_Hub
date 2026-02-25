package com.eventhub.eventhub_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling

public class EventHubBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(EventHubBackendApplication.class, args);
	}

}
