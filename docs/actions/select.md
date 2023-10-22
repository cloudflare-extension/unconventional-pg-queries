# Select

_Retrieves one record from the database_

```ts
import { selectOne } from 'unconventional-pg-queries';

const response = await selectOne(client, definition);
```

## Configurable fields
- table
- where
- expand

## Examples

### Fetch an item by id

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
SELECT * FROM public.users fromref
WHERE (fromref."id")::int = 1
LIMIT 1
```
**Response**
```json
{
    id: 1,
    email: "john.smith@test.com",
    firstName: "John",
    lastName: "Smith",
    isActive: true,
    createdAt: "2023-08-15T16:38:54.248Z"
}
```
### Fetch an item by multiple conditions

**Definition**
```ts
{
    table: 'public.users',
    where: [
        { field: 'email', operator: SqlWhereOperator.LIKE, value: '%.test.com' },
        { field: 'isActive', operator: SqlWhereOperator.Eq, value: 'true', andOr: AndOr.And }
    ]
}
```
**Generated SQL**
```sql
SELECT * FROM public.users fromref 
WHERE fromref."email" LIKE '%.test.com' 
AND (fromref."isActive")::boolean = true 
LIMIT 1
```
**Response**
```json
{
    id: 1,
    email: "john.smith@test.com",
    firstName: "John",
    lastName: "Smith",
    isActive: true,
    createdAt: "2023-08-15T16:38:54.248Z"
}
```
::: tip
When multiple `where` clauses are used, the clauses will be AND-ed together by default. The inclusion of `andOr` in the above definition is purely illustrative and not required.
:::
### Fetch an item with relations expanded

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
    ],
    expand: {
      pets: {
        type: OneOrMany.Many,
        name: 'pets',
        fromTable: 'public.users',
        fromField: 'id',
        toTable: 'public.pets',
        toField: 'ownerId'
      }
    }
}
```
**Generated SQL**
```sql
SELECT * FROM public.users fromref 
WHERE fromref."email" LIKE '%.test.com' 
AND (fromref."isActive")::boolean = true 
LIMIT 1

SELECT toref.*, fromref.id as tmpfromref from public.users fromref 
INNER JOIN public.pets toref ON fromref."id" = toref."ownerId" 
WHERE fromref."id" IN (1); 
```
**Response**
```json
{
    id: 1,
    email: "john.smith@test.com",
    firstName: "John",
    lastName: "Smith",
    isActive: true,
    createdAt: "2023-08-15T16:38:54.248Z",
    pets: [
        {
            id: 5,
            ownerId: 1,
            name: "Missy",
            species: "cat"
        },
        {
            id: 8,
            ownerId: 1,
            name: "Kona",
            species: "dog"
        }
    ]
}
```
::: info NOTE
When expanding relations, multiple SQL queries will be executed. Notice that in this example, one query was made to retrieve the user and then a second query was made to retrieve all pets whose `ownerId` matched the user's `id`.
:::