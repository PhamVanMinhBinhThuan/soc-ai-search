package com.soc.ai.search.audit;

import java.util.UUID;

@FunctionalInterface
public interface QueryIdGenerator {

    UUID generate();
}
