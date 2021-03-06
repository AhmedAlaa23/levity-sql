import {getDBCon, isDebuggingEnabled, debuggingOptions} from './db-con.js'
import {parseWhereObj} from './helpers.js'

function runQuery({con, query, params=[], database}){
	return new Promise((resolve, reject)=>{
		if(database!=="" && database!==undefined){
			query = `USE ${database}; ${query}`
		}
		con.query(query, params, function(err, results, fields){
			if(err){
				console.error(this.sql);
				console.error(err);
				con.release();
				reject(err);
			}
			// console.log('connected as id ' + con.threadId);
			con.release(); // When done with the connection, release it.

			// for debugging
			if(isDebuggingEnabled && debuggingOptions.showSqlQuery){
				console.log(this.sql);
			}

			// if USE Database then it's multiple statement then return the second results only
			if(database!=="" && database!==undefined){
				resolve(results[1]);
			}

			resolve(results);
		});
	});
}

const lowOperations = {
	run: async(query, params, database)=>{
		const con = await getDBCon();

		const results = await runQuery({con, query, params, database})
		return results;
	},

	// data = object {fieldName: value}
	insert: async(table='', data, database)=>{
		const con = await getDBCon();

		let query = `INSERT INTO ${table} SET ?;`;
		
		const results = await runQuery({con, query, params: data, database})
		return results.insertId;
	},

	select: async({table='', fields=[], where="", params=[], orderby={}, additions="", database} = {})=>{
		const con = await getDBCon();
		let paramsAll = [...params];
		let query = `SELECT `;

		for(let field of fields){
			query += `${field},`;
		}
		query = query.slice(0,-1);

		query += ` FROM ${table}`;

		if(typeof(where) === 'string'){
			if(where != ""){
				query += ` WHERE ${where}`;
			}
		}
		else{
			// object
			let {whereStr, whereParams} = parseWhereObj(where);
			query += ` WHERE ${whereStr}`;
			paramsAll = [...whereParams, ...params];
		}

		// orderby is object and not empty
		if( !(orderby && Object.keys(orderby).length === 0 && orderby.constructor === Object) ){
			let orderbyStr = "ORDER BY";
			for(const [orderItem, orderDirection] of Object.entries(orderby)){
				orderDirection ??= 'ASC';
				orderbyStr += ` ${con.escapeId(orderItem)} ${orderDirection.toUpperCase()},`;
			}
			orderbyStr = orderbyStr.slice(0,-1);
			query += ` ${orderbyStr}`;
		}

		if(additions != ""){
			query += ` ${additions}`;
		}

		query += ';';

		const results = await runQuery({con, query, params: paramsAll, database})
		return results;
	},

	update: async({table='', fields={}, where="", params=[], additions="", database} = {})=>{
		const con = await getDBCon();

		let query = `UPDATE ${table} SET `;
		
		let fieldsParams = [];
		for(let [field, value] of Object.entries(fields)) {
			query += `${field}=?,`;
			fieldsParams.push(value);
		}
		query = query.slice(0,-1);
		// params = [...fieldsParams, ...params];

		if(typeof(where) === 'string'){
			if(where != ""){
				query += ` WHERE ${where}`;
				params = [...fieldsParams, ...params];
			}
		}
		else{
			// object
			let {whereStr, whereParams} = parseWhereObj(where);
			query += ` WHERE ${whereStr}`;
			params = [...fieldsParams, ...whereParams, ...params];
		}

		if(additions != ""){
			query += ` ${additions}`;
		}

		query += ';';

		const results = await runQuery({con, query, params, database})
		return results.affectedRows;
	},

	delete: async({table='', where="", params=[], additions="", database} = {})=>{
		const con = await getDBCon();

		let query = `DELETE FROM ${table}`;
		
		if(typeof(where) === 'string' && where != ""){
			query += ` WHERE ${where}`;
		}
		else if(typeof(where) === 'object'){
			let {whereStr, whereParams} = parseWhereObj(where);
			query += ` WHERE ${whereStr}`;
			params = [...whereParams, ...params];
		}
		else{
			return new Promise((resolve, reject)=>{reject("Delete with no Where Condition!")});
		}

		if(additions != ""){
			query += ` ${additions}`;
		}

		query += ';';

		const results = await runQuery({con, query, params, database})
		return results.affectedRows;
	}
}

//  ============================= Higher Operations

const highOperations = {
	get: async({table="", fields=[], where="", params=[], additions="", database} = {})=>{
		let results = await lowOperations.select({table, fields, where, params, additions, database}, "LIMIT 1");
		if(results.length === 0){
			return null;
		}
		else{
			return results[0];
		}
	},

	doesExist: async({table='', where='', database} = {})=>{
		let results = await highOperations.get({table, fields: ['id'], where, database});
		if(results === null){
			return(false);
		}
		else{
			return(true);
		}
	}

}

// =================================================

const createTables = async (dbSchema, tablesIgnored=[], database)=>{
	const con = await getDBCon();

	let tablesQueries = '';
	for(let tableName in dbSchema){
		if(!tablesIgnored.includes(tableName)){
			let query = `
			CREATE TABLE IF NOT EXISTS \`${tableName}\` (`

				for(let [field, prop] of Object.entries(dbSchema[tableName])){
					if(prop.dbIgnore !== true){
						query += ` ${field} ${prop.type}`;
						if(prop.isID === true){
							query += ' AUTO_INCREMENT PRIMARY KEY NOT NULL';
						}
						else{
							if(prop.autoIncrement === true){
								query += ' AUTO_INCREMENT';
							}
							if(prop.primaryKey === true){
								query += ' PRIMARY KEY';
							}
							if(prop.allowNull !== false){
								query += ' NOT NULL';
							}
							if(prop.default !== undefined){
								query += ` DEFAULT ('${prop.default}')`;
							}
						}
						
						query += ',';
					}
				}

			query = query.slice(0,-1);
			query += `
			) `;
			query += 'COLLATE utf8mb4_unicode_ci; ';

			tablesQueries += query;
		}
	}

	await runQuery({con, query: tablesQueries, database});
	
	return true;
}

const dropTables = async (dbSchema, database)=>{
	const con = await getDBCon();

	let tablesQueries = '';
	
	for(let tableName in dbSchema){
		let query = `DROP TABLE IF EXISTS ${tableName}; `;
		tablesQueries += query;
	}

	await runQuery({con, query: tablesQueries, database});
	return true;
}

const disableStrictMode = async()=>{
	const con = await getDBCon();
	let query = `SET GLOBAL sql_mode = 'NO_ENGINE_SUBSTITUTION'; SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';`;
	
	await runQuery({con, query});

	return true;
}

const operations = {...lowOperations, ...highOperations, createTables, dropTables, disableStrictMode}

export default operations