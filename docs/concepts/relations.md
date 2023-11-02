# Relations

In the object-oriented world, we have the luxury of nested objects to show a connection between two entities. For example, a `User` can have nested within it a list of `Animal`s as pets.

```json
{
    id: 1,
    email: "john.smith@test.com",
    firstName: "John",
    lastName: "Smith",
    age: 27,
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

This trivial structure is more cumbersome to represent in a relational database and requires the use of multiple tables connected by a **relation**. The above would be represented by a `users` table, an `animals` table, and a foreign key on the `ownerId` field. We won't delve into the topic further as better explanations already exist online, but will demonstrate how relations can be selected--or "expanded"--on a parent object using this library.

There are 4 types of relations that can be represented by adding the `expand` field to your `select` or `selectMany` query:

## Types

### Has One

Table `A` has a column holding table `B`'s id. This is an indication that `A` *has one* `B`.

To select `A` with `B` expanded on it, do the following:
**Definition**
```ts
{
    table: 'public.users',
    where: [
        {
            field: 'id',
            operator: SqlWhereOperator.Eq,
            value: 50
        }
    ],
    expand: {
        employer: {
            type: OneOrMany.One,
            fromTable: 'public.users',
            fromField: 'companyId',
            toTable: 'public.companies',
            toField: 'id'
        }
    }
}
```
**Generated SQL**
```sql
SELECT * FROM public.users fromref
WHERE (fromref."id")::int = 50
LIMIT 1

SELECT toref.*, fromref.id as tmpfromref from public.users fromref 
INNER JOIN public.companies toref ON fromref."companyId" = toref."id" 
WHERE fromref."companyId" IN (50);
```
**Response**
```json
{
    id: 50,
    email: "peter.griffin@test.com",
    firstName: "Peter",
    lastName: "Griffin",
    age: 42,
    isActive: true,
    companyId: 10,
    createdAt: "2023-08-15T16:38:54.248Z",
    employer: {
        id: 10,
        name: "Pawtucket Brewery"
    }
}
```
::: info NOTE
While two queries are made--one to select the parent and another to expand the relation--a single object combining the two is outputted.
:::