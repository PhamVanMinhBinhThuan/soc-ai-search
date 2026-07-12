package com.soc.ai.search.audit.application;


import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.soc.ai.search.audit.domain.AuditStatus;
import com.soc.ai.search.audit.infrastructure.jpa.SearchQueryLog;
import com.soc.ai.search.audit.infrastructure.jpa.SearchQueryLogRepository;
class AuditPersistenceServiceTest {

    @Test
    void saveUsesRequiresNewOnIndependentBean() throws Exception {
        Method method = AuditPersistenceService.class.getMethod("save", SearchQueryLog.class);
        var transactional = method.getAnnotation(Transactional.class);

        assertThat(transactional).isNotNull();
        assertThat(transactional.propagation()).isEqualTo(Propagation.REQUIRES_NEW);
    }

    @Test
    void wrapsDatabaseFailure() {
        var repository = org.mockito.Mockito.mock(SearchQueryLogRepository.class);
        var service = new AuditPersistenceService(repository);
        var log = new SearchQueryLog(
                UUID.randomUUID(),
                "demo-analyst",
                "question",
                null,
                null,
                null,
                null,
                1L,
                AuditStatus.FAILED,
                "failed",
                null,
                Instant.now());
        when(repository.saveAndFlush(log))
                .thenThrow(new DataAccessResourceFailureException("database unavailable"));

        assertThatThrownBy(() -> service.save(log))
                .isInstanceOf(AuditPersistenceException.class)
                .hasMessage("Audit persistence failed");
    }
}
