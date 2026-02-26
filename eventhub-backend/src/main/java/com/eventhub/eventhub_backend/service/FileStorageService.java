package com.eventhub.eventhub_backend.service;

import com.eventhub.eventhub_backend.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {

    private static final List<String> ALLOWED_IMAGE_TYPES = List.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp"
    );

    private final Path uploadPath;

    public FileStorageService(@Value("${app.file-upload.dir}") String uploadDir) {
        this.uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to create upload directory", e);
        }
    }

    public String storeFile(MultipartFile file, String subfolder) {
        if (file.isEmpty()) {
            throw new BusinessException("File is empty");
        }

        String contentType = file.getContentType();
        if (!ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw new BusinessException("Only JPEG, PNG, and WebP images are allowed");
        }

        // Note: You can also enforce this globally in application.properties
        // using spring.servlet.multipart.max-file-size=10MB
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new BusinessException("File size exceeds 10MB limit");
        }

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "");
        String extension = originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : ".jpg";
        String filename = UUID.randomUUID() + extension;

        try {
            Path targetDir = this.uploadPath.resolve(subfolder);
            Files.createDirectories(targetDir);
            Path targetPath = targetDir.resolve(filename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            // 🔥 FIX: Return just the relative folder and filename (e.g., "cards/123.png")
            return subfolder + "/" + filename;

        } catch (IOException e) {
            log.error("Failed to store file: {}", e.getMessage());
            throw new BusinessException("Failed to store file. Please try again.");
        }
    }

    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.trim().isEmpty()) return;

        // 🔥 FIX: Handle both new clean paths ("cards/123.png") and legacy paths ("/uploads/cards/123.png")
        String cleanPath = fileUrl.startsWith("/uploads/")
                ? fileUrl.substring("/uploads/".length())
                : fileUrl;

        try {
            Path filePath = this.uploadPath.resolve(cleanPath).normalize();

            // Security Enhancement: Prevent Path Traversal attacks (e.g., passing "../../windows/system32")
            if (!filePath.startsWith(this.uploadPath)) {
                log.warn("Security Warning: Attempted path traversal deletion for: {}", fileUrl);
                return;
            }

            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.warn("Failed to delete file: {}", fileUrl);
        }
    }
}