package com.eventhub.eventhub_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class EmailConfig {

    @Bean(name = "emailTaskExecutor")
    public Executor emailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // The number of threads kept alive
        executor.setCorePoolSize(5);
        // The maximum number of threads allowed
        executor.setMaxPoolSize(10);
        // The queue size for incoming emails when all threads are busy
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("EmailSender-");
        executor.initialize();
        return executor;
    }
}