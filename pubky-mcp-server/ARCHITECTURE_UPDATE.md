# Architecture Update Summary

This document summarizes the updates made to accurately reflect Pubky's hub-spoke architecture.

## Changes Made

### 1. Documentation Updates

#### README.md
- ✅ Updated "Features" section to clarify hub-spoke architecture
- ✅ Added "Architecture Overview" section with diagram
- ✅ Added "Data Flow" section explaining write vs read operations
- ✅ Clarified that you write to YOUR homeserver and read from Nexus

#### SETUP.md
- ✅ Added architecture diagram at the beginning
- ✅ Updated resource descriptions to clarify components
- ✅ Added key points about write/read operations

### 2. Code Updates

#### src/index.ts
- ✅ Updated startup messages to show hub-spoke architecture
- ✅ Clarified: Homeserver (write), App Specs (format), Nexus (read)
- ✅ Added key concept: "Write to YOUR homeserver → Nexus indexes it → Read from Nexus"

#### src/tools.ts
- ✅ Updated Nexus API tool descriptions to emphasize READ operations
- ✅ Updated App Specs tool descriptions to emphasize WRITE format
- ✅ Added notes about where to write vs where to read
- ✅ Clarified that Nexus crawls homeservers and indexes data

#### src/prompts.ts
- ✅ Added 3 new prompts:
  - `understand-architecture` - Explains the hub-spoke model
  - `write-to-homeserver` - Guide for writing to homeserver
  - `read-from-nexus` - Guide for reading from Nexus
- ✅ Updated existing prompt descriptions to clarify architecture
- ✅ All prompts now emphasize write vs read operations

### 3. New Content

#### Architecture Diagram
```
        ┌─────────────┐
        │   NEXUS     │ ← Crawls/indexes public data
        │  (Indexer)  │   from all homeservers (~0.5s)
        └─────────────┘
             ▲
             │ GET (read social data)
             │
        ┌────┴────┐
        │  Your   │
        │  App    │
        └────┬────┘
             │
             │ PUT/DELETE (write your data)
             ▼
    ┌─────────────────┐
    │ Your Homeserver │ ← Your personal storage
    └─────────────────┘
```

#### Key Concepts Now Clarified

**Writing Data (You → Your Homeserver):**
- Create post → PUT to your homeserver
- Update profile → PUT to your homeserver
- Delete content → DELETE from your homeserver
- Use pubky-app-specs format
- Nexus NOT involved in writes

**Reading Social Data (You → Nexus):**
- View feed → GET from Nexus
- Search users → GET from Nexus
- Discover posts → GET from Nexus
- Nexus has already crawled/indexed
- Don't query other homeservers directly

**Reading Your Own Data (You → Your Homeserver):**
- Get your own post → GET from your homeserver
- List your files → GET from your homeserver
- Private data only you can access

## Architecture Components

### 1. Your Homeserver (pubky-core)
**WHERE you WRITE data**
- Personal storage backend
- Authentication & authorization
- PUT/DELETE operations
- Example: `PUT /pub/pubky.app/posts/{id}`

### 2. Data Specs (pubky-app-specs)
**WHAT format to use**
- Standardized data models
- Validation rules
- Interoperability contract
- Example: PubkyAppPost, PubkyAppUser

### 3. Nexus Indexer (nexus-webapi)
**WHERE you READ social data**
- Crawls all homeservers (~0.5s)
- Indexes public data
- Fast aggregated queries
- Example: `GET /v0/stream/following`

## Benefits of These Changes

1. **Clearer mental model** - Developers understand the triangle/hub-spoke pattern
2. **Less confusion** - Clear separation between write (homeserver) and read (Nexus)
3. **Better onboarding** - New developers grasp architecture faster
4. **Accurate descriptions** - Tools and prompts reflect actual data flow
5. **Proper guidance** - Prompts now guide users to write to homeserver, read from Nexus

## Before vs After

### Before
- Described as "3 layers" (vertical stack metaphor)
- Implied sequential dependency
- Unclear about write vs read operations
- Could be confused as middleware pattern

### After
- Described as "hub-spoke architecture"
- Clear triangle diagram
- Explicit write (homeserver) vs read (Nexus)
- Accurate representation of data flow

## Testing Recommendations

1. Verify startup message shows correct architecture
2. Test new prompts: `understand-architecture`, `write-to-homeserver`, `read-from-nexus`
3. Ensure tool descriptions guide users correctly
4. Validate that examples show write to homeserver, read from Nexus

## No Breaking Changes

All changes are:
- ✅ Backward compatible
- ✅ Additive (new prompts, enhanced descriptions)
- ✅ Documentation improvements
- ✅ No API changes

Users of existing tools will benefit from clearer descriptions without any code changes needed.

