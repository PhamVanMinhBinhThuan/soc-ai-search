package com.soc.ai.search.audit;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.dao.DataAccessException;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.soc.ai.search.security.CurrentUserService;
import com.soc.ai.search.security.RbacPermissionService;
import com.soc.ai.search.search.plan.SearchPlanContract;

@Service
public class AuditQueryService {

    private static final Sort AUDIT_SORT = Sort.by(
            Sort.Order.desc("createdAt"),
            Sort.Order.desc("id"));

    private static final Sort PINNED_SORT = Sort.by(
            Sort.Order.desc("pinnedAt"),
            Sort.Order.desc("createdAt"),
            Sort.Order.desc("id"));
    private static final int AUDIT_EXPORT_MAX_ROWS = SearchPlanContract.MAX_EXPORT_ROWS;

    private final SearchQueryLogRepository repository;
    private final CurrentUserService currentUserService;
    private final RbacPermissionService rbacPermissionService;

    public AuditQueryService(SearchQueryLogRepository repository, CurrentUserService currentUserService, RbacPermissionService rbacPermissionService) {
        this.repository = repository;
        this.currentUserService = currentUserService;
        this.rbacPermissionService = rbacPermissionService;
    }

    @Transactional(readOnly = true)
    public PagedResponse<SearchHistoryItem> history(
            int page, int size, AuditLogFilters filters) {
        validatePagination(page, size);
        final Page<SearchQueryLog> result;
        try {
            var effectiveFilters = filters == null ? emptyFilters() : filters;
            Sort sort = historySort(effectiveFilters);
            result = repository.findAll(
                    historySpecification(currentUserService.currentIdentity(), effectiveFilters),
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
    public PagedResponse<SearchHistoryItem> history(
            int page,
            int size,
            Boolean pinned,
            AuditStatus status,
            com.soc.ai.search.search.plan.SearchMode mode) {
        return history(page, size, new AuditLogFilters(null, status, mode, pinned, null, null, null, null));
    }

    @Transactional(readOnly = true)
    public PagedResponse<AuditLogItem> auditLogs(int page, int size, AuditLogFilters filters) {
        validatePagination(page, size);
        final Page<SearchQueryLog> result;
        try {
            result = repository.findAll(
                    auditSpecification(filters == null ? emptyFilters() : filters),
                    PageRequest.of(page, size, auditSort(filters)));
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
    public PagedResponse<AuditLogItem> auditLogs(int page, int size) {
        return auditLogs(page, size, emptyFilters());
    }

    @Transactional(readOnly = true)
    public PreparedAuditCsvExport prepareAuditExport(AuditLogFilters filters) {
        try {
            var effectiveFilters = filters == null ? emptyFilters() : filters;
            var page = repository.findAll(
                    auditSpecification(effectiveFilters),
                    PageRequest.of(0, AUDIT_EXPORT_MAX_ROWS + 1, auditSort(effectiveFilters)));
            var rows = page.getContent();
            var truncated = rows.size() > AUDIT_EXPORT_MAX_ROWS;
            var exportRows = List.copyOf(rows.stream().limit(AUDIT_EXPORT_MAX_ROWS).toList());

            return new PreparedAuditCsvExport(
                    truncated,
                    outputStream -> streamAuditRows(exportRows, outputStream));
        } catch (DataAccessException exception) {
            throw new AuditPersistenceException("Audit log export failed", exception);
        }
    }

    @Transactional(readOnly = true)
    public SearchHistoryDetailItem getHistoryDetail(java.util.UUID queryId) {
        boolean isAdmin = rbacPermissionService.hasAdmin(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication());
        
        java.util.Optional<SearchQueryLog> logOptional = isAdmin 
                ? repository.findById(queryId) 
                : repository.findByIdAndUserIdentity(queryId, currentUserService.currentIdentity());
                
        return logOptional
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

    private void streamAuditRows(List<SearchQueryLog> rows, java.io.OutputStream outputStream) throws IOException {
        var writer = new AuditCsvWriter(outputStream);
        writer.writeHeader();
        for (var log : rows) {
            writeAuditRow(writer, log);
        }
        writer.flush();
    }

    private void writeAuditRow(AuditCsvWriter writer, SearchQueryLog log) {
        try {
            writer.writeLog(log);
        } catch (IOException exception) {
            throw new AuditPersistenceException("Audit log export stream failed", exception);
        }
    }

    private AuditLogFilters emptyFilters() {
        return new AuditLogFilters(null, null, null, null, null, null, null, null);
    }

    private Sort historySort(AuditLogFilters filters) {
        if (Boolean.TRUE.equals(filters.pinned())) {
            return PINNED_SORT;
        }
        return auditSort(filters);
    }

    private Sort auditSort(AuditLogFilters filters) {
        var sort = filters == null ? null : filters.sort();
        if ("created_at,asc".equalsIgnoreCase(sort)) {
            return Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"));
        }
        return AUDIT_SORT;
    }

    private Specification<SearchQueryLog> historySpecification(String userIdentity, AuditLogFilters filters) {
        return auditSpecification(filters).and((root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("userIdentity"), userIdentity));
    }

    private Specification<SearchQueryLog> auditSpecification(AuditLogFilters filters) {
        return (root, query, criteriaBuilder) -> {
            var predicates = new ArrayList<Predicate>();

            if (filters.pinned() != null) {
                predicates.add(criteriaBuilder.equal(root.get("pinned"), filters.pinned()));
            }
            if (filters.status() != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), filters.status()));
            }
            if (filters.mode() != null) {
                predicates.add(criteriaBuilder.equal(root.get("mode"), filters.mode()));
            }
            if (filters.from() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), filters.from()));
            }
            if (filters.to() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), filters.to()));
            }
            if (hasText(filters.identity())) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("userIdentity")),
                        contains(filters.identity())));
            }
            if (hasText(filters.question())) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("question")),
                        contains(filters.question())));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String contains(String value) {
        return "%" + value.strip().toLowerCase(Locale.ROOT) + "%";
    }

}
