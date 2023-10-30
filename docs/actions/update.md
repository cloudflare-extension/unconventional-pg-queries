# Update

_Updates all records in the database matching a condition_

```ts
import { update } from 'unconventional-pg-queries';

const response = await update(client, definition);
```

## Configurable fields
- table
- data
- where

## Examples

### Update

**Definition**
```ts
{
    table: 'public.users',
    data: {
        isActive: false
    },
    where: [
        {
            field: 'lastName',
            operator: SqlWhereOperator.In,
            value: "('Smith', 'Gray')"
        }
    ]
}
```
**Generated SQL**
```sql
UPDATE public.users fromref 
SET "isActive" = $1 
WHERE fromref."lastName" IN ('Smith', 'Gray')
RETURNING *
```
```values
[ false ]
```
::: info NOTE
Inserts and updates use [parameterized queries](https://node-postgres.com/features/queries#parameterized-query) to reduce the risk of SQL injection, hence the separation of SQL and values above.
:::
**Response**
```json
[
    {
        id: 1,
        email: "john.smith@test.com",
        firstName: "John",
        lastName: "Smith",
        age: 27,
        isActive: false,
        createdAt: "2023-08-15T16:38:54.248Z"
    },
    {
        id: 2,
        email: "dorian.gray@test.com",
        firstName: "Dorian",
        lastName: "Gray",
        age: 25,
        isActive: false,
        createdAt: "2023-08-15T16:38:54.248Z"
    }
]
```