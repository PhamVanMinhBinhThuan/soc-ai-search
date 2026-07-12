package com.soc.ai.search.search.domain.plan;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonMappingException;

public class FlexibleStringListDeserializer extends JsonDeserializer<List<String>> {

    @Override
    public List<String> deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        var token = parser.currentToken();
        if (token == JsonToken.VALUE_STRING) {
            return List.of(parser.getValueAsString());
        }
        if (token == JsonToken.VALUE_NULL) {
            return null;
        }
        if (token == JsonToken.START_ARRAY) {
            return readStringArray(parser);
        }

        throw JsonMappingException.from(parser, "must be a string or an array of strings");
    }

    private List<String> readStringArray(JsonParser parser) throws IOException {
        var values = new ArrayList<String>();
        while (parser.nextToken() != JsonToken.END_ARRAY) {
            if (parser.currentToken() != JsonToken.VALUE_STRING) {
                throw JsonMappingException.from(parser, "must contain only string values");
            }
            values.add(parser.getValueAsString());
        }
        return values;
    }
}
