# HealthDesk Integration Installation Guide

## Installation

1. **Install the Plugin**

   - Download the HealthDesk Integration plugin ZIP file.
   - In WordPress Admin, go to Plugins > Add New > Upload Plugin.
   - Upload the ZIP file and click "Install Now".
   - Activate the plugin.

2. **Configure the Plugin**

   - Go to Settings > HealthDesk.
   - Enter the JWT Secret provided by HealthDesk (this is required).
   - Save changes.

3. **Add HealthDesk to Your Pages**

   - Use one of these shortcodes on any page:

   **Embed HealthDesk directly in the page:**

   ```
   [healthdesk_embed]
   ```

   **Create a button that opens HealthDesk in a new tab:**

   ```
   [healthdesk_button text="Access HealthDesk"]
   ```

## Requirements

- Users must be logged in to WordPress to access HealthDesk.
- The JWT Secret must match the one provided by the HealthDesk developer.

## Troubleshooting

- If you see "HealthDesk integration is not fully configured" - Make sure you've entered the JWT Secret in Settings > HealthDesk.
- If you see "The JWT secret in WordPress doesn't match the server" - Double-check the secret matches exactly what was provided by HealthDesk.
- If users can't see HealthDesk - Verify they are logged in to WordPress.
