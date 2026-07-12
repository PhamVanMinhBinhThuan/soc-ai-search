package com.soc.ai.search.audit.infrastructure.jpa;


import static org.assertj.core.api.Assertions.assertThat;

import com.soc.ai.search.search.domain.plan.SearchMode;
import org.junit.jupiter.api.Test;

class SearchModeAttributeConverterTest {

    private final SearchModeAttributeConverter converter = new SearchModeAttributeConverter();

    @Test
    void storesSearchModesUsingLowercaseApiValues() {
        assertThat(converter.convertToDatabaseColumn(SearchMode.SEARCH)).isEqualTo("search");
        assertThat(converter.convertToDatabaseColumn(SearchMode.AGGREGATION)).isEqualTo("aggregation");
        assertThat(converter.convertToEntityAttribute("search")).isEqualTo(SearchMode.SEARCH);
        assertThat(converter.convertToEntityAttribute("aggregation")).isEqualTo(SearchMode.AGGREGATION);
    }
}
