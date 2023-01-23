NEWSCHEMA('Settings', function(schema) {

	schema.define('name', String, true);
	schema.define('components', String, true);
	schema.define('components2', String);
	schema.define('token', String);
	schema.define('darkmode', Boolean);
	schema.define('backup', Boolean);
	schema.define('notify', Boolean);
	schema.define('env', ['dev', 'test', 'prod'], true)('test');

	schema.define('op_reqtoken', String);
	schema.define('op_restoken', String);

	schema.action('read', {
		name: 'Read Settings',
		action: function($) {

			if (UNAUTHORIZED($))
				return;

			var model = {};
			for (var key of schema.fields)
				model[key] = PREF[key];
			$.callback(model);
		}
	});

	schema.action('save', {
		name: 'Save settings',
		action: function($, model) {

			if (UNAUTHORIZED($))
				return;

			var restartall = model.env !== PREF.env;

			for (var key in model)
				PREF.set(key, model[key]);

			CONF.name = model.name;
			CONF.backup = model.backup;
			CONF.op_reqtoken = model.op_reqtoken;
			CONF.op_restoken = model.op_restoken;

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
		}
	});
});

if (PREF.notify == null)
	PREF.notify = true;

CONF.op_icon = 'ti ti-object';

// Initialization
if (PREF.name)
	CONF.name = PREF.name;
else
	PREF.name = CONF.name;

if (!PREF.env)
	PREF.env = 'dev';

if (PREF.backup)
	CONF.backup = PREF.backup;

if (!PREF.components)
	PREF.components = 'https://cdn.totaljs.com/flowstream/webcomponents/db.json';

if (!PREF.token)
	PREF.token = GUID(30);

CONF.op_reqtoken = PREF.op_reqtoken;
CONF.op_restoken = PREF.op_restoken;