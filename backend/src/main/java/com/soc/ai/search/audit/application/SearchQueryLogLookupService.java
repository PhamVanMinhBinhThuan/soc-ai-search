package com.soc.ai.search.audit.application;


import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.soc.ai.search.security.CurrentUserService;

import com.soc.ai.search.audit.domain.StoredSearchQuery;
import com.soc.ai.search.audit.infrastructure.jpa.SearchQueryLogRepository;
@Service
public class SearchQueryLogLookupService {

    private final SearchQueryLogRepository repository;
    private final CurrentUserService currentUserService;

    public SearchQueryLogLookupService(
            SearchQueryLogRepository repository,
            CurrentUserService currentUserService) {
        this.repository = repository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public Optional<StoredSearchQuery> findForExport(UUID queryId) {
        try {
            return repository.findByIdAndUserIdentity(queryId, currentUserService.currentIdentity())
                    .map(log -> new StoredSearchQuery(
                            log.getId(),
                            log.getUserIdentity(),
                            log.getStatus(),
                            log.getMode(),
                            log.getSearchPlan()));
        } catch (DataAccessException exception) {
            throw new AuditPersistenceException("Audit export lookup failed", exception);
        }
    }
}
