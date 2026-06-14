package com.soc.ai.search.audit;

import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SearchQueryLogLookupService {

    private final SearchQueryLogRepository repository;
    private final AuditProperties properties;

    public SearchQueryLogLookupService(
            SearchQueryLogRepository repository,
            AuditProperties properties) {
        this.repository = repository;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public Optional<StoredSearchQuery> findForExport(UUID queryId) {
        try {
            return repository.findByIdAndUserIdentity(queryId, properties.demoUserIdentity())
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
