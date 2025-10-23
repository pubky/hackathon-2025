# Publar Scenarios

Scenarios are stored in `~/.publar/scenarios/` and define automated test sequences for Publar.

## JSON Schema

Scenarios are defined in JSON format with the following structure:

```json
{
  "name": "Scenario Name",
  "description": "What this scenario tests",
  "operations": [
    {
      "at_seconds": 0.0,
      "type": "create_homeserver",
      "id": "homeserver-1"
    },
    {
      "at_seconds": 1.0,
      "type": "wait_for_homeserver",
      "homeserver_id": "homeserver-1",
      "timeout_seconds": 5.0
    },
    {
      "at_seconds": 2.0,
      "type": "create_client",
      "id": "client-1"
    },
    {
      "at_seconds": 3.0,
      "type": "connect_client",
      "client_id": "client-1",
      "homeserver_id": "homeserver-1"
    },
    {
      "at_seconds": 4.0,
      "type": "write_data",
      "client_id": "client-1",
      "path": "/pub/publar/test.txt",
      "content": "Hello from Publar!"
    },
    {
      "at_seconds": 5.0,
      "type": "read_data",
      "client_id": "client-1",
      "path": "/pub/publar/test.txt"
    }
  ]
}
```

## Action Types

### create_homeserver
Creates a new homeserver instance.

```json
{
  "type": "create_homeserver",
  "id": "unique-homeserver-id"
}
```

**Fields:**
- `id` (string): Unique identifier for this homeserver

---

### wait_for_homeserver
Waits for a homeserver to become ready before proceeding.

```json
{
  "type": "wait_for_homeserver",
  "homeserver_id": "homeserver-1",
  "timeout_seconds": 5.0
}
```

**Fields:**
- `homeserver_id` (string): ID of the homeserver to wait for
- `timeout_seconds` (number): Maximum time to wait (default: 5.0)

---

### create_client
Creates a new client with a generated keypair.

```json
{
  "type": "create_client",
  "id": "unique-client-id"
}
```

**Fields:**
- `id` (string): Unique identifier for this client

---

### connect_client
Connects a client to a homeserver (performs signup).

```json
{
  "type": "connect_client",
  "client_id": "client-1",
  "homeserver_id": "homeserver-1"
}
```

**Fields:**
- `client_id` (string): ID of the client to connect
- `homeserver_id` (string): ID of the homeserver to connect to

---

### write_data
Writes data to a homeserver via a connected client.

```json
{
  "type": "write_data",
  "client_id": "client-1",
  "path": "/pub/publar/example.txt",
  "content": "Data to write"
}
```

**Fields:**
- `client_id` (string): ID of the connected client
- `path` (string): Path to write to (e.g., `/pub/publar/file.txt`)
- `content` (string): Content to write

---

### read_data
Reads data from a homeserver via a connected client.

```json
{
  "type": "read_data",
  "client_id": "client-1",
  "path": "/pub/publar/example.txt"
}
```

**Fields:**
- `client_id` (string): ID of the connected client
- `path` (string): Path to read from

---

## Timing

The `at_seconds` field determines when each operation executes relative to the scenario start time.

- Operations execute sequentially in the order they appear
- Use precise timing for realistic network behavior
- Consider homeserver startup time (usually ~1 second)

## Examples

Example scenario files included with Publar (automatically copied to `~/.publar/scenarios/` on first run):
- `simple_connection.json` - Basic homeserver + client + write/read
- `multi_client.json` - One homeserver with multiple clients
- `rate_limiting.json` - Stress test with rapid operations

## Loading Scenarios

### From UI
1. Click "Import" button in the topbar (center section)
2. Select a JSON file from your filesystem
3. The scenario will be copied to `~/.publar/scenarios/`
4. Select the scenario from the dropdown
5. Click "Play" to execute

### From Code
```rust
use std::fs;
let json = fs::read_to_string("/path/to/my_scenario.json")?;
let scenario = Scenario::from_json(&json)?;
```

## Saving Scenarios

### From UI
1. Create your network topology manually (homeservers, clients, connections)
2. Click "Export" button in the topbar (center section)
3. Choose a filename (will be saved to `~/.publar/scenarios/`)
4. The scenario is automatically available in the dropdown

### From Code
```rust
let json = scenario.to_json()?;
fs::write("~/.publar/scenarios/my_scenario.json", json)?;
```

## Best Practices

1. **Use descriptive IDs**: `homeserver-main` instead of `hs1`
2. **Add wait operations**: Allow time for homeservers to become ready
3. **Stagger connections**: Don't connect all clients at once unless testing load
4. **Comment with description**: Use the description field to explain what's being tested
5. **Start simple**: Test basic operations before complex scenarios

## Troubleshooting

**Issue**: Scenario fails with "not ready" error
- **Solution**: Increase wait time or add `wait_for_homeserver` operations

**Issue**: Connections fail
- **Solution**: Ensure homeserver is created and ready before connecting clients

**Issue**: Write operations fail
- **Solution**: Ensure client is connected to homeserver first

**Issue**: Invalid JSON error
- **Solution**: Validate JSON syntax, check all required fields are present

## Scenario Storage Location

All scenarios are stored in `~/.publar/scenarios/`. This location:
- Persists across application updates
- Is accessible from any terminal/file manager
- Works correctly when Publar is distributed as a binary
- Is automatically created if it doesn't exist
