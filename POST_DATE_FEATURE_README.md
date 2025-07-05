# Post Date Restriction Feature

This feature allows campaigns to restrict reel submissions based on the Instagram post date. Admins can set a minimum post date for campaigns, and users can only submit reels that were posted on or after that date.

## Database Changes

Run the following SQL migration to add the required columns:

```sql
-- Add min_post_date column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS min_post_date DATE;

-- Add post_date column to reels table
ALTER TABLE reels ADD COLUMN IF NOT EXISTS post_date TIMESTAMP;

-- Add index for better performance on date queries
CREATE INDEX IF NOT EXISTS idx_reels_post_date ON reels(post_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_min_post_date ON campaigns(min_post_date);
```

Or use the provided migration file: `add_post_date_feature.sql`

## How It Works

### 1. Campaign Creation/Editing
- Admins can set a `min_post_date` when creating or editing campaigns
- This date represents the earliest allowed Instagram post date for reels in that campaign
- If no date is set, all reels are allowed (backward compatibility)

### 2. Reel Submission Validation
When a user submits a reel to a campaign with a `min_post_date`:

1. The system fetches the reel's post date from Instagram via RapidAPI
2. Compares the post date with the campaign's minimum date
3. If the reel was posted before the minimum date, submission is rejected with a clear error message

### 3. Error Messages
The system provides user-friendly error messages:

- **Date too old**: "This reel was posted on [Post Date]. Only reels posted on or after [Min Date] are allowed. Please submit a newer reel."
- **Unable to determine date**: "Unable to determine the post date of this reel. Please try again or contact support if the issue persists."

## API Changes

### Campaign Endpoints
- `POST /api/campaigns` - Now accepts `min_post_date` parameter
- `PUT /api/campaigns/:id` - Now accepts `min_post_date` parameter
- `GET /api/campaigns` - Now returns `min_post_date` in response
- `GET /api/user/campaigns` - Now returns `min_post_date` in campaign data
- `GET /api/campaigns/available` - Now returns `min_post_date` in response

### Reel Endpoints
- `POST /api/reels` - Now validates post date against campaign restrictions
- Reel data now includes `post_date` field

## Frontend Integration

### Campaign Form
Add a date picker to the campaign creation/editing form:

```javascript
// Example form field
<label>Minimum Post Date (Optional)</label>
<input 
  type="date" 
  name="min_post_date"
  placeholder="Leave empty to allow all dates"
/>
```

### Error Handling
Display the error message when reel submission fails:

```javascript
// Example error handling
if (error.message.includes('Only reels posted on or after')) {
  // Show user-friendly error message
  showError(error.message);
}
```

## Example Usage

### Setting a Campaign Date Restriction
1. Admin creates a campaign with `min_post_date: "2025-06-20"`
2. Users can only submit reels posted on or after June 20, 2025
3. Older reels will be rejected with a clear error message

### Date Format
- Use ISO date format: `YYYY-MM-DD`
- Example: `"2025-06-20"` for June 20, 2025
- Time zone is handled automatically

## Benefits

1. **Content Freshness**: Ensures campaigns only accept recent content
2. **Quality Control**: Prevents users from submitting old, potentially outdated reels
3. **Campaign Relevance**: Helps maintain campaign relevance and engagement
4. **User Experience**: Clear error messages help users understand requirements
5. **Flexibility**: Optional feature that doesn't affect existing campaigns

## Technical Notes

- The feature is backward compatible - existing campaigns without `min_post_date` will accept all reels
- Post dates are extracted from Instagram's API response using `taken_at_timestamp`
- Fallback handling for cases where post date cannot be determined
- Database indexes ensure good performance for date-based queries 