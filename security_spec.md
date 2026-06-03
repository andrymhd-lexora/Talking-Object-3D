# Security Specification & Threat Model

This document outlines the security requirements, transactional invariants, and threat definitions for NexoraAI Talking Object 3D Pro's firestore database.

## 1. Data Invariants

1. **User Ownership Consistency**: All stories stored in `/stories/{storyId}` must be owned by the user who created them (`userId == request.auth.uid`). A user can never read, create, update, or delete stories belonging to other users.
2. **Strict Shema Validation**:
   - **`stories`**: Every story requires `userId`, `title`, `selections`, `result`, and `createdAt` (strictly matching `request.time`). Custom arbitrary fields are strictly banned.
   - **`user_configs`**: Every configuration document at `/user_configs/{userId}` is strictly keyed by `userId` and requires `geminiApiKey` (<= 200 chars) and `updatedAt` (strictly matching `request.time`).
3. **Temporal Integrity**: Client-provided timestamps are untrusted. Creation or update times must always equal the transaction server time (`request.time`).
4. **Immutability Protection**: The `userId` and `createdAt` on stories are immutable and can never be changed once a document is created.
5. **PII and Database Shielding**: Strict limits on key lengths (e.g. API keys size is <= 200, title is <= 256) are enforced to protect against "Denial of Wallet" exhaustion attacks.

---

## 2. The "Dirty Dozen" Threat Payloads

Below are twelve malicious scenarios designed to exploit database security that must be rejected with `PERMISSION_DENIED`.

### Pillar 1: Identity Spoofing & Isolation

#### Threat 1: Write Story with Missing `userId`
*   **Payload**: `{"title": "An App", "result": "Story...", "selections": {}, "createdAt": "request.time"}` (Missing `userId`)
*   **Response**: `PERMISSION_DENIED`

#### Threat 2: Splicing other user's `userId` (Identity Spoofing)
*   **Auth UID**: `user_123`
*   **Payload**: `{"userId": "attacker_456", "title": "Apple - POV", "result": "Story...", "selections": {}, "createdAt": "request.time"}`
*   **Response**: `PERMISSION_DENIED`

#### Threat 3: Delete database document of another user
*   **Auth UID**: `user_123`
*   **Target**: `/stories/story_belonging_to_456`
*   **Response**: `PERMISSION_DENIED`

#### Threat 4: Unauthorized reading of other user's profile
*   **Auth UID**: `user_123`
*   **Target**: `/user_configs/user_456`
*   **Response**: `PERMISSION_DENIED`

---

### Pillar 2: Schema & Resource Poisoning ("Denial of Wallet")

#### Threat 5: Excessively long title (Resource Exhaustion)
*   **Payload**: `{"userId": "user_123", "title": "A".repeat(1000), "result": "Story...", "selections": {}, "createdAt": "request.time"}`
*   **Response**: `PERMISSION_DENIED`

#### Threat 6: Shadow fields / Ghost fields injection (Shadow Update Test)
*   **Payload**: `{"userId": "user_123", "title": "Title", "result": "Story...", "selections": {}, "createdAt": "request.time", "isAdmin": true, "hacked": "yes"}`
*   **Response**: `PERMISSION_DENIED`

#### Threat 7: Non-map `selections` field
*   **Payload**: `{"userId": "user_123", "title": "Title", "result": "Story...", "selections": "invalid_string", "createdAt": "request.time"}`
*   **Response**: `PERMISSION_DENIED`

#### Threat 8: Enormous API Key size injection
*   **Payload**: `{"geminiApiKey": "AIzaSy" + "A".repeat(500), "updatedAt": "request.time"}` (exceeds 200 character limit)
*   **Response**: `PERMISSION_DENIED`

---

### Pillar 3: Temporal Violations & State Bypasses

#### Threat 9: Client-controlled future timestamp
*   **Payload**: `{"userId": "user_123", "title": "Title", "result": "Story...", "selections": {}, "createdAt": "timestamp_in_future"}` (different from `request.time`)
*   **Response**: `PERMISSION_DENIED`

#### Threat 10: Non-Server-Time configuration update
*   **Payload**: `{"geminiApiKey": "AIzaSy...", "updatedAt": "2020-01-01T00:00:00Z"}` (different from `request.time`)
*   **Response**: `PERMISSION_DENIED`

#### Threat 11: Attempt to modify immutable `userId` on update
*   **Database state**: `{"userId": "user_123", "title": "Title", "result": "Story...", "selections": {}, "createdAt": "t"}`
*   **Update Payload**: `{"userId": "attacker_456", "result": "Modified text"}`
*   **Response**: `PERMISSION_DENIED`

#### Threat 12: Unverified user write attempt
*   **Auth Email**: `unverified_user@gmail.com` (email_verified: `false`)
*   **Payload/Action**: Create story or save API key.
*   **Response**: `PERMISSION_DENIED`

---

## 3. Test Runner Design (`firestore.rules.test.ts`)

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestApp,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";

let testEnv: RulesTestEnvironment;

describe("Firestore Security Rules unit testing", () => {
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "gen-lang-client-0946643431",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("should block unauthenticated story creations", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      unauthDb.collection("stories").add({
        userId: "user_123",
        title: "Apple - POV",
        result: "Once upon a time...",
        selections: {},
        createdAt: "placeholder",
      })
    );
  });

  it("should fail validation on shadow updates", async () => {
    const aliceDb = testEnv.authenticatedContext("alice_123", { email_verified: true }).firestore();
    await assertFails(
      aliceDb.collection("stories").add({
        userId: "alice_123",
        title: "Apple - POV Story",
        result: "Once upon a time...",
        selections: {},
        createdAt: "placeholder", // will fail because rules require serverTime request.time
        ghostField: "shadow",
      })
    );
  });
});
```
