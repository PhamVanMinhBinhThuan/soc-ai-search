package com.soc.ai.search.audit.application;


import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.soc.ai.search.audit.infrastructure.jpa.SearchQueryLog;
import com.soc.ai.search.audit.infrastructure.jpa.SearchQueryLogRepository;
@Service
public class AuditPersistenceService {

    private final SearchQueryLogRepository repository;

    public AuditPersistenceService(SearchQueryLogRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void save(SearchQueryLog queryLog) {
        try {
            repository.saveAndFlush(queryLog);
        } catch (DataAccessException exception) {
            throw new AuditPersistenceException("Audit persistence failed", exception);
        }
    }
}
