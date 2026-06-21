package com.soc.ai.search.audit;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.soc.ai.search.security.CurrentUserService;

@Service
public class AuditQueryService {

    private static final Sort AUDIT_SORT = Sort.by(
            Sort.Order.desc("createdAt"),
            Sort.Order.desc("id"));

    private static final Sort PINNED_SORT = Sort.by(
            Sort.Order.desc("pinnedAt"),
            Sort.Order.desc("createdAt"),
            Sort.Order.desc("id"));

    private final SearchQueryLogRepository repository;
    private final CurrentUserService currentUserService;

    public AuditQueryService(SearchQueryLogRepository repository, CurrentUserService currentUserService) {
        this.repository = repository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public PagedResponse<SearchHistoryItem> history(
            int page, int size, Boolean pinned, AuditStatus status, com.soc.ai.search.search.plan.SearchMode mode) {
        validatePagination(page, size);
        final Page<SearchQueryLog> result;
        try {
            Sort sort = (Boolean.TRUE.equals(pinned)) ? PINNED_SORT : AUDIT_SORT;
            result = repository.findWithFilters(
                    currentUserService.currentIdentity(),
                    pinned,
                    status,
                    mode,
                    PageRequest.of(page, size, sort));
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
                        log.getCreatedAt(),
                        log.isPinned(),
                        log.getPinnedAt()))
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

    @Transactional(readOnly = true)
    public SearchHistoryDetailItem getHistoryDetail(java.util.UUID queryId) {
        return repository.findByIdAndUserIdentity(queryId, currentUserService.currentIdentity())
                .map(log -> new SearchHistoryDetailItem(
                        log.getId(),
                        log.getUserIdentity(),
                        log.getQuestion(),
                        log.getMode(),
                        log.getResultCount(),
                        log.getLatencyMs(),
                        log.getStatus(),
                        log.getErrorMessage(),
                        log.getSummary(),
                        log.getSearchPlan(),
                        log.getGeneratedDsl(),
                        log.getCreatedAt(),
                        log.isPinned(),
                        log.getPinnedAt()))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Query not found or access denied"));
    }

    @Transactional
    public SearchHistoryItem pinQuery(java.util.UUID queryId, boolean pinned) {
        SearchQueryLog log = repository.findByIdAndUserIdentity(queryId, currentUserService.currentIdentity())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Query not found or access denied"));
        
        log.setPinned(pinned);
        log = repository.save(log);
        
        return new SearchHistoryItem(
                log.getId(),
                log.getQuestion(),
                log.getMode(),
                log.getResultCount(),
                log.getLatencyMs(),
                log.getStatus(),
                log.getCreatedAt(),
                log.isPinned(),
                log.getPinnedAt());
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
