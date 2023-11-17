NEWACTION('Enterprise/save', {
	name: 'Save token',
	input: 'token:String',
	action: function($, model) {
		PREF.set('enterprise', model.token);
		$.success();
	}
});

NEWACTION('Enterprise/read', {
	name: 'Read token',
	action: function($) {
		var model = {};
		model.token = PREF.enterprise || '';
		$.callback(model);
	}
});