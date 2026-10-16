# Security Specification & Threat Model for MeetSpace

## 1. Data Invariants
1. **User Profile Invariant**: Public profiles (`users/{userId}/public/profile`) can only be modified by the authenticated user whose `uid == userId`.
2. **PII Isolation Invariant**: Private preferences and PII (`users/{userId}/private/preferences`) can only be read and written by the document owner (`request.auth.uid == userId`).
3. **Meeting Ownership & Access**: Meeting documents (`meetings/{meetingId}`) can only be created by an authenticated user who sets `hostId == request.auth.uid`.
4. **Meeting Update Boundaries**: Only the meeting host can lock meetings or toggle waiting room settings. Other participants cannot change hostId or meeting ownership.
5. **Meeting Messages Invariant**: Chat messages in `meetings/{meetingId}/messages/{messageId}` can only be created by authenticated participants where `senderId == request.auth.uid`. No participant can forge another user's senderId.
6. **Scheduled Meetings Invariant**: Scheduled meetings in `users/{userId}/scheduledMeetings/{scheduleId}` belong strictly to `userId`.
7. **Contacts Invariant**: Contacts in `users/{userId}/contacts/{contactId}` can only be read and written by `userId`.
8. **Catch-All Default Deny**: All unmapped collections and wildcard paths default to `read, write: if false`.

## 2. The "Dirty Dozen" Payloads (Must Return PERMISSION_DENIED)
1. **Payload 1 (Ghost Field in User Profile)**:
   `{ "uid": "user123", "displayName": "Alice", "photoURL": "", "isSuperAdmin": true }`
2. **Payload 2 (User Identity Spoofing)**:
   `{ "uid": "attacker_id", "displayName": "Victim", "createdAt": "...", "updatedAt": "..." }` written to `users/victim_id/public/profile`.
3. **Payload 3 (PII Snoop Attack)**:
   Unauthenticated or non-owner user reading `users/victim_id/private/preferences`.
4. **Payload 4 (Meeting Host Hijack)**:
   Participant attempts to update `meetings/{meetingId}` setting `hostId: "attacker_id"`.
5. **Payload 5 (Message Sender Forgery)**:
   User `userA` attempts to write message with `senderId: "userB"` into `meetings/{meetingId}/messages/msg1`.
6. **Payload 6 (Oversized Message String Attack - Denial of Wallet)**:
   Message with `text` exceeding 2000 characters.
7. **Payload 7 (Path Variable Poisoning)**:
   Meeting document creation with illegal characters or excessive length: `meetings/{1500-char-junk-string}`.
8. **Payload 8 (Contact Scraping Attack)**:
   User attempting to list or read `users/other_user/contacts`.
9. **Payload 9 (Terminal State Bypass)**:
   Attempting to reactivate an ended meeting (`status: "ended"` -> `status: "active"`) by a non-host.
10. **Payload 10 (Scheduled Meeting Injection)**:
    User attempting to write to `users/other_user/scheduledMeetings/{scheduleId}`.
11. **Payload 11 (Blanket Collection List Read)**:
    Attempting to list all users' private documents without owner filtering.
12. **Payload 12 (Unauthenticated Write)**:
    Anonymous or unauthenticated write to `meetings/{meetingId}`.

## 3. Test Runner Definition
Unit tests in `firestore.rules.test.ts` assert `assertFails` on all 12 payloads and `assertSucceeds` on verified authenticated operations.
