# Relations

In an object-oriented world, we have the luxury of nested objects to show a connection between two entities. For example, a `User` can have nested within it a list of `Animal`s as pets.

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

This trivial structure is more cumbersome to represent in a relational database and requires multiple tables connected by a **relation**. The above would be structured with a `users` table, an `animals` table, and a foreign key on the `ownerId` field. We won't delve into the topic further as better explanations already exist online, but will demonstrate how relations can be selected--or "expanded"--on a parent object using this library.

There are 4 types of relations that can be represented by adding the `expand` field to your select query. In the examples below, we will use the [selectOne](/actions/select) method, but all work just as well with [selectMany](/actions/select-many).

## Types

### Has One

Table `From` has a column holding table `To`'s id. This is an indication that `From` *has one* `To`.

To select `From` with `To` expanded on it:

**Definition**
```ts{6-14}
{
    table: 'public.users',
    where: [
        { field: 'id', operator: SqlWhereOperator.Eq, value: 50 }
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

SELECT toref.* from public.users fromref 
INNER JOIN public.companies toref ON fromref."companyId" = toref."id" 
WHERE fromref."companyId" IN (50);
```
**Response**
```json{10-13}
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
        name: "Pawtucket Brewery",
        locationId: 123
    }
}
```
::: info NOTE
While two queries are made--one to select the parent and another to expand the relation--a single object combining the responses is outputted.
:::


### Has Many

Table `To` has a column holding table `From`'s id. This is an indication that `From` *has many* `To`s.

To select `From` with multiple `To`s expanded on it:

**Definition**
```ts{6-14}
{
    table: 'public.users',
    where: [
        { field: 'id', operator: SqlWhereOperator.Eq, value: 50 }
    ],
    expand: {
        pets: {
            type: OneOrMany.Many,
            fromTable: 'public.users',
            fromField: 'id',
            toTable: 'public.animals',
            toField: 'ownerId'
        }
    }
}
```
**Generated SQL**
```sql
SELECT * FROM public.users fromref
WHERE (fromref."id")::int = 50
LIMIT 1

SELECT toref.* from public.users fromref 
INNER JOIN public.animals toref ON fromref."id" = toref."ownerId" 
WHERE fromref."id" IN (50);
```
**Response**
```json{10-23}
{
    id: 50,
    email: "peter.griffin@test.com",
    firstName: "Peter",
    lastName: "Griffin",
    age: 42,
    isActive: true,
    companyId: 10,
    createdAt: "2023-08-15T16:38:54.248Z",
    pets: [
        {
            id: 10,
            ownerId: 50,
            name: "Brian",
            species: "dog"
        },
        {
            id: 11,
            ownerId: 50,
            name: "Evil Monkey",
            species: "monkey"
        }
    ]
}
```

### Many To Many

Table `Through` has columns holding both `From` and `To`'s id, forming a connection between the two tables. We can say `From` has many `To`s, but also that each `To` can belong to many different `From`s. This differs from the *has many* relationship where each `To` can belong to only one `From`.

To select `From` with multiple independent `To`s expanded on it:

**Definition**
```ts{6-17}
{
    table: 'public.users',
    where: [
        { field: 'id', operator: SqlWhereOperator.Eq, value: 50 }
    ],
    expand: {
        favoriteFilms: {
            type: OneOrMany.Many,
            fromTable: 'public.users',
            fromField: 'id',
            toTable: 'public.movies',
            toField: 'id',
            throughTable: 'public.user_movies',
            throughFromField: 'userId',
            throughToField: 'movieId'
        }
    }
}
```
**Generated SQL**
```sql
SELECT * FROM public.users fromref
WHERE (fromref."id")::int = 50
LIMIT 1

SELECT toref.* from public.users fromref
INNER JOIN public.user_movies throughref ON fromref."id" = throughref."userId"
INNER JOIN public.movies toref ON throughref."movieId" = toref."id"
WHERE fromref."id" IN (50); 
```
**Response**
```json{10-19}
{
    id: 50,
    email: "peter.griffin@test.com",
    firstName: "Peter",
    lastName: "Griffin",
    age: 42,
    isActive: true,
    companyId: 10,
    createdAt: "2023-08-15T16:38:54.248Z",
    favoriteFilms: [
        {
            id: 75,
            title: "Road House"
        },
        {
            id: 90,
            title: "Star Wars"
        }
    ]
}
```


## Nested Relations

The above examples show only a single layer of relations, but there is no imposed limit on depth. You can also expand relations of relations *n* layers deep to create a complex, nested object.

**Definition**
```ts{6-23}
{
    table: 'public.users',
    where: [
        { field: 'id', operator: SqlWhereOperator.Eq, value: 50 }
    ],
    expand: {
        employer: {
            type: OneOrMany.One,
            fromTable: 'public.users',
            fromField: 'companyId',
            toTable: 'public.companies',
            toField: 'id',
            expand: {
                headquarters: {
                    type: OneOrMany.One,
                    fromTable: 'public.companies',
                    fromField: 'locationId',
                    toTable: 'public.cities',
                    toField: 'id'
                }
            }
        }
    }
}
```

**Generated SQL**
```sql
SELECT * FROM public.users fromref
WHERE (fromref."id")::int = 50
LIMIT 1

SELECT toref.* from public.users fromref 
INNER JOIN public.companies toref ON fromref."companyId" = toref."id" 
WHERE fromref."companyId" IN (50);

SELECT toref2.* from public.companies fromref2
INNER JOIN public.cities toref2 ON fromref2."locationId" = toref2."id" 
WHERE fromref2."companyId" IN (10);
```

**Response**
```json{10-20}
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
        name: "Pawtucket Brewery",
        locationId: 123,
        headquarters: {
            id: 123,
            name: "Quahog",
            state: "RI",
            country: "USA"
        }
    }
}
```