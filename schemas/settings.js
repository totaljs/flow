NEWSCHEMA('Settings', function(schema) {

	schema.define('name', String, true);
	schema.define('components', String, true);
	schema.define('components2', String);
	schema.define('token', String);
	schema.define('darkmode', Boolean);
	schema.define('backup', Boolean);
	schema.define('env', ['dev', 'test', 'prod'], true)('test');

	schema.setRead(function($) {
		var model = {};
		for (var key of schema.fields)
			model[key] = PREF[key];
		$.callback(model);
	});

	schema.setSave(function($, model) {

		var restartall = model.env !== PREF.env;

		for (var key in model)
			PREF.set(key, model[key]);

		CONF.name = model.name;
		CONF.backup = model.backup;
		$.success();

		// Changed mode, needs to be restarted all FlowStreams
		if (restartall) {
			var instances = [];
			for (var key in MAIN.flowstream.instances) {
				var item = MAIN.flowstream.instances[key];
				if (item) {
					// Is worker?
					if (item.flow) {
						instances.push(item.flow);
					} else {
						item.env = model.env;
						for (var id of item.meta.flow)
							item.meta.flow[id].env = model.env;
					}
				}
			}

			// Restart workers step-by-step
			instances.length && instances.wait(function(item, next) {
				item.$schema.env = model.env;
				if (item.terminate)
					item.terminate();
				else
					item.kill(9);
				setTimeout(next, 1000);
			});
		}

	});

});

// Initialization
if (PREF.name)
	CONF.name = PREF.name;

if (!PREF.env)
	PREF.env = 'dev';

if (PREF.backup)
	CONF.backup = PREF.backup;

if (!PREF.components)
	PREF.components = 'https://cdn.totaljs.com/flowstream/components/db.json';

if (!PREF.token)
	PREF.token = GUID(30);