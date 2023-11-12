# Delete

_Deletes one or many records from the database_

```ts
import { destroy } from 'unconventional-pg-queries';

const response = await destroy(client, definition);
```
::: info NOTE
The method name is `destroy` because 'delete' is a protected keyword in javascript.
:::
## Configurable fields
- table
- [where](/concepts/where)

## Examples

### Delete by id

**Definition**
```ts
{
    table: 'public.users',
    where: [
        {
            field: 'id',
            operator: SqlWhereOperator.Eq,
            value: 1
        }
    ]
}
```
**Generated SQL**
```sql
DELETE FROM public.users fromref
WHERE (fromref."id")::int = 1 
RETURNING *
```
**Response**
```json
{
    id: 1,
    email: "john.smith@test.com",
    firstName: "John",
    lastName: "Smith",
    age: 27,
    isActive: true,
    createdAt: "2023-08-15T16:38:54.248Z"
}
```