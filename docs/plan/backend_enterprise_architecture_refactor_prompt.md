# Prompt: Refactor Backend Theo Kiến Trúc Enterprise Modular Spring Boot

## 1. Vai Trò

Bạn là Senior Backend Engineer có kinh nghiệm refactor codebase Spring Boot/Java 21 theo hướng enterprise, modular monolith, maintainable architecture và production-readiness.

Hãy refactor backend của dự án SOC AI Search để codebase có ranh giới module rõ hơn, dễ review hơn, dễ test hơn và dễ mở rộng sau giai đoạn MVP. Mục tiêu không phải viết lại business logic, không phải đổi API, mà là sắp xếp và chuẩn hóa kiến trúc backend theo hướng enterprise.

Dự án đã thực hiện MVP xong, nên có thể refactor mạnh tay hơn về cấu trúc source code. Tuy nhiên vẫn phải giữ behavior, endpoint, security rule và database schema hiện tại, trừ khi có lý do kỹ thuật thật rõ ràng.

## 2. Bối Cảnh Dự Án

Backend hiện tại:

- Java 21
- Spring Boot 3.5.x
- Maven
- Spring Web MVC
- Spring Security OAuth2 Resource Server
- Keycloak/OIDC
- Spring Validation
- Spring Data JPA
- PostgreSQL + Flyway
- Elasticsearch Java Client
- Springdoc OpenAPI/Swagger
- JaCoCo coverage

Ứng dụng là backend cho SOC AI Search, gồm các nhóm nghiệp vụ:

- Natural-language search
- SearchPlan contract
- SearchPlan parser/validator/compiler
- Elasticsearch execution
- AI Summary
- AI Follow-up Suggestions
- Query Refinement
- Event ingest/detail
- CSV Export
- Query history / investigations
- System audit logs
- RBAC / Keycloak security
- OpenAPI docs

Package hiện tại đang có các nhóm:

```text
com.soc.ai.search
  api
  audit
  config
  csv
  event
  health
  llm
  search
  security
  suggestions
  summary
```

Đây là nền tảng tốt, nhưng để enterprise hơn cần tiếp tục chuẩn hóa:

- Controller/API DTO không nên lẫn với domain/application logic.
- Use case/service layer nên rõ ràng hơn.
- Infrastructure adapter cho Elasticsearch, PostgreSQL, LLM, CSV nên tách bạch hơn.
- Error handling nên thống nhất.
- Config properties nên typed và gom rõ theo module.
- Logging/observability cần có correlation id/query id/user identity.
- Tests nên mirror package và giải thích được.
- Backend README nên mô tả kiến trúc mới.

## 3. Yêu Cầu Quan Trọng Nhất: Chia Theo Module Nghiệp Vụ

Backend cần được refactor theo hướng **modular monolith**, nghĩa là vẫn là một Spring Boot application duy nhất, nhưng source code được chia theo các module nghiệp vụ rõ ràng.

Không nên tổ chức toàn bộ backend theo kiểu phẳng:

```text
controllers/
services/
repositories/
validators/
```

Cách này nhìn đơn giản lúc đầu, nhưng khi dự án lớn sẽ biến thành nhiều "rổ file" khó ownership. Thay vào đó, mỗi domain nên sở hữu controller, use case, domain model, adapter và test của chính nó.

Ví dụ mong muốn:

```text
search/
  api/
  application/
  domain/
  infrastructure/

audit/
  api/
  application/
  domain/
  infrastructure/

event/
  api/
  application/
  domain/
  infrastructure/
```

Lý do:

- Developer làm việc theo tính năng, không phải theo loại file.
- Thay đổi ở Search không bị lẫn với Audit hoặc Event.
- Code review dễ hơn vì diff nằm trong module liên quan.
- Dễ tách module, lazy dependency, hoặc chia ownership về sau.
- Business rule nằm gần domain mà nó phục vụ.

### 3.1 Checklist Những Điểm Bắt Buộc Phải Có Trong Refactor

Khi thực hiện refactor, bắt buộc phải kiểm tra các điểm sau:

1. **Tách controller / service / repository / validator rõ ràng**

   Không gom toàn bộ controller, service, repository, validator vào các package root dùng chung cho cả hệ thống. Trong Java/Spring Boot enterprise, các layer này nên nằm bên trong từng module nghiệp vụ.

   Ví dụ đúng hướng:

   ```text
   search/
     api/              Controller + request/response DTO
     application/      Use case / service điều phối
     domain/           SearchPlan, validator, compiler, business rule
     infrastructure/   Elasticsearch adapter, repository/mapper nếu có
   ```

2. **Có `config`, `security`, `common` riêng**

   Các phần cross-cutting không thuộc riêng một nghiệp vụ nên nằm ngoài domain module:

   ```text
   config/     OpenAPI, Elasticsearch config, Jackson/CORS nếu có
   security/   Spring Security, Keycloak JWT, RBAC, current user
   common/     Error response, exception handler, logging, validation helper
   ```

   Không để OpenAPI config, security config, exception handler hoặc error response nằm lẫn trong `search`, `event`, `audit`.

3. **Module `search` là phần đáng refactor kỹ nhất**

   Cần gom các phần hiện đang rải trong search về ranh giới rõ hơn:

   ```text
   search/nl          -> search/api + search/application
   search/execution   -> search/api + search/infrastructure/elasticsearch
   search/compiler    -> search/domain/compiler
   search/validation  -> search/domain/validation
   search/plan        -> search/domain/plan
   search/refine      -> search/refinement hoặc search/application/refinement
   ```

   Mục tiêu là khi đọc package `search`, người khác thấy ngay toàn bộ logic Natural Language Search, SearchPlan, validation, compiler và Elasticsearch execution nằm ở đâu.

4. **Tách DTO/API request-response khỏi domain model**

   Request/response dùng cho REST API nên nằm ở `api` hoặc `api/dto`. Domain model như `SearchPlan`, `SearchFilters`, `AggregationPlan`, validation rule và compiler rule nên nằm trong `domain`.

   Không để API shape điều khiển toàn bộ domain nếu có thể tách hợp lý.

5. **Đưa shared exception/error response vào `common/error`**

   Các lỗi API nên dùng format thống nhất. Những phần như:

   ```text
   ApiErrorResponse
   ErrorCode
   GlobalExceptionHandler
   ```

   nên nằm trong `common/error`, thay vì mỗi module tự trả lỗi theo một kiểu khác nhau.

6. **Đưa CSV export thành module riêng `export`**

   CSV export không nên chỉ là một package technical rời rạc nếu nó đã có nhiều rule riêng như:

   - replay SearchPlan bằng `query_id`
   - stream CSV
   - giới hạn 10000 dòng
   - `X-Export-Truncated`
   - chống CSV formula injection

   Nên có module:

   ```text
   export/
     api/
     application/
     domain/
     infrastructure/
   ```

7. **Validation layer phải rõ vì đây là core guardrail**

   `SearchPlanValidator`, parser và compiler là lõi an toàn của hệ thống, nên phải tổ chức thật rõ:

   ```text
   search/domain/parser/
   search/domain/validation/
   search/domain/compiler/
   ```

   Parse trả lời câu hỏi: output có đúng JSON/schema không?  
   Validate trả lời câu hỏi: SearchPlan có hợp lệ và an toàn về nghiệp vụ không?  
   Compile trả lời câu hỏi: SearchPlan hợp lệ được chuyển thành Elasticsearch DSL như thế nào?

8. **Tests phải đi theo module**

   Test package nên mirror main package để dễ tìm:

   ```text
   src/main/java/com/soc/ai/search/search/domain/compiler
   src/test/java/com/soc/ai/search/search/domain/compiler
   ```

   Nếu refactor package, cần update test tương ứng và không được xóa test cũ để né lỗi.

9. **Có `backend/README.md` mô tả package architecture**

   README backend cần giải thích ngắn gọn:

   - backend đang chia module thế nào
   - request flow chính
   - SearchPlan guardrail
   - security/RBAC
   - CSV export
   - test/coverage
   - config/env quan trọng

## 4. Mục Tiêu Chính

Sau refactor, backend nên tiến gần đến cấu trúc modular monolith:

```text
backend/src/main/java/com/soc/ai/search/
  SocAiSearchApplication.java

  common/
    error/
    logging/
    validation/
    web/

  config/
    openapi/
    elasticsearch/

  security/
    api/
    application/
    domain/
    infrastructure/

  event/
    api/
    application/
    domain/
    infrastructure/

  search/
    api/
    application/
    domain/
      plan/
      validation/
      compiler/
    infrastructure/
      elasticsearch/
    refinement/

  summary/
    application/
    domain/
    infrastructure/

  suggestions/
    api/
    application/
    domain/

  investigation/
    api/
    application/
    domain/
    infrastructure/

  audit/
    api/
    application/
    domain/
    infrastructure/

  export/
    api/
    application/
    domain/
    infrastructure/

  llm/
    application/
    domain/
    infrastructure/
      gemini/
      anthropic/
      mock/
```

Không bắt buộc phải dùng đúng 100% cấu trúc trên nếu codebase hiện tại có lý do để giữ lại. Nhưng hướng đi phải rõ:

```text
api             Controller + request/response DTO
application     Use case / orchestration service
domain          Model + business rule + contract
infrastructure  External adapter: DB, Elasticsearch, LLM, CSV, HTTP client
common          Shared cross-cutting concerns
```

## 5. Nguyên Tắc Bắt Buộc

1. Không đổi endpoint public hiện tại.
2. Không đổi API request/response contract nếu không có lý do bắt buộc.
3. Không đổi RBAC behavior.
4. Không đổi SearchPlan behavior.
5. Không đổi Elasticsearch DSL output nếu test hiện tại đang cover.
6. Không đổi database migration/schema nếu không cần.
7. Không xóa test hiện có.
8. Không giảm JaCoCo coverage.
9. Không tạo circular dependency giữa các module.
10. Controller không được chứa business logic phức tạp.
11. Infrastructure adapter không được leak chi tiết Elasticsearch/JPA/LLM lên API layer.
12. Sau mỗi phase lớn phải chạy test.

## 6. Kiến Trúc Mục Tiêu Theo Layer

### 6.1 API Layer

API layer gồm:

- `*Controller`
- request DTO
- response DTO
- OpenAPI annotation nếu cần

Controller chỉ nên làm các việc:

1. Nhận request.
2. Validate request cơ bản bằng annotation.
3. Gọi application use case.
4. Trả response.

Không nên để controller:

- Tự compile SearchPlan.
- Tự truy vấn Elasticsearch/JPA.
- Tự build prompt LLM.
- Tự ghi audit/history.
- Tự format CSV.

Ví dụ mục tiêu:

```java
@RestController
class NaturalLanguageSearchController {
    private final NaturalLanguageSearchUseCase useCase;

    @PostMapping("/api/v1/search")
    SearchResponse search(@Valid @RequestBody SearchRequest request) {
        return useCase.execute(request);
    }
}
```

### 6.2 Application Layer

Application layer gồm use case/orchestration:

- `NaturalLanguageSearchUseCase`
- `SearchPlanExecutionUseCase`
- `QueryRefinementUseCase`
- `CsvExportUseCase`
- `AuditLogQueryUseCase`
- `EventIngestUseCase`

Layer này điều phối flow nghiệp vụ:

- Gọi LLM.
- Parse/validate SearchPlan.
- Compile DSL.
- Execute Elasticsearch.
- Build summary payload.
- Persist history/audit.
- Enforce RBAC/user scope.

Application layer không nên chứa chi tiết HTTP client của Gemini/Anthropic hoặc chi tiết Elasticsearch request body quá sâu. Nhưng nó có thể gọi interface/port.

### 6.3 Domain Layer

Domain layer gồm:

- SearchPlan contract.
- Filter/aggregation/sort model.
- Validation rule.
- Compiler rule nếu compiler được xem là domain guardrail.
- Error code nghiệp vụ.
- Enum/domain value object.

Ví dụ:

```text
search/domain/plan/SearchPlan.java
search/domain/plan/SearchFilters.java
search/domain/validation/SearchPlanValidator.java
search/domain/compiler/SearchPlanCompiler.java
```

### 6.4 Infrastructure Layer

Infrastructure layer gồm external adapters:

- Elasticsearch client/executor/mapper.
- JPA repository/entity adapter.
- LLM Gemini/Anthropic client.
- CSV streaming writer.
- OpenAPI/Security/Jackson config nếu thuần technical.

Ví dụ:

```text
search/infrastructure/elasticsearch/SearchPlanExecutor.java
search/infrastructure/elasticsearch/ElasticsearchSearchResponseMapper.java
llm/infrastructure/gemini/GeminiLlmClient.java
llm/infrastructure/anthropic/AnthropicLlmClient.java
audit/infrastructure/jpa/SearchQueryLogRepository.java
```

## 7. Refactor Phase Đề Xuất

### Phase 0: Baseline

Trước khi sửa, chạy:

```bash
cd backend
./mvnw test
```

Nếu trên Windows:

```powershell
cd backend
.\mvnw.cmd test
```

Ghi nhận:

- test pass/fail ban đầu
- coverage hiện tại
- endpoint/behavior nào đang nhạy cảm

Không bắt đầu move package nếu baseline đang fail mà chưa ghi rõ lý do.

### Phase 1: Common Error Handling

Mục tiêu: chuẩn hóa lỗi API.

Tạo/cập nhật:

```text
common/error/
  ApiErrorResponse.java
  ErrorCode.java
  GlobalExceptionHandler.java
```

Yêu cầu:

- Gom `GlobalApiExceptionHandler` hiện tại vào `common/error` nếu hợp lý.
- Security-specific exception handler có thể giữ trong `security`, nhưng response format nên đồng nhất.
- Lỗi trả về nên có dạng ổn định:

```json
{
  "code": "SEARCH_PLAN_VALIDATION_FAILED",
  "message": "Invalid SearchPlan",
  "details": ["aggregation.field is not allowed"],
  "timestamp": "2026-07-12T10:00:00Z",
  "path": "/api/v1/search"
}
```

Cần map rõ các nhóm lỗi:

- SearchPlan validation failed
- LLM provider unavailable
- Elasticsearch execution failed
- CSV export not found/conflict
- Event detail not found
- RBAC/access denied
- Invalid request body

Không làm frontend bị vỡ nếu frontend đang depend message hiện tại. Nếu cần, giữ `message` cũ và thêm `code/details`.

Test cần cập nhật:

- controller error response
- validation error
- security error nếu có

### Phase 2: Typed Configuration Properties

Mục tiêu: config không nằm rải rác.

Kiểm tra và gom lại các properties:

```text
config/
  elasticsearch/ElasticsearchProperties.java
llm/
  application/LlmProperties.java
export/
  application/ExportProperties.java
audit/
  application/AuditProperties.java
security/
  application/AuthProperties.java
```

Hoặc nếu giữ package hiện tại thì tối thiểu phải:

- Dùng `@ConfigurationProperties`.
- Đặt prefix rõ ràng, ví dụ:

```properties
soc.llm.provider=
soc.llm.model=
soc.llm.timeout=
soc.export.max-rows=10000
soc.audit.max-export-rows=10000
soc.elasticsearch.index=
```

Yêu cầu:

- Không đọc env/config trực tiếp trong service.
- Config default rõ ràng.
- Test properties binding nếu cần.
- README backend phải liệt kê env/config quan trọng.

### Phase 3: LLM Provider Port/Adapter

Mục tiêu: Gemini/Anthropic/Mock là adapter, business layer chỉ biết interface.

Đề xuất:

```text
llm/
  application/
    LlmClient.java
    LlmRequest.java
    LlmResponse.java
  infrastructure/
    gemini/GeminiLlmClient.java
    anthropic/AnthropicLlmClient.java
    mock/MockLlmClient.java
```

Yêu cầu:

- SearchPlan generation, Summary, Refine, Follow-up Suggestions không phụ thuộc trực tiếp vào Gemini/Anthropic class.
- Provider selection dựa trên config.
- Error mapping thống nhất:
  - rate limit
  - timeout
  - provider unavailable
  - invalid provider response

Không đổi prompt behavior. Chỉ di chuyển/đổi ranh giới code.

### Phase 4: Search Module Cleanup

Đây là phase quan trọng nhất.

Mục tiêu: `search` module rõ 4 nhóm:

```text
search/
  api/
    NaturalLanguageSearchController.java
    SearchController.java
    dto/
  application/
    NaturalLanguageSearchUseCase.java
    SearchPlanExecutionUseCase.java
  domain/
    plan/
    parser/
    validation/
    compiler/
  infrastructure/
    elasticsearch/
```

Mapping gợi ý từ code hiện tại:

```text
search/nl/*Controller, *Request, *Response        -> search/api
search/nl/*Service                                -> search/application
search/execution/SearchController                 -> search/api
search/execution/SearchPlanExecutor               -> search/infrastructure/elasticsearch
search/execution/*Mapper                          -> search/infrastructure/elasticsearch
search/compiler/*                                 -> search/domain/compiler
search/validation/*                               -> search/domain/validation
search/plan/*                                     -> search/domain/plan
```

Yêu cầu:

- Nếu `NaturalLanguageSearchService` đang làm quá nhiều việc, đổi thành use case/orchestrator rõ ràng.
- Tạo class/record nội bộ nếu cần:

```text
SearchExecutionCommand
SearchExecutionResult
SearchAuditContext
```

- Controller không gọi trực tiếp compiler/executor/parser nếu có use case phù hợp.
- SearchPlan parser/validator/compiler phải tiếp tục test pass.

Quan trọng:

- Không đổi SearchPlan JSON contract.
- Không đổi DSL output.
- Không đổi summary/follow-up/refine behavior.

### Phase 5: Query Refinement, Summary, Suggestions Boundaries

Mục tiêu: AI-related features có ranh giới rõ.

#### Query Refinement

Đề xuất:

```text
search/refinement/
  api/
  application/
  domain/
```

Hoặc giữ trong `search/refine` nhưng tách:

- Controller
- Request/Response DTO
- Service/use case
- Prompt builder/parser

#### Summary

Đề xuất:

```text
summary/
  application/
    SummaryService.java
    SummaryPayloadBuilder.java
  domain/
    SummaryPayload.java
    SummaryBucket.java
    SummaryTextValidator.java
  infrastructure/
    ElasticsearchSummaryQueryService.java
```

Yêu cầu:

- Summary prompt builder không tự truy vấn Elasticsearch.
- Payload builder rõ trách nhiệm: lấy top user/ip/severity/buckets/min/max/sum.
- Deterministic fallback nằm rõ trong application/domain.

#### Follow-up Suggestions

Đề xuất:

```text
suggestions/
  api/
  application/
  domain/
```

Yêu cầu:

- Prompt builder/parser tách rõ.
- Response validation rõ.
- UI fallback behavior không đổi.

### Phase 6: Audit, Investigation, Export Modules

Hiện tại `audit` đang bao gồm cả history, audit, CSV export support. Cần làm rõ hơn.

Đề xuất:

```text
investigation/
  api/
  application/
  domain/
  infrastructure/

audit/
  api/
  application/
  domain/
  infrastructure/

export/
  api/
  application/
  domain/
  infrastructure/
```

Mapping gợi ý:

- Query history của user -> `investigation`
- System audit logs -> `audit`
- CSV streaming/export -> `export`
- JPA entity/repository có thể nằm trong infrastructure hoặc audit domain tùy mức độ.

Yêu cầu:

- Không đổi table/schema nếu không bắt buộc.
- Không đổi URL hiện tại:
  - `/api/v1/search/history`
  - `/api/v1/audit-logs`
  - `/api/v1/search/{queryId}/export.csv`
- Export search và export audit cùng dùng limit 10000 dòng.
- `X-Export-Truncated` header vẫn giữ.
- CSV formula injection defense vẫn giữ.

### Phase 7: Event Module

Mục tiêu: event ingest/detail rõ ranh giới.

Đề xuất:

```text
event/
  api/
    EventController.java
    dto/
  application/
    EventIngestUseCase.java
    EventDetailUseCase.java
  domain/
    SocEvent.java
  infrastructure/
    elasticsearch/EventElasticsearchRepository.java
```

Yêu cầu:

- Ingest bulk/single behavior không đổi.
- Event detail RBAC/raw log behavior không đổi.
- `event_id` support không bị mất.

### Phase 8: Observability, Logging, Correlation ID

Mục tiêu: production/SOC-friendly logging.

Thêm/cập nhật:

```text
common/logging/
  CorrelationIdFilter.java
  RequestLoggingFilter.java
  LogFields.java
```

Yêu cầu:

- Mỗi request có `correlation_id` hoặc `request_id`.
- Nếu client gửi `X-Request-Id` thì dùng lại, nếu không thì tạo UUID.
- Response trả lại header `X-Request-Id`.
- Log nên có:
  - request_id
  - query_id nếu có
  - user identity từ JWT subject/preferred_username
  - role
  - endpoint
  - status
  - latency_ms
- Không log access token.
- Không log raw sensitive data.
- Không log full raw event nếu có raw log.

Ví dụ log mong muốn:

```text
request_id=... query_id=... user=demo1 mode=search status=success latency_ms=820
```

### Phase 9: Package-Level Documentation Và Backend README

Tạo/cập nhật:

```text
backend/README.md
```

README nên ngắn gọn, trọng tâm:

1. Backend overview.
2. Architecture/module map.
3. Request flow:
   - natural language question
   - SearchPlan
   - parse/validate/compile
   - Elasticsearch
   - audit/history
4. Security model:
   - Keycloak JWT
   - Spring Security
   - RBAC roles
5. Local run.
6. Test/coverage.
7. Important environment variables.
8. CSV export design.

Có thể thêm `package-info.java` nếu thấy cần:

```text
search/package-info.java
audit/package-info.java
export/package-info.java
```

Nhưng không bắt buộc nếu README đã đủ rõ.

### Phase 10: Test Organization And Coverage

Mục tiêu: test mirror package và giải thích được.

Yêu cầu:

- Test package nên mirror main package.
- Không xóa test cũ.
- Update import sau khi move package.
- Thêm test cho code mới nếu có:
  - error handler
  - properties binding
  - correlation id filter
  - use case orchestration nếu tách mới

Chạy:

```bash
cd backend
./mvnw test
```

Sau refactor, JaCoCo threshold không được fail.

## 8. Import/Dependency Boundary Rules

Áp dụng rule mềm:

```text
api             -> application, domain
application     -> domain, infrastructure ports/interfaces
domain          -> no Spring Web, no Elasticsearch client, no JPA repository
infrastructure  -> domain/application ports, external libraries
common          -> no domain-specific business dependency
```

Nếu chưa thể đạt clean architecture 100%, tối thiểu phải:

- Domain không import controller.
- Domain không import DTO web.
- Controller không import Elasticsearch/JPA client trực tiếp.
- Shared/common không phụ thuộc ngược vào feature/module.

## 9. Những Điều Không Làm

Không làm các việc sau trong refactor này:

- Không đổi API path.
- Không đổi role/permission.
- Không đổi SearchPlan JSON contract.
- Không đổi DSL output mong đợi.
- Không đổi database schema/migration nếu không cần.
- Không đổi data seed.
- Không đổi frontend.
- Không thêm framework mới nếu không cần.
- Không biến modular monolith thành microservices.
- Không đổi business logic chỉ để làm package đẹp hơn.

## 10. Tiêu Chí Hoàn Thành

Refactor chỉ được xem là hoàn thành khi:

1. Backend compile pass.
2. Full backend tests pass.
3. JaCoCo check pass.
4. Swagger/OpenAPI vẫn truy cập được.
5. Tất cả endpoint cũ vẫn hoạt động.
6. RBAC behavior không đổi.
7. SearchPlan parse/validate/compile tests pass.
8. CSV export vẫn stream được và giữ limit 10000.
9. LLM Gemini/Anthropic/mock provider vẫn hoạt động như cũ.
10. Package structure rõ hơn theo module/layer.
11. Có `backend/README.md`.
12. Không còn controller/service quá lớn nếu có thể tách hợp lý.
13. Không còn config hardcoded rải rác nếu có thể gom vào typed properties.

## 11. Lệnh Kiểm Tra Bắt Buộc

Sau mỗi phase lớn:

```bash
cd backend
./mvnw test
```

Nếu cần xem coverage:

```bash
cd backend
./mvnw test jacoco:report
```

Kiểm tra file:

```text
backend/target/site/jacoco/index.html
```

Nếu có thay đổi OpenAPI:

- Mở Swagger UI local hoặc deployed.
- Kiểm tra tag/order/security scheme.
- Kiểm tra các endpoint quan trọng:
  - `POST /api/v1/search`
  - `POST /api/v1/search/plan`
  - `POST /api/v1/search/refine`
  - `POST /api/v1/search/suggestions`
  - `GET /api/v1/search/history`
  - `GET /api/v1/audit-logs`
  - `GET /api/v1/search/{queryId}/export.csv`
  - `GET /api/v1/health/live`

## 12. Gợi Ý Thứ Tự Commit

Nếu refactor lớn, nên chia commit theo phase:

1. `refactor backend common error handling`
2. `refactor backend typed configuration properties`
3. `refactor backend llm provider adapters`
4. `refactor backend search module boundaries`
5. `refactor backend audit investigation export modules`
6. `feat backend request correlation logging`
7. `docs backend architecture readme`

Không nên gom tất cả vào một commit nếu diff quá lớn.

## 13. Ghi Chú Thiết Kế

Mục tiêu của refactor này không phải làm code "nhiều folder hơn", mà là làm rõ các câu hỏi:

- API nào nhận request?
- Use case nào điều phối flow?
- Rule nghiệp vụ nằm đâu?
- Elasticsearch/JPA/LLM adapter nằm đâu?
- Lỗi được format thống nhất ở đâu?
- Config được bind ở đâu?
- Nếu cần thay Gemini bằng Anthropic/mock/local LLM thì sửa ở đâu?
- Nếu cần thêm aggregation/search use case mới thì thêm vào layer nào?

Thông điệp kiến trúc:

> Backend phải là nơi kiểm soát an toàn. LLM chỉ là adapter hỗ trợ hiểu ý định; SearchPlan/domain validation mới là contract; compiler/backend mới quyết định Elasticsearch DSL cuối cùng.
