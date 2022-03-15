NEWSCHEMA('Settings', function(schema) {

	schema.define('name', String, true);
	schema.define('components', String, true);
	schema.define('token', String);
	schema.define('darkmode', Boolean);
	schema.define('backup', Boolean);

	schema.setRead(function($) {
		var model = {};
		for (var key of schema.fields)
			model[key] = PREF[key];
		$.callback(model);
	});

	schema.setSave(function($, model) {
		for (var key in model)
			PREF.set(key, model[key]);
		CONF.name = model.name;
		CONF.backup = model.backup;
		$.success();
	});

});

// Initialization
if (PREF.name)
	CONF.name = PREF.name;
if (PREF.backup)
	CONF.backup = PREF.backup;

if (!PREF.components)
	PREF.components = 'https://cdn.totaljs.com/flowstream/components/db.json';

if (!PREF.token)
	PREF.token = GUID(30);