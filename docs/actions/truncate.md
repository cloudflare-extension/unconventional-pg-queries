# Truncate

_Deletes all records in a table and resets the primary key sequence_

```ts
import { truncate } from 'unconventional-pg-queries';

const response = await truncate(client, definition);
```

## Configurable fields
- table

## Examples

### Truncate

**Definition**
```ts
{
    table: 'public.users'
}
```
**Generated SQL**
```sql
TRUNCATE TABLE public.users RESTART IDENTITY CASCADE
```
**Response**
```json
[]
```