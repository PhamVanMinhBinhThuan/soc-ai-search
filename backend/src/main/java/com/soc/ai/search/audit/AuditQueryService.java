package com.soc.ai.search.audit;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditQueryService {

    private static final Sort AUDIT_SORT = Sort.by(
            Sort.Order.desc("createdAt"),
            Sort.Order.desc("id"));

    private final SearchQueryLogRepository repository;
    private final AuditProperties properties;

    public AuditQueryService(SearchQueryLogRepository repository, AuditProperties properties) {
        this.repository = repository;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public PagedResponse<SearchHistoryItem> history(int page, int size) {
        validatePagination(page, size);
        final Page<SearchQueryLog> result;
        try {
            result = repository.findByUserIdentity(
                    properties.demoUserIdentity(),
                    PageRequest.of(page, size, AUDIT_SORT));
        } catch (DataAccessException exception) {
            throw new AuditPersistenceException("Audit history lookup failed", exception);
        }
        var items = result.getContent().stream()
                .map(log -> new SearchHistoryItem(
                        log.getId(),
                        log.getQuestion(),
                        log.getMode(),
                        log.getResultCount(),
                        log.getLatencyMs(),
                        log.getStatus(),
                        log.getCreatedAt()))
                .toList();

        return new PagedResponse<>(
                items,
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public PagedResponse<AuditLogItem> auditLogs(int page, int size) {
        validatePagination(page, size);
        final Page<SearchQueryLog> result;
        try {
            result = repository.findAll(PageRequest.of(page, size, AUDIT_SORT));
        } catch (DataAccessException exception) {
            throw new AuditPersistenceException("Audit log lookup failed", exception);
        }
        var items = result.getContent().stream()
                .map(log -> new AuditLogItem(
                        log.getId(),
                        log.getUserIdentity(),
                        log.getQuestion(),
                        log.getMode(),
                        log.getResultCount(),
                        log.getLatencyMs(),
                        log.getStatus(),
                        log.getErrorMessage(),
                        log.getCreatedAt()))
                .toList();

        return new PagedResponse<>(
                items,
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }

    private void validatePagination(int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("page must be greater than or equal to 0");
        }
        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("size must be between 1 and 100");
        }
    }
}
