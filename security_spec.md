# Security Specification for ComptaHub

## Data Invariants
1. A Company must have an `ownerId` matching the creator's UID.
2. An Expense must have a `companyId` pointing to a company owned by the same user.
3. Once an Expense is created, the `ownerId` and `companyId` are immutable.
4. All financial amounts must be non-negative.
5. Dates must follow the YYYY-MM-DD format.

## The Dirty Dozen (Test Payloads)
1. **The Spoof**: Create a company with someone else's `ownerId`. (DENY)
2. **The Hijack**: Update an expense to change the `ownerId` to yourself. (DENY)
3. **The Orphan**: Create an expense for a company that doesn't exist. (DENY)
4. **The Ghost Field**: Add a `isVerified: true` field to an expense update. (DENY)
5. **The Negative Bill**: Set a grand total of -100.00. (DENY)
6. **The Time Machine**: Manually set `createdAt` to a date in the past during create. (DENY - must use server timestamp)
7. **The Long Vendor**: Set a vendor name that is 1MB large. (DENY - size limit)
8. **The PII Leak**: Read another user's company info without being the owner. (DENY)
9. **The Category Injection**: Use an invalid category string. (DENY)
10. **The ID Poisoning**: Create a document with an ID that is a 1.5KB junk string. (DENY)
11. **The Partial Update Bypass**: Update `vendor` while also trying to sneak in a `total` change in a restricted update branch. (DENY)
12. **The Unauthorized Listing**: Query the `expenses` collection without filtering by `ownerId`. (DENY)
