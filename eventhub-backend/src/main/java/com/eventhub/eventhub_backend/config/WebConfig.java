package com.eventhub.eventhub_backend.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;
import java.nio.file.Paths;

@Configuration
@Slf4j
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.file-upload.dir}")
    private String uploadDir;
    @Value("${app.frontend-url}")
    private String frontendUrl;
    @PostConstruct
    public void logUploadPath() {
        String absolutePath = Paths.get(uploadDir).toAbsolutePath().normalize().toString();
        File folder = new File(absolutePath);
        log.info("=== Upload dir absolute path: {}", absolutePath);
        log.info("=== Upload dir exists: {}", folder.exists());
        if (folder.exists()) {
            File[] files = folder.listFiles();
            log.info("=== Upload dir contents: {}",
                    files != null ? files.length + " items" : "empty");
        }
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String absolutePath = Paths.get(uploadDir)
                .toAbsolutePath()
                .normalize()
                .toString()
                .replace("\\", "/"); // normalize Windows backslashes

        // Must end with /
        if (!absolutePath.endsWith("/")) {
            absolutePath = absolutePath + "/";
        }

        log.info("=== Resource handler path: file:{}", absolutePath);

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + absolutePath)
                .setCachePeriod(0);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/uploads/**")
                .allowedOrigins(frontendUrl)
                .allowedMethods("GET");
    }
}