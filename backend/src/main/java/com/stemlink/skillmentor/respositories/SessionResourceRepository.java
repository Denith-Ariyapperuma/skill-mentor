package com.stemlink.skillmentor.respositories;

import com.stemlink.skillmentor.entities.SessionResource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface SessionResourceRepository extends JpaRepository<SessionResource, Long> {

    List<SessionResource> findBySession_IdOrderByCreatedAtAsc(Integer sessionId);

    @Query("SELECT r FROM SessionResource r WHERE r.session.id IN :ids ORDER BY r.session.id ASC, r.createdAt ASC")
    List<SessionResource> findBySessionIdsOrderBySessionAndCreated(@Param("ids") Collection<Integer> sessionIds);
}
