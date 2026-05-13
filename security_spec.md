# Security Specification for Segurito

## Data Invariants
- An inspection, accident, or IPER matrix cannot exist without a valid client ID.
- Clients belong to a user (ownerId).
- Sub-users (Collaborators) can only access/create data for clients owned by their Corporate Admin.
- Daily usage tracking must be incremented for every movement.
- Plan limits must be respected at the application level (rules will enforce ownership and integrity).

## The Dirty Dozen Payloads (Hardened Security Tests)
1. **Identity Spoofing:** Attempting to create a user profile for someone else's UID.
2. **Role Escalation:** A 'free' user trying to update their `planType` to 'full'.
3. **Sub-user Leak:** A Collaborator trying to read clients from a different Corporate Admin.
4. **Orphaned Write:** Creating an inspection for a non-existent client.
5. **Time Tampering:** Sending a manually set `createdAt` instead of `request.time`.
6. **Ghost Fields:** Adding `isAdmin: true` to a user profile update.
7. **Cross-Tenant Access:** User A trying to read/list clients owned by User B.
8. **Large Payload:** Injecting a 1MB string into a client's `name`.
9. **Invalid ID:** Using `../../secrets` as a document ID.
10. **Plan Bypass:** Writing to the `daily_usage` collection with a count of 0 or negative.
11. **PII Leak:** An unauthenticated user trying to 'get' a user's email.
12. **Immutable Record:** Trying to change the `ownerId` of an existing client.

## Test Runner (Security Rules)
I will now generate the `firestore.rules` and verify them.
