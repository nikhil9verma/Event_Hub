package com.eventhub.eventhub_backend.repository;


import com.eventhub.eventhub_backend.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    Page<Comment> findByEventIdOrderByCreatedAtDesc(Long eventId, Pageable pageable);

    boolean existsByUserIdAndEventId(Long userId, Long eventId);

    // Hard delete all comments by this user
    @Modifying
    @Query("DELETE FROM Comment c WHERE c.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}
