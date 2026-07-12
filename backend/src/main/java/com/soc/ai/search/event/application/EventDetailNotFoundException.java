package com.soc.ai.search.event.application;

public class EventDetailNotFoundException extends RuntimeException {

    public EventDetailNotFoundException(String eventId) {
        super("Event not found: " + eventId);
    }
}
