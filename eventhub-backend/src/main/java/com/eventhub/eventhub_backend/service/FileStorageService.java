package com.eventhub.eventhub_backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.eventhub.eventhub_backend.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class FileStorageService {

    private final Cloudinary cloudinary;

    // Initialize Cloudinary with your credentials
    public FileStorageService(
            @Value("${cloudinary.cloud-name}") String cloudName,
            @Value("${cloudinary.api-key}") String apiKey,
            @Value("${cloudinary.api-secret}") String apiSecret) {

        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true));
    }

    public String storeFile(MultipartFile file, String folderName) {
        try {
            // Uploads to a specific folder in Cloudinary (e.g., eventhub/avatars)
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(),
                    ObjectUtils.asMap("folder", "eventhub/" + folderName));

            // Returns the permanent, secure URL
            return uploadResult.get("secure_url").toString();
        } catch (IOException e) {
            throw new BusinessException("Failed to upload image to Cloudinary");
        }
    }

    public void deleteFile(String fileUrl) {
        try {
            // Extracts the public ID from the URL so Cloudinary knows which file to delete
            String[] parts = fileUrl.split("/");
            String publicIdWithExtension = parts[parts.length - 1];
            String folderPath = parts[parts.length - 3] + "/" + parts[parts.length - 2];
            String publicId = folderPath + "/" + publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));

            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        } catch (Exception e) {
            System.out.println("Could not delete old image: " + e.getMessage());
        }
    }
}