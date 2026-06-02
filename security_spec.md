# Security Specification & Threat Model (TDD)

## 1. Data Invariants
- **Identity Lock**: A user's data (UserProfile) and operations (UserTrade) are strictly private. No user can read, list, create, edit, or delete another user's documents.
- **Strict Fields**: During creation of profiles or trades, exact structure matching is enforced. No "shadow fields" or "ghost profiles" can be injected.
- **Temporal Lock**: `createdAt` and `updatedAt` are strictly governed using server time (`request.time`).
- **Immutability Rules**: Once written, fields like `id`, `userId`, `entryPrice`, and `symbol` in a `UserTrade` are immutable.

---

## 2. The "Dirty Dozen" Malicious Payloads
The following payloads describe operations designed to break the laws of Identity, Integrity, and State, which must run under `PERMISSION_DENIED`.

1. **Spoofed Ownership User Profile Creation**: Creating a profile for `/users/attacker_uid` using standard auth but setting `userId` to `victim_uid`.
2. **Ghost Field Mutation in settings**: Injecting an extra field `"isAdmin": true` inside `/users/{uid}`.
3. **Impersonated Access reading user profiles**: Attempting as `attacker_uid` to read the private settings of `victim_uid`.
4. **Blanket Querying of user profiles**: Querying all records in `/users` without limiting query scope to `resource.data.userId == request.auth.uid`.
5. **Orphaned Trade Placement**: Submitting a trade into `/users/{uid}/trades/{tradeId}` where the `userId` in the payload is a random GUID, bypassing relation checks.
6. **Poisoned Long Asset ID Insertion**: Registering a trade with a symbol of length 500 characters to cause wallet exhaustion.
7. **Client Time Forgery (createdAt)**: Creating a trade with a custom past client timestamp `createdAt = "1970-01-01T00:00:00Z"` instead of using Google's `request.time`.
8. **Immutability Bypass / Modification of trade type**: Selecting an existing trade in `/users/{uid}/trades/{tradeId}` and changing the type from `PUT` to `CALL`.
9. **Outcome State Hijacking (terminal status swap)**: Attempting to update a trade whose status is already `WIN` to run again or change to `LOSS`.
10. **Shadow Field Injection on Trade Creation**: Submitting extra properties like `"isDeveloper": true` inside the trades collection payload.
11. **Negative Exposure Trade Amount**: Trying to record or execute a trade with `amount = -100`.
12. **Untrusted Role Escalation**: Writing `role = "admin"` directly on a profile creation or edit to bypass access thresholds.

---

## 3. Test Runner (`firestore.rules.test.ts`)
```typescript
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "stoked-abode-407pf",
    firestore: {
      rules: require("fs").readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Zero-Trust Security Rule Verification", () => {
  it("denies spoofed identity profiles (Dirty Dozen #1)", async () => {
    const context = testEnv.authenticatedContext("attacker_id");
    const db = context.firestore();
    const docRef = doc(db, "users", "attacker_id");
    await expect(setDoc(docRef, {
      userId: "victim_id",
      email: "attacker@gmail.com",
      createdAt: new Date(),
      balance: 1000,
      settings: {}
    })).rejects.toThrow();
  });

  it("denies editing fields of another user's profile (Dirty Dozen #3)", async () => {
    const context = testEnv.authenticatedContext("attacker_id");
    const db = context.firestore();
    const docRef = doc(db, "users", "victim_id");
    await expect(getDoc(docRef)).rejects.toThrow();
    await expect(updateDoc(docRef, { balance: 999999 })).rejects.toThrow();
  });
});
```
