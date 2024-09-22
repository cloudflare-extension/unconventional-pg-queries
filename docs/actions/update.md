# Update

_Updates all records in the database matching a condition_

```ts
import { update } from 'unconventional-pg-queries';

const response = await update(client, definition);
```

## Configurable fields
- table
- data
- [where](/concepts/where)
- [increment](#increment)

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

### Increment

Adding the `subAction: SubAction.Increment` field to your query definition converts the update method into an increment. Each of the fields in the `data` object are incremented by the value of the field. Negative values are allowed and will decrement the field.

**Definition**
```ts
{
    table: 'public.users',
    subAction: SubAction.Increment,
    data: {
        age: 1
    },
    where: [
        {
            field: 'lastName',
            operator: SqlWhereOperator.Eq,
            value: "Smith"
        }
    ]
}
```
**Generated SQL**
```sql
UPDATE public.users fromref 
SET "age" = "age" + $1 
WHERE fromref."lastName" == 'Smith'
RETURNING *
```
```values
[ 1 ]
```
**Response**
```json
{
    id: 1,
    email: "john.smith@test.com",
    firstName: "John",
    lastName: "Smith",
    age: 28,
    isActive: false,
    createdAt: "2023-08-15T16:38:54.248Z"
}
```