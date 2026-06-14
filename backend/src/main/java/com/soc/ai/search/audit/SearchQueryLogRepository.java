package com.soc.ai.search.audit;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface SearchQueryLogRepository extends JpaRepository<SearchQueryLog, UUID> {

    Page<SearchQueryLog> findByUserIdentity(String userIdentity, Pageable pageable);

    Optional<SearchQueryLog> findByIdAndUserIdentity(UUID id, String userIdentity);
}
