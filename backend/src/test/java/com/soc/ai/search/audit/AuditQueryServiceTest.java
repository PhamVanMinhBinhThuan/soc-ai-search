package com.soc.ai.search.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.security.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

class AuditQueryServiceTest {

    private final SearchQueryLogRepository repository =
            org.mockito.Mockito.mock(SearchQueryLogRepository.class);
    private final CurrentUserService currentUserService =
            org.mockito.Mockito.mock(CurrentUserService.class);
    private final com.soc.ai.search.security.RbacPermissionService rbacPermissionService =
            org.mockito.Mockito.mock(com.soc.ai.search.security.RbacPermissionService.class);
    private final AuditQueryService service =
            new AuditQueryService(repository, currentUserService, rbacPermissionService);

    @Test
    void historyUsesStableSortAndMapsQueryId() {
        when(currentUserService.currentIdentity()).thenReturn("demo-analyst");
        var log = queryLog(UUID.fromString("11111111-1111-1111-1111-111111111111"));
        when(repository.findAll(
                org.mockito.ArgumentMatchers.any(org.springframework.data.jpa.domain.Specification.class),
                org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(log)));

        var response = service.history(0, 20, null, null, null);

        assertThat(response.items()).singleElement()
                .extracting(SearchHistoryItem::queryId)
                .isEqualTo(log.getId());
        var pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findAll(
                org.mockito.ArgumentMatchers.any(org.springframework.data.jpa.domain.Specification.class),
                pageable.capture());
        assertThat(pageable.getValue().getSort().toString())
                .isEqualTo("createdAt: DESC,id: DESC");
    }

    @Test
    void emptyHistoryHasZeroTotalPages() {
        when(currentUserService.currentIdentity()).thenReturn("demo-analyst");
        when(repository.findAll(
                org.mockito.ArgumentMatchers.any(org.springframework.data.jpa.domain.Specification.class),
                org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(new PageImpl<>(
                        List.of(),
                        org.springframework.data.domain.PageRequest.of(0, 20),
                        0));

        var response = service.history(0, 20, null, null, null);

        assertThat(response.items()).isEmpty();
        assertThat(response.total()).isZero();
        assertThat(response.totalPages()).isZero();
    }

    @Test
    void auditLogsUseSameStableSort() {
        when(repository.findAll(
                org.mockito.ArgumentMatchers.any(org.springframework.data.jpa.domain.Specification.class),
                org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(queryLog(UUID.randomUUID()))));

        service.auditLogs(0, 50);

        var pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findAll(
                org.mockito.ArgumentMatchers.any(org.springframework.data.jpa.domain.Specification.class),
                pageable.capture());
        assertThat(pageable.getValue().getSort().toString())
                .isEqualTo("createdAt: DESC,id: DESC");
    }

    @Test
    void rejectsInvalidPagination() {
        assertThatThrownBy(() -> service.history(-1, 10, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.history(0, 0, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.auditLogs(0, 101))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private SearchQueryLog queryLog(UUID id) {
        return new SearchQueryLog(
                id,
                "demo-analyst",
                "failed login china",
                null,
                null,
                SearchMode.SEARCH,
                3L,
                20L,
                AuditStatus.SUCCESS,
                null,
                null,
                Instant.parse("2026-06-14T00:00:00Z"));
    }
}
