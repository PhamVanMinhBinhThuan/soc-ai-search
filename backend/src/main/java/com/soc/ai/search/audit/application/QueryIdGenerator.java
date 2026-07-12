package com.soc.ai.search.audit.application;


import java.util.UUID;

@FunctionalInterface
public interface QueryIdGenerator {

    UUID generate();
}
