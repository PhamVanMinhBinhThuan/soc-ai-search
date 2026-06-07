package com.soc.ai.search.search.execution;

import java.util.List;

public record SearchErrorResponse(String message, List<String> errors) {
}
