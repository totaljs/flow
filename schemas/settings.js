const Fields = '*name,*components,components2,*templates,token,darkmode:Boolean,backup:Boolean,notify:Boolean,*env:{dev|test|prod},op_reqtoken,op_restoken,items:[*id:String, value:Object]'.toJSONSchema();

NEWACTION('Settings/read', {
	name: 'Read Settings',
	sa: true,
	action: function($) {

		var language = $.user.language;
		var model = {};

		for (let key in Fields.properties) {
			if (key !== 'items')
				model[key] = PREF[key];
		}

		model.items = [];

		for (let key in F.plugins) {
			let plugin = F.plugins[key];
			let cfg = plugin.config;
			if (cfg) {
				var name = TRANSLATE(language, plugin.name);
				model.items.push({ type: 'group', name: name });
				for (let m of cfg) {
					var type = m.type;
					if (!type) {
						if (m.value instanceof Date)
							type = 'date';
						else
							type = typeof(m.value);
					}
					var item = CLONE(m);
					item.name = TRANSLATE(language, m.name);
					item.value = CONF[m.id];
					item.type = type;
					model.items.push(item);
				}
			}
		}

		$.callback(model);
	}
});

NEWACTION('Settings/save', {
	name: 'Save settings',
	input: Fields,
	sa: true,
	action: function($, model) {

		var restartall = model.env !== PREF.env;

		for (let key in model) {
			if (key !== 'items')
				PREF[key] = model[key];
		}

		CONF.name = model.name;
		CONF.backup = model.backup;
		CONF.op_reqtoken = model.op_reqtoken;
		CONF.op_restoken = model.op_restoken;

		if (model.items) {
			for (let m of model.items) {
				if (m.value instanceof Date) {
					m.type = 'date';
				} else {
					if (m.value == null) {
						m.value = '';
						m.type = 'string';
					} else {
						var type = typeof(m.value);
						if (type === 'object') {
							type = 'json';
							m.value = JSON.stringify(m.value);
						} else
							m.value = m.value == null ? '' : m.value;
						m.type = type;
					}
				}
				CONF[m.id] = PREF[m.id] = m.value;
			}
		}

		PREF.save();
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

	if (PREF.env) {
		CONF.env = PREF.env;
	} else {
		if (CONF.env)
			PREF.env = CONF.env;
		else
			PREF.env = 'dev';
	}

	if (PREF.backup)
		CONF.backup = PREF.backup;

	if (PREF.components) {
		CONF.components = PREF.components;
	} else {
		if (CONF.components) {
			PREF.components = CONF.components;
		} else {
			PREF.components = 'https://cdn.totaljs.com/flowstream/webcomponents/db.json';
		}
	}

	if (PREF.templates) {
		CONF.templates = PREF.templates;
	} else {
		if (CONF.templates) {
			PREF.templates = CONF.templates;
		} else {
			PREF.templates = 'https://cdn.totaljs.com/flowstream/templates/db.json';
		}
	}

	if (!PREF.token)
		PREF.token = GUID(30);

	CONF.op_reqtoken = PREF.op_reqtoken;
	CONF.op_restoken = PREF.op_restoken;

});