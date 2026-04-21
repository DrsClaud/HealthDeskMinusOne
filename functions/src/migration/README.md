# HealthDesk Migrations

This folder contains cloud functions for migrating data in the HealthDesk Firestore database.

## Available Migrations

### 🏥 Locations Migration (`migrateLocations`)

Uploads emergency department location data from CSV to Firestore.

**Features:**

- ✅ CSV parsing with validation
- ✅ Dry run mode for testing
- ✅ Batch processing (500 docs/batch)
- ✅ Automatic data type conversion
- ✅ GeoPoint creation for coordinates
- ✅ HealthDesk field compatibility

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Deploy Functions (if needed)

```bash
firebase deploy --only functions:migrateLocations
```

## Usage

### Locations Migration

#### Step 1: Upload Your CSV File

Put your `locations.csv` file in the migration folder:

```
functions/src/migration/locations.csv
```

#### Step 2: Deploy the Function

```bash
cd functions
firebase deploy --only functions:migrateLocations
```

#### Step 3: Run in Browser

Just visit the URL in your browser!

**Dry Run (recommended first):**

```
https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/migrateLocations?dryRun=true
```

**Actual Migration:**

```
https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/migrateLocations
```

#### Local Development

```bash
# Start emulator
firebase emulators:start --only functions

# Visit in browser:
http://localhost:5001/YOUR-PROJECT-ID/us-central1/migrateLocations?dryRun=true
http://localhost:5001/YOUR-PROJECT-ID/us-central1/migrateLocations
```

## CSV Format

Your CSV should include these columns:

**Required:**

- `id` - Unique identifier for the location
- `title` - Name of the hospital/facility

**Optional but recommended:**

- `lat` - Latitude (will be converted to number)
- `lng` - Longitude (will be converted to number)
- `score*` - Any score fields (will be converted to numbers)
- `address`, `city`, `state`, `zip` - Address components

**Example CSV:**

```csv
id,title,lat,lng,address,city,state,type
123,General Hospital,40.7128,-74.0060,123 Main St,New York,NY,Emergency Department
456,City Medical Center,34.0522,-118.2437,456 Oak Ave,Los Angeles,CA,Emergency Department
```

## Data Processing

The migration automatically:

1. **Validates** required fields (`id` must exist)
2. **Filters** empty values and "Not Available" entries
3. **Converts** numeric fields to proper number types
4. **Adds** required HealthDesk fields:
   - `users: []` - Empty array for user associations
   - `type: "Emergency Department"` - If not specified
   - `coordinates: GeoPoint` - From lat/lng values
5. **Skips** existing documents completely (by document ID)
6. **Creates** new documents with ID as both document ID and string field

## Response Format

### Dry Run Response

```json
{
  "success": true,
  "message": "Dry run completed",
  "totalRows": 100,
  "validRows": 98,
  "skippedRows": 2,
  "sampleData": [
    {
      "id": "123",
      "title": "General Hospital",
      "lat": 40.7128,
      "lng": -74.006,
      "users": [],
      "type": "Emergency Department",
      "coordinates": { "_latitude": 40.7128, "_longitude": -74.006 }
    }
  ]
}
```

### Migration Response

```json
{
  "success": true,
  "message": "Migration completed successfully",
  "totalRows": 100,
  "processedRows": 98,
  "skippedRows": 2,
  "existingDocuments": 25,
  "newDocuments": 73,
  "batchesProcessed": 1
}
```

## Function Configuration

Each migration function is configured with:

- **Timeout:** 540 seconds (9 minutes)
- **Memory:** 2GB
- **HTTP trigger** for manual execution

## Important Behavior

### Document Skipping

- ✅ **Existing documents are SKIPPED completely** (by document ID)
- ✅ **Only NEW documents are created**
- ✅ **No data is overwritten or merged**
- ✅ **Document ID becomes both the Firestore doc ID AND an `id` field (string)**

This makes it **safe to re-run** the migration multiple times!

## Security

- 🔒 Functions use Firebase Admin SDK (bypasses security rules)
- 🚀 Batch operations for performance
- ⚡ Skips existing documents (no overwrites)
- 🛡️ Input validation prevents malformed data

## Troubleshooting

**Function timeout:**

- Large CSV files may hit the 9-minute limit
- Split into smaller files or increase timeout

**Memory issues:**

- Very large CSV files may exceed 2GB memory
- Process in smaller chunks

**Permission errors:**

- Ensure your project has proper Firebase Admin permissions
- Check that the function is deployed correctly

**CSV parsing errors:**

- Ensure your CSV has proper headers
- Check for special characters or encoding issues
- Use dry run to validate format

## Other Migrations

This folder also contains:

- `geoMigration.js` - Converts location coordinates to GeoFirestore format
- `ratingMigration.js` - Migrates rating data
- `hlthdskScoreMigration.js` - Migrates My HealthDesk scores
- And more...

Each follows the same pattern of exportable cloud functions.
