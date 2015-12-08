var _ = require('lodash');
var filter = require('knex-filter').filter;

module.exports = buildCrudController;

function buildCrudController (infra, config) {
	_.each(config, function (value, key) {
		if (value === true) {
			config[key] = {};
		}
	});

	var crudKeys = ['create', 'update', 'list', 'view', 'remove'];
	var crudConfig = _.pick(config, crudKeys);
	var globalConfig = _.omit(config, crudKeys);

	return _.transform(crudConfig, function (result, crudMethodConfig, crudMethodName) {
		var localConfig = _.extend({}, globalConfig, crudMethodConfig);
		result[crudMethodName] = build(infra, crudMethodName, localConfig);
	});
}

function create (db, config) {
	return function (params) {
		var fields = _.isEmpty(config.fields) ? params : _.pick(params, fields);
		return db.modify(this.user, function (t) {
			return db(config.table)
				.insert(fields)
				.returning(config.returning || '*')
				.transacting(t)
				.then(_.first);
		}).then(this.json);
	};
}

function list (db, config) {
	var countField = db.raw('count(*) over () as _count');

	var fields = config.fields;
	if (_.isEmpty(fields)) {
		fields = ['*', countField];
	} else {
		fields = _.clone(fields);
		if (!_.contains(fields, 'id')) {
			fields.push('id');
		}
		fields.push(countField);
	}

	return function (params) {
		return db(config.table)
			.select(fields)
			.where(filter(JSON.parse(params.filter || '{}')))
			.orderByRaw(params.order || 'id')
			.limit(params.limit || 30)
			.offset(params.offset || 0)
			.then(function (rows) {
				return {
					count: _.get(rows, '0._count', 0),
					rows: rows,
				};
			})
			.then(this.json);
	}
}

function view (db, config) {
	var fields = config.fields;
	if (!_.isEmpty(fields) && !_.contains(fields, 'id')) {
		fields = _.clone(fields);
		fields.push('id');
	}
	return function (params) {
		return db(config.view || config.table)
			.select(fields || '*')
			.where('id', params.id)
			.first()
			.then(this.json);
	}
}

function update (db, config) {
	return function (params) {
		var fields = _.isEmpty(config.fields) ? params : _.pick(params, config.fields);
		return db.modify(this.user, function (t) {
			return db(config.table)
				.update(fields)
				.where('id', params.id)
				.returning(config.returning || '*')
				.transacting(t)
				.then(_.first);
		}).then(this.json);
	}
}

function remove (table) {
	return function (params) {
		return db.modify(this.user, function (t) {
			return db(table)
				.where('id', params.id)
				.del()
				.transacting(t);
		}).then(this.json);
	}
}

var builders = {
	create: create,
	update: update,
	view: view,
	list: list,
	remove: remove
};

function build (infra, name, config) {
	return builders[name](infra.db, config);
}
