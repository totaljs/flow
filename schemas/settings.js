const Fields = '*name,*components,components2,*templates,token,darkmode:Boolean,notify:Boolean,*env:{dev|test|prod},op_reqtoken,op_restoken'.toJSONSchema();

NEWACTION('Settings/read', {
	name: 'Read Settings',
	sa: true,
	action: function($) {
		var model = {};
		for (let key in Fields.properties)
			model[key] = PREF[key];
		$.callback(model);
	}
});

NEWACTION('Settings/save', {
	name: 'Save settings',
	input: Fields,
	sa: true,
	action: function($, model) {

		var restartall = model.env !== PREF.env;

		for (let key in model)
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

ON('ready', function() {

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

	if (!PREF.templates)
		PREF.templates = 'https://cdn.totaljs.com/flowstream/templates/db.json';

	if (!PREF.token)
		PREF.token = GUID(30);

	CONF.op_reqtoken = PREF.op_reqtoken;
	CONF.op_restoken = PREF.op_restoken;

});