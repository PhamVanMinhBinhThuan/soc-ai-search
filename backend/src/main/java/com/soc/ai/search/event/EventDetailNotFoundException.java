package com.soc.ai.search.event;

public class EventDetailNotFoundException extends RuntimeException {

    public EventDetailNotFoundException(String eventId) {
        super("Event not found: " + eventId);
    }
}
