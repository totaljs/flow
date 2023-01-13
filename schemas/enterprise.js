NEWSCHEMA('Enterprise', function(schema) {

	schema.define('token', String);

	schema.action('save', {
		name: 'Save token',
		action: function($, model) {
			PREF.set('enterprise', model.token);
			$.success();
		}
	});

	schema.action('read', {
		name: 'Read token',
		action: function($) {
			var model = {};
			model.token = PREF.enterprise || '';
			$.callback(model);
		}
	});

});