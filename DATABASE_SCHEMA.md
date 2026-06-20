# Database Schema Documentation

## Core Tables

### `criminals`
Stores core identity and login information for registered externees.
- **id**: Primary Key
- **name**: Full name
- **login_id**: Unique login identifier (e.g., EXT001)
- **password**: Bcrypt hashed password
- **police_station_id**: Foreign key mapping to their reporting station.
- **is_active**: Boolean toggle for account activation/deactivation.

### `externment_orders`
Stores historical and active externment orders.
- **id**: Primary Key
- **criminal_id**: FK to `criminals` (ON DELETE CASCADE)
- **start_date** / **end_date**: Order validity period
- **is_active**: Status of the order

### `restricted_areas`
Stores geofenced zones where the criminal is forbidden (or confined) to enter.
- **id**: Primary Key
- **criminal_id**: FK to `criminals`
- **latitude** / **longitude** / **radius_km**: Circular geofence parameters
- **area_type**: `circle` or `polygon`
- **is_confinement**: Boolean (true if they MUST stay inside, false if they MUST stay outside)

### `checkins`
Stores daily facial recognition check-in records.
- **id**: Primary Key
- **criminal_id**: FK to `criminals`
- **selfie_url**: Cloudinary image URL
- **latitude** / **longitude**: GPS coordinates at time of check-in
- **status**: `compliant` or `non_compliant`
- **checked_in_at**: Timestamp
- *Constraint*: Unique index on `criminal_id` and `DATE(checked_in_at)` to prevent double check-ins on the same day.

## Hierarchy Tables
### `zones`, `acp_areas`, `police_stations`
Hierarchical structure of the police force. Stations belong to ACP Areas, which belong to Zones. Used for RBAC and Dashboard filtering.
