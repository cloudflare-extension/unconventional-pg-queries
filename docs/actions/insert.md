# Insert

_Inserts one or many records into the database_

```ts
import { insert } from 'unconventional-pg-queries';

const response = await insert(client, definition);
```

## Configurable fields
- table
- data
- conflict

## Examples

### Insert one

**Definition**
```ts
{
    table: 'public.users',
    data: {
        email: "john.smith@test.com",
        firstName: "John",
        lastName: "Smith",
        age: 27,
        isActive: true
    }
}
```
**Generated SQL**
```sql
INSERT INTO public.users ("email","firstName","lastName","age","isActive") 
VALUES ($1,$2,$3,$4,$5) RETURNING *
```
```values
[ 'john.smith@test.com', 'John', 'Smith', 27, true ]
```
::: info NOTE
Inserts and updates use [parameterized queries](https://node-postgres.com/features/queries#parameterized-query) to reduce the risk of SQL injection, hence the separation of SQL and values above.
:::
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

### Insert many

**Definition**
```ts
{
    table: 'public.users',
    data: [
        {
            email: "dorian.gray@test.com",
            firstName: "Dorian",
            lastName: "Gray",
            age: 25,
            isActive: true
        },
        {
            email: "basil.hallward@test.com",
            firstName: "Basil",
            lastName: "Hallward",
            age: 40,
            isActive: false
        }
    ]
}
```
**Generated SQL**
```sql
INSERT INTO public.user ("email","firstName","lastName","age","isActive") 
VALUES ($1,$2,$3,$4,$5),($6,$7,$8,$9,$10) RETURNING *
```
```values
[ 'dorian.gray@test.com', 'Dorian', 'Gray', 25, true, 'basil.hallward@test.com', 'Basil', 'Hallward', 40, false ]
```
**Response**
```json
[
    {
        id: 2,
        email: "dorian.gray@test.com",
        firstName: "Dorian",
        lastName: "Gray",
        age: 25,
        isActive: true,
        createdAt: "2023-08-15T16:38:54.248Z"
    },
    {
        id: 3,
        email: "basil.hallward@test.com",
        firstName: "Basil",
        lastName: "Hallward",
        age: 40,
        isActive: false,
        createdAt: "2023-08-15T16:38:54.248Z"
    }
]
```

### Upsert
Adding the `conflict` field with `action: ConflictResolution.doUpdate` to your query definition converts the insert method into an upsert. In the example below, if a row already exists with the `email: john.smith@test.com` and the `email` column has a unique constraint on it, that row will be updated instead of inserted anew.

Alternatively `action: ConflictResolution.doNothing` will skip that piece of data.

**Definition**
```ts
{
    table: 'public.users',
    data: {
        email: "john.smith@test.com",
        firstName: "John",
        lastName: "Smith",
        age: 30,
        isActive: true
    },
    conflict: {
        action: ConflictResolution.doUpdate,
        constraint: ['email']
    }
}
```
**Generated SQL**
```sql
INSERT INTO public.user ("email","firstName","lastName","type","isActive")
VALUES ($1,$2,$3,$4,$5)
ON CONFLICT ("email") DO UPDATE SET "email" = EXCLUDED."email","firstName" = EXCLUDED."firstName","lastName" = EXCLUDED."lastName","age" = EXCLUDED."age","isActive" = EXCLUDED."isActive"
RETURNING *
```
```values
[ 'john.smith@test.com', 'John', 'Smith', 30, true ]
```
**Response**
```json
{
    id: 1,
    email: "john.smith@test.com",
    firstName: "John",
    lastName: "Smith",
    age: 30,
    isActive: true,
    createdAt: "2023-08-15T16:38:54.248Z"
}
```
::: info
[See here](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT) for more information on PostgreSQL's `ON CONFLICT` clause.
:::
