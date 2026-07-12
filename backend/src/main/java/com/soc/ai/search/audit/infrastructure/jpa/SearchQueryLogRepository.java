package com.soc.ai.search.audit.infrastructure.jpa;


import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.soc.ai.search.audit.domain.AuditStatus;
public interface SearchQueryLogRepository extends JpaRepository<SearchQueryLog, UUID>, JpaSpecificationExecutor<SearchQueryLog> {

    Page<SearchQueryLog> findByUserIdentity(String userIdentity, Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM SearchQueryLog s WHERE s.userIdentity = :userIdentity " +
            "AND (:pinned IS NULL OR s.pinned = :pinned) " +
            "AND (:status IS NULL OR s.status = :status) " +
            "AND (:mode IS NULL OR s.mode = :mode)")
    Page<SearchQueryLog> findWithFilters(
            @org.springframework.data.repository.query.Param("userIdentity") String userIdentity,
            @org.springframework.data.repository.query.Param("pinned") Boolean pinned,
            @org.springframework.data.repository.query.Param("status") AuditStatus status,
            @org.springframework.data.repository.query.Param("mode") com.soc.ai.search.search.domain.plan.SearchMode mode,
            Pageable pageable);

    Optional<SearchQueryLog> findByIdAndUserIdentity(UUID id, String userIdentity);
}
