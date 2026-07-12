package com.soc.ai.search.config.elasticsearch;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.json.jackson.JacksonJsonpMapper;
import co.elastic.clients.transport.ElasticsearchTransport;
import co.elastic.clients.transport.rest_client.RestClientTransport;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.http.Header;
import org.apache.http.HttpHost;
import org.apache.http.message.BasicHeader;
import org.elasticsearch.client.RestClient;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(ElasticsearchProperties.class)
public class ElasticsearchConfig {

    @Bean(destroyMethod = "close")
    RestClient elasticsearchRestClient(ElasticsearchProperties properties) {
        var builder = RestClient.builder(HttpHost.create(properties.url()));

        if (properties.hasCredentials()) {
            builder.setDefaultHeaders(new Header[] { basicAuthHeader(properties.username(), properties.password()) });
        }

        return builder.build();
    }

    @Bean
    ElasticsearchTransport elasticsearchTransport(RestClient restClient, ObjectMapper objectMapper) {
        return new RestClientTransport(restClient, new JacksonJsonpMapper(objectMapper));
    }

    @Bean
    ElasticsearchClient elasticsearchClient(ElasticsearchTransport transport) {
        return new ElasticsearchClient(transport);
    }

    private Header basicAuthHeader(String username, String password) {
        var credentials = username + ":" + password;
        var encodedCredentials = Base64.getEncoder()
                .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
        return new BasicHeader("Authorization", "Basic " + encodedCredentials);
    }
}
