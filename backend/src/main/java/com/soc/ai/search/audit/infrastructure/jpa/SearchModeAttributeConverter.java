package com.soc.ai.search.audit.infrastructure.jpa;


import com.soc.ai.search.search.domain.plan.SearchMode;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class SearchModeAttributeConverter implements AttributeConverter<SearchMode, String> {

    @Override
    public String convertToDatabaseColumn(SearchMode attribute) {
        return attribute == null ? null : attribute.jsonValue();
    }

    @Override
    public SearchMode convertToEntityAttribute(String dbData) {
        return dbData == null ? null : SearchMode.fromJson(dbData);
    }
}
