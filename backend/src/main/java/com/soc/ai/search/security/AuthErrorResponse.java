package com.soc.ai.search.security;

import java.util.List;

public record AuthErrorResponse(String message, List<String> errors) {
}
