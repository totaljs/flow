// Global variables

NEWACTION('Variables/read', {
	name: 'Read variable',
	query: 'id',
	action: function($) {
		var id = $.query.id;
		if (id) {
			var fs = Flow.db[id];
			if (fs)
				$.callback(fs.variables);
			else
				$.invalid(404);
		} else
			$.callback(Flow.db.variables);
	}
});

NEWACTION('Variables/save', {
	name: 'Save variables',
	input: 'id:String, data:Object',
	action: function($, model) {

		if (!model.data)
			model.data = {};

		if (model.id) {

			var id = model.id;
			var fs = Flow.db[id];
			if (fs) {
				fs.variables = model.data;
				Flow.emit('save');
				Flow.instances[id].variables(fs.variables);
			} else {
				$.invalid(404);
				return;
			}

		} else {

			Flow.db.variables = model.data;
			Flow.emit('save');

			for (let key in Flow.instances) {
				let instance = Flow.instances[key];
				instance.variables2(model.data);
			}
		}

		$.success();
	}
});