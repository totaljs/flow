// Global variables

NEWSCHEMA('Variables', function(schema) {

	schema.define('id', String);
	schema.define('data', Object);

	schema.action('read', {
		name: 'Read variable',
		action: function($) {
			var id = $.query.id;
			if (id) {
				var fs = MAIN.flowstream.db[id];
				if (fs) {
					$.callback(fs.variables);
				} else
					$.invalid(404);
			} else
				$.callback(MAIN.flowstream.db.variables);
			}
	});

	schema.action('save', {
		name: 'Save variables',
		action: function($, model) {
			if (!model.data)
				model.data = {};

			if (model.id) {

				var id = model.id;
				var fs = MAIN.flowstream.db[id];
				if (fs) {
					fs.variables = model.data;
					MAIN.flowstream.save();
					MAIN.flowstream.instances[id].variables(fs.variables);
				} else {
					$.invalid(404);
					return;
				}

			} else {
				MAIN.flowstream.db.variables = model.data;
				MAIN.flowstream.save();
				for (var key in MAIN.flowstream.instances) {
					var instance = MAIN.flowstream.instances[key];
					instance.variables2(model.data);
				}
			}

			$.success();
		}
	});
});