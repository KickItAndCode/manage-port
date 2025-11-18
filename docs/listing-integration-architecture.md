# Listing Integration Architecture Diagram

## System Architecture Overview

```mermaid
graph TB
    subgraph "User Interface Layer"
        UI[User Interface]
        UI --> LP[Listings Page<br/>Main navigation entry]
        UI --> LM[Listing Manager<br/>Publishing interface]
        UI --> LD[Listings Dashboard<br/>Portfolio overview]
        UI --> PC[Platform Connections<br/>OAuth setup]
    end

    subgraph "Frontend Components"
        LP --> |manages| LM
        LP --> |displays| LD
        LP --> |configures| PC
        
        LM --> |publishes to| PS[Platform Selector]
        LM --> |tracks| PP[Publishing Progress]
        LM --> |shows| ER[Error Recovery]
    end

    subgraph "API Routes Layer"
        AR[API Routes<br/>/api/listing-platforms/]
        AR --> OA[OAuth Routes<br/>/oauth/[platform]/authorize<br/>/oauth/[platform]/callback]
        AR --> PA[Publishing Routes<br/>/publish<br/>/update<br/>/delete]
        AR --> SA[Status Routes<br/>/status<br/>/sync]
    end

    subgraph "Business Logic Layer"
        AC[API Client<br/>Retry logic<br/>Rate limiting]
        PR[Platform Registry<br/>Adapter management]
        OH[OAuth Handler<br/>PKCE flow<br/>Token management]
        
        PA --> AC
        AC --> PR
        OA --> OH
    end

    subgraph "Platform Adapters"
        PR --> AA[Apartments.com Adapter<br/>- OAuth 2.0<br/>- 20 images max<br/>- 30 req/min]
        PR --> RA[Rentspree Adapter<br/>- 30+ platforms<br/>- Bulk syndication<br/>- API key auth]
        PR --> ZA[Zillow Adapter<br/>- Premium listings<br/>- OAuth 2.0<br/>- 60 req/min]
        
        AA --> |transforms| DT1[Data Transformer]
        RA --> |transforms| DT2[Data Transformer]
        ZA --> |transforms| DT3[Data Transformer]
    end

    subgraph "Convex Backend"
        CV[Convex Functions]
        CV --> LP2[listingPublications.ts<br/>CRUD operations]
        CV --> PT[platformTokens.ts<br/>OAuth tokens]
        CV --> BJ[backgroundJobs.ts<br/>Bulk operations]
        CV --> CR[crons.ts<br/>Token refresh<br/>Status sync]
    end

    subgraph "Database Schema"
        DB[(Convex Database)]
        DB --> LPT[listingPublications<br/>84 fields<br/>21 indexes]
        DB --> PTT[platformTokens<br/>OAuth data<br/>Encryption]
        DB --> PR2[properties<br/>Source data]
    end

    subgraph "External Platforms"
        APT[Apartments.com API<br/>$49.99/month]
        RSP[Rentspree API<br/>Free tier available]
        ZIL[Zillow API<br/>Premium required]
    end

    %% Connections
    UI --> AR
    AR --> CV
    CV --> DB
    
    AA --> APT
    RA --> RSP
    ZA --> ZIL
    
    OH --> PT
    LP2 --> LPT
    PT --> PTT
    
    style UI fill:#e1f5fe
    style DB fill:#fff3e0
    style APT fill:#ffebee
    style RSP fill:#ffebee
    style ZIL fill:#ffebee
```

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React UI
    participant API as API Routes
    participant CV as Convex
    participant PA as Platform Adapter
    participant EXT as External Platform

    U->>UI: Click "Publish Listing"
    UI->>UI: Show platform selector
    U->>UI: Select platforms
    UI->>API: POST /api/listing-platforms/publish
    
    API->>CV: Get property data
    CV-->>API: Property details
    API->>CV: Get platform tokens
    CV-->>API: OAuth tokens
    
    alt Direct Publishing (1-3 properties)
        API->>PA: Transform & publish
        PA->>EXT: API call with data
        EXT-->>PA: Success/Error response
        PA-->>API: Result
        API-->>UI: Real-time status
        UI-->>U: Show success/error
    else Background Publishing (bulk)
        API->>CV: Create background job
        CV-->>API: Job created
        API-->>UI: Job queued status
        Note over CV: Process job async
        CV->>PA: Transform & publish
        PA->>EXT: API call with data
        EXT-->>PA: Response
        PA-->>CV: Update status
        CV-->>UI: Real-time update
        UI-->>U: Show progress
    end
```

## Component Interaction Diagram

```mermaid
graph LR
    subgraph "Property Data Flow"
        P[Property] --> |contains| U[Units]
        U --> |defines| LD2[Listing Data]
        P --> |has| I[Images]
        P --> |includes| A[Amenities]
    end

    subgraph "Listing Creation"
        LD2 --> |transforms to| PD[Platform Data]
        I --> |optimizes for| PI[Platform Images]
        A --> |maps to| PA2[Platform Amenities]
        
        PD --> |validates| V[Validator]
        PI --> |resizes| IR[Image Resizer]
        PA2 --> |filters| AF[Amenity Filter]
    end

    subgraph "Publishing Process"
        V --> |if valid| PP2[Publish Process]
        IR --> PP2
        AF --> PP2
        
        PP2 --> |creates| LP3[Listing Publication]
        LP3 --> |tracks| S[Status]
        LP3 --> |stores| EID[External ID]
        LP3 --> |saves| URL[External URL]
    end

    subgraph "Status Management"
        S --> |pending| Q[Queue]
        S --> |publishing| PR3[Progress]
        S --> |published| C[Complete]
        S --> |failed| E[Error]
        
        E --> |retry| Q
        C --> |sync| SY[Sync Status]
    end
```

## Security Architecture

```mermaid
graph TB
    subgraph "Authentication Layer"
        U2[User] --> |authenticates| CL[Clerk Auth]
        CL --> |provides| JWT[JWT Token]
        JWT --> |validates| API2[API Routes]
    end

    subgraph "OAuth 2.0 Flow"
        API2 --> |initiates| OI[OAuth Init]
        OI --> |generates| ST[State Token]
        OI --> |creates| CV2[Code Verifier]
        CV2 --> |hashes to| CC[Code Challenge]
        
        ST --> |stores| SS[Secure Storage]
        CV2 --> SS
        
        OI --> |redirects| EP[External Platform]
        EP --> |authorizes| U2
        EP --> |callback with| AC2[Auth Code]
        
        AC2 --> |exchanges for| AT[Access Token]
        AT --> |encrypts| ET[Encrypted Token]
        ET --> |stores| DB2[(Database)]
    end

    subgraph "API Security"
        API2 --> |verifies| UID[User ID]
        API2 --> |checks| PS2[Platform Scope]
        API2 --> |validates| RL[Rate Limits]
        
        UID --> |queries| DB2
        PS2 --> |filters| Results
        RL --> |enforces| Throttle
    end

    subgraph "Data Isolation"
        DB2 --> |indexes by| UI2[userId]
        DB2 --> |filters by| PI2[propertyId]
        DB2 --> |scopes by| PL[platform]
        
        UI2 --> |ensures| DI[Data Isolation]
        PI2 --> DI
        PL --> DI
    end
```

## Performance Optimization Strategy

```mermaid
graph TD
    subgraph "Request Flow"
        R[Request] --> |evaluates| DM[Decision Matrix]
        DM --> |1-3 properties<br/>1 platform| Direct[Direct API Call]
        DM --> |>3 properties<br/>OR >1 platform| Queue[Background Queue]
    end

    subgraph "Direct Processing"
        Direct --> |5-10 seconds| Response[Immediate Response]
        Response --> |real-time| UI3[UI Update]
    end

    subgraph "Background Processing"
        Queue --> |immediate| ACK[Acknowledgment]
        Queue --> |processes| Jobs[Job Processor]
        Jobs --> |batches| Batch[Batch API Calls]
        Batch --> |updates| Status[Status Updates]
        Status --> |pushes| WS[WebSocket/Polling]
        WS --> UI3
    end

    subgraph "Optimization Techniques"
        Cache[Token Cache] --> |reduces| Auth[Auth Calls]
        Index[21 DB Indexes] --> |speeds| Query[Queries]
        CDN[Image CDN] --> |optimizes| Images[Image Delivery]
        RL2[Rate Limiter] --> |prevents| Errors[API Errors]
    end
```

## Error Handling & Recovery

```mermaid
stateDiagram-v2
    [*] --> Pending: Create listing
    Pending --> Publishing: Start publish
    Publishing --> Published: Success
    Publishing --> Failed: Error
    
    Failed --> Retrying: Auto retry
    Retrying --> Publishing: Retry attempt
    Retrying --> Failed: Max retries
    
    Published --> Syncing: Periodic sync
    Syncing --> Published: Sync success
    Syncing --> OutOfSync: Sync failed
    
    OutOfSync --> Syncing: Manual sync
    Failed --> Pending: Manual retry
    
    Published --> Deleting: Delete request
    Deleting --> Deleted: Success
    Deleting --> Failed: Error
    
    note right of Failed
        Error Types:
        - VALIDATION_ERROR
        - AUTH_ERROR  
        - RATE_LIMIT
        - NETWORK_ERROR
        - PLATFORM_ERROR
    end note
    
    note right of Retrying
        Retry Strategy:
        - Exponential backoff
        - Max 3 attempts
        - Different strategy per error
    end note
```

## Technology Stack

```mermaid
graph TB
    subgraph "Frontend Stack"
        NJS[Next.js 14+<br/>App Router]
        TS[TypeScript<br/>100% coverage]
        TW[Tailwind CSS<br/>Utility-first]
        SUI[shadcn/ui<br/>Component library]
        RQ[React Query<br/>Data fetching]
    end

    subgraph "Backend Stack"
        CNV[Convex<br/>Real-time database]
        CLK[Clerk<br/>Authentication]
        API3[API Routes<br/>Next.js handlers]
    end

    subgraph "Infrastructure"
        VCL[Vercel<br/>Hosting]
        CF[Cloudflare<br/>CDN]
        S3[S3-compatible<br/>Image storage]
    end

    subgraph "Development Tools"
        ESL[ESLint<br/>Code quality]
        PRT[Prettier<br/>Formatting]
        PLY[Playwright<br/>E2E testing]
        JEST[Jest<br/>Unit testing]
    end

    NJS --> VCL
    CNV --> API3
    CLK --> API3
    CF --> S3
    
    style NJS fill:#61dafb
    style CNV fill:#ff6b6b
    style VCL fill:#000000,color:#ffffff
```

## Scaling Strategy

```mermaid
graph LR
    subgraph "Current State"
        CS[1-50 Properties<br/>Direct API calls<br/>5-10 sec response]
    end

    subgraph "Growth Phase 1"
        GP1[50-500 Properties<br/>Background jobs<br/>Batch processing]
    end

    subgraph "Growth Phase 2"
        GP2[500-5000 Properties<br/>Queue optimization<br/>Dedicated workers]
    end

    subgraph "Enterprise Scale"
        ES[5000+ Properties<br/>Distributed queue<br/>Multi-region<br/>Dedicated infrastructure]
    end

    CS --> |User growth| GP1
    GP1 --> |Portfolio expansion| GP2
    GP2 --> |Enterprise needs| ES

    subgraph "Optimization at Each Phase"
        O1[Database sharding]
        O2[API rate limit pooling]
        O3[Image CDN caching]
        O4[Platform-specific queues]
    end
```

---

This architecture demonstrates a **production-ready, scalable system** that can grow from individual landlords to enterprise property management companies without significant re-architecture.