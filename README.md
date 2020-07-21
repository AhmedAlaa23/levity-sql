# levity-MySQL
Node SQL Operations

## Installation and Usage

```
$ npm install levity-mysql
```

```javascript
import mysql from 'mysql';
import {setDB, dbOp} from 'levity-validator';

// creating MySql Pool
let DB = mysql.createPool({
	connectionLimit : 50,
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'test',
	timezone: 'UTC',
	multipleStatements: true
});

// setting the database
setDB(DB);

async function addUser(){
	// table name, data to insert
	await dbOp.insert('users', {first_name: 'David', last_name: 'Dobrik', email: 'david@dobrik.com'});
}

async function getUserName(){
	// table name, fields to select, where conditions, parameters to assign
	let user = await dbOp.get({
		table: 'users',
		fields: ['first_name','last_name'],
		where: "email=?",
		params: ['david@dobrik.com']
	});
	
	return `${user.first_name} ${user.last_name}`
}

addUser();
getUser();
```

## Documentation

- [Low Operations](README.md#Low-Operations)
- [High Operations](README.md#High-operations)

## Low-Operations

### insert(table='', data={})

table (string): table name to insert<br>
data (object): data to insert. example: {first_name: 'David', last_name: 'Dobrik'}

**example**
```javascript
dbOp.insert('users', {first_name: 'David', last_name: 'Dobrik'});
// adds a record to the users table with first_name='David' and last_name='Dobrik'
```

<hr>

### select({table='', fields=[], where='', params=null, additions=''})

table (string): table name to select from<br>
fields (array): fields to select<br>
where (string): where condition<br>
params (array || null): parameters to bind<br>
additions (string): additional conditions. example: ORDER BY, LIMIT<br>

**example**
```javascript
dbOp.select('users', ['first_name','last_name'], "email=?", ['test@test.com'], 'LIMIT 1');
// select the user with the email that is equal to 'test@test.com'
```

<hr>

### update({table='', fields=[], where='', params=null, additions=''})

table (string): table name to select from<br>
fields (array): fields to update<br>
where (string): where condition<br>
params (array || null): parameters to bind<br>
additions (string): additional conditions. example: ORDER BY, LIMIT<br>

**example**
```javascript
dbOp.update({
	table: 'users',
	fields: ['first_name','last_name'],
	where: "email=?",
	params: ['Felix','shellberg','test@test.com'],
	additions: 'LIMIT 1'
});
// update the user with the 'test@test.com' email first and last name to felix shellberg
```

<hr>

### delete({table='', where='', params=null, additions=''})

table (string): table name to select from<br>
where (string): where condition<br>
params (array || null): parameters to bind<br>
additions (string): additional conditions. example: ORDER BY, LIMIT<br>

**example**
```javascript
dbOp.delete({
	table: 'users',
	where: "email=?",
	params: ['test@test.com'],
	additions: 'LIMIT 1'
});
// deletes the user with the 'test@test.com' email
```

<hr>

## High-Operations

### get({table='', fields=[], where='', params=null})

**gets only one record**

table (string): table name to select from<br>
fields (array): fields to select<br>
where (string): where condition<br>
params (array || null): parameters to bind<br>

**example**
```javascript
dpOp.get({
	table: 'users',
	fields: ['first_name','last_name'],
	where: "email=?",
	params: ['test@test.com']
});
// return {first_name: 'David', last_name: 'Dobrik'}
```

**To Be Continued...**