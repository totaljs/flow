NEWSCHEMA('Clipboard', function(schema) {

	schema.define('data', String, true);

	schema.addWorkflow('export', function($) {
		var id = $.id;
		var item = MAIN.flowstream.db[id];
		if (item)
			$.success(true, JSON.stringify(item));
		else
			$.invalid(404);
	});

	schema.addWorkflow('import', function($, model) {

		var data = model.data.parseJSON(true);

		if (!data) {
			$.invalid('@(Invalid data)');
			return;
		}

		data.id = 'f' + UID();

		if (!data.design)
			data.design = {};

		if (!data.components)
			data.components = {};

		if (!data.variables)
			data.variables = {};

		data.variables2 = MAIN.flowstream.variables || {};
		data.dtcreated = NOW;

		delete data.dtupdated;
		MAIN.flowstream.db[data.id] = data;
		MAIN.flowstream.init(data.id, function(err) {
			$.callback({ success: true, value: data.id, error: err ? err.toString() : null });
			MAIN.flowstream.save();
		});
	});

});