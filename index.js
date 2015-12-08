var _ = require('lodash');
var Promise = require('bluebird');
var crud = require('./crud');

module.exports = buildCrudexController;

function buildCrudexController (infra, config) {
	var crudController = crud(infra, config);
	var crudHandlers = _.transform(crudController, function (result, value, key) {
		result[key] = _.extend({}, config[key], { handler: value });
	});

	var abstractConfig = _.extend({}, config, crudHandlers);

	var preferenceKeys = ['allow', 'deny', 'validation', 'before', 'after'];
	var preferences = _.pick(abstractConfig, preferenceKeys);

	return _.transform(abstractConfig, function (result, value, key) {
		if (_.isFunction(value)) {
			value = { handler: value };
		}
		if (_.isObject(value)) {
			var localConfig = _.extend({}, preferences, value);
			result[key] = buildMethod(infra, localConfig);
		} 
	});
}

function build (infra, config) {
	var authorize = infra.authorization(_.pick(config, ['allow', 'deny']));
	var validate = infra.validation(config.validation);
	var before = config.before;
	var after = config.after;
	var handler = config.handler;
	return function (params) {
		var context = this;
		return Promise.resolve().then(function () {
			return authorize.call(context, context.user);
		}).then(function () {
			return validate.call(context, params);
		}).then(function () {
			return before && before.call(context, params);
		}).then(function () {
			return handler.call(context, params);
		}).then(function () {
			return after && after.call(context, params);
		});
	}
}
