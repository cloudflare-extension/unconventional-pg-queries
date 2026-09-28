# Update Many

_Updates a discrete set of records in the database_

```ts
import { updateMany } from 'unconventional-pg-queries';

const response = await updateMany(client, definition);
```

## Configurable fields
- table
- data

## Examples

### Update multiple records by id

This method accepts an array of records and updates the fields included in them. Each record **must** contain its primary key (e.g. `id`) as an identifier. 

Because this update happens in a single operation, all records in the `data` array **must** also contain the same fields or an error is thrown. It is not possible to update, for example, `firstName` on one record and `firstName` and `lastName` on another. Look to the example below as a model.

**Definition**
```ts
{
    table: 'public.users',
    data: [
        {
            id: 12,
            firstName: 'Rebecca',
            lastName: 'Rolfe'
        },
        {
            id: 85,
            firstName: "Darth",
            lastName: "Vader"
        }
    ]
}
```
**Generated SQL**
```sql
UPDATE public.users fromref 
SET "firstName" = tmpfromref."firstName","lastName" = tmpfromref."lastName" 
from (values ((SELECT "id" FROM public.users WHERE false),(SELECT "firstName" FROM public.users WHERE false),(SELECT "lastName" FROM public.users WHERE false)),($1,$2,$3),($4,$5,$6)) as tmpfromref("id","firstName","lastName") 
WHERE fromref."id" = tmpfromref."id"
RETURNING fromref.*
```
```values
[ 12, 'Rebecca', 'Rolfe', 85, 'Darth', 'Vader' ]
```
::: info NOTE
The leading row of `SELECT ... WHERE false` subqueries is a row of nulls typed from the table's own columns. It makes Postgres parse every value as its column's type, even when a column is null in every record, and its null `id` never matches a record.
:::
::: info NOTE
Inserts and updates use [parameterized queries](https://node-postgres.com/features/queries#parameterized-query) to reduce the risk of SQL injection, hence the separation of SQL and values above.
:::
**Response**
```json
[
    {
        id: 12,
        email: "pocahontas@test.com",
        firstName: "Recebba",
        lastName: "Rolfe",
        age: 27,
        isActive: false,
        createdAt: "2023-08-15T16:38:54.248Z"
    },
    {
        id: 85,
        email: "anakin.skywalker@test.com",
        firstName: "Darth",
        lastName: "Vader",
        age: 22,
        isActive: true,
        createdAt: "2023-08-15T16:38:54.248Z"
    }
]
```