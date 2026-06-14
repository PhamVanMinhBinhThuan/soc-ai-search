package com.soc.ai.search.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface SearchQueryLogRepository extends JpaRepository<SearchQueryLog, java.util.UUID> {

    Page<SearchQueryLog> findByUserIdentity(String userIdentity, Pageable pageable);
}
