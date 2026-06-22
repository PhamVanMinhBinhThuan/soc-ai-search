package com.soc.ai.search.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import com.soc.ai.search.search.plan.SearchMode;
import com.soc.ai.search.security.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import java.util.List;

class AuditQueryServicePinTest {

    private SearchQueryLogRepository repository;
    private CurrentUserService currentUserService;
    private com.soc.ai.search.security.RbacPermissionService rbacPermissionService;
    private AuditQueryService service;

    private UUID queryId;
    private SearchQueryLog log;

    @BeforeEach
    void setUp() {
        repository = mock(SearchQueryLogRepository.class);
        currentUserService = mock(CurrentUserService.class);
        rbacPermissionService = mock(com.soc.ai.search.security.RbacPermissionService.class);
        service = new AuditQueryService(repository, currentUserService, rbacPermissionService);

        queryId = UUID.randomUUID();
        log = new SearchQueryLog(
                queryId,
                "analyst.demo",
                "question",
                null,
                null,
                SearchMode.SEARCH,
                10L,
                100L,
                AuditStatus.SUCCESS,
                null,
                null,
                Instant.now());
    }

    @Test
    void pinQuerySuccess() {
        when(currentUserService.currentIdentity()).thenReturn("analyst.demo");
        when(repository.findByIdAndUserIdentity(queryId, "analyst.demo")).thenReturn(Optional.of(log));
        when(repository.save(any(SearchQueryLog.class))).thenReturn(log);

        var result = service.pinQuery(queryId, true);

        assertThat(result.pinned()).isTrue();
        assertThat(log.isPinned()).isTrue();
        assertThat(log.getPinnedAt()).isNotNull();
        verify(repository).save(log);
    }

    @Test
    void unpinQuerySuccess() {
        log.setPinned(true);

        when(currentUserService.currentIdentity()).thenReturn("analyst.demo");
        when(repository.findByIdAndUserIdentity(queryId, "analyst.demo")).thenReturn(Optional.of(log));
        when(repository.save(any(SearchQueryLog.class))).thenReturn(log);

        var result = service.pinQuery(queryId, false);

        assertThat(result.pinned()).isFalse();
        assertThat(log.isPinned()).isFalse();
        assertThat(log.getPinnedAt()).isNull();
    }

    @Test
    void cannotPinOtherUserQuery() {
        when(currentUserService.currentIdentity()).thenReturn("other.user");
        when(repository.findByIdAndUserIdentity(queryId, "other.user")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.pinQuery(queryId, true))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    @Test
    void getHistoryDetailSuccess() {
        when(currentUserService.currentIdentity()).thenReturn("analyst.demo");
        when(rbacPermissionService.hasAdmin(any())).thenReturn(false);
        when(repository.findByIdAndUserIdentity(queryId, "analyst.demo")).thenReturn(Optional.of(log));

        var result = service.getHistoryDetail(queryId);

        assertThat(result.queryId()).isEqualTo(queryId);
        assertThat(result.question()).isEqualTo("question");
    }

    @Test
    void cannotGetHistoryDetailOfOtherUser() {
        when(currentUserService.currentIdentity()).thenReturn("other.user");
        when(rbacPermissionService.hasAdmin(any())).thenReturn(false);
        when(repository.findByIdAndUserIdentity(queryId, "other.user")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getHistoryDetail(queryId))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    @Test
    void historyFilterPassesToRepository() {
        when(currentUserService.currentIdentity()).thenReturn("analyst.demo");
        Page<SearchQueryLog> page = new PageImpl<>(List.of(log), PageRequest.of(0, 10), 1);
        when(repository.findWithFilters(eq("analyst.demo"), eq(true), eq(AuditStatus.SUCCESS), eq(SearchMode.SEARCH), any(PageRequest.class)))
                .thenReturn(page);

        var response = service.history(0, 10, true, AuditStatus.SUCCESS, SearchMode.SEARCH);

        assertThat(response.items()).hasSize(1);
        assertThat(response.total()).isEqualTo(1);
        verify(repository).findWithFilters(eq("analyst.demo"), eq(true), eq(AuditStatus.SUCCESS), eq(SearchMode.SEARCH), any(PageRequest.class));
    }
}
