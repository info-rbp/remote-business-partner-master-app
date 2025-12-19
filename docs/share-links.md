## Proposal share tokens

- **Collection:** `proposalShares`
- **Fields:** `proposalId` (string), `token` (string and document ID), `expiresAt` (timestamp), `createdAt` (timestamp, optional)
- **Behavior:** Visiting a proposal preview generates a share token that is valid for seven days. Existing, non-expired tokens are reused for the same proposal.

## Manual verification

### Share by token
1. Create or locate a proposal document in Firestore (collection `proposals`) with `title` and `content` populated.
2. Open `/proposals/<proposalId>/preview` to generate (or reuse) a share token link shown on the page.
3. Click the **Share** button or copy the link it points to; load `/share/<token>` and confirm the title and content from the underlying proposal display.
4. In Firestore, edit the corresponding `proposalShares` document and set `expiresAt` to a timestamp in the past. Refresh `/share/<token>` and confirm you see the “Link Unavailable” expired-link message.
5. Delete or rename the `proposalShares` document to verify that invalid tokens also surface the “Link Unavailable” state.
