exports.icon = 'ti ti-bookmark';
exports.name = '@(Bookmarks)';
exports.position = 6;
exports.permissions = [{ id: 'bookmarks', name: 'Components' }];
exports.visible = user => user.sa || user.permissions.includes('bookmarks');
exports.import = 'toolbar.html';

ON('ready', function() {
	if (!PREF.bookmarks)
		PREF.bookmarks = [];
});

NEWACTION('Bookmarks', {
	name: 'List of bookmarks',
	route: '+API ?',
	permissions: 'bookmarks',
	action: function($) {
		$.callback(PREF.bookmarks);
	}
});

NEWACTION('Bookmarks|create', {
	name: 'Create a bookmark',
	route: '+API ?',
	input: '*name:String, note:String, *url:String, icon:Icon, color:Color, group:String',
	permissions: 'bookmarks',
	user: true,
	action: function($, model) {
		model.id = UID();
		model.dtcreated = NOW;
		PREF.bookmarks.push(model);
		$.success();
	}
});

NEWACTION('Bookmarks|update', {
	name: 'Update a bookmark',
	route: '+API ?',
	input: '*id:String, *name:String, note:String, *url:String, icon:Icon, color:Color, group:String',
	permissions: 'bookmarks',
	user: true,
	action: function($, model) {
		let item = PREF.bookmarks.findItem('id', model.id);
		if (item) {
			COPY(model, item);
			PREF.save();
			$.success();
		} else
			$.invalid(404);
	}
});

NEWACTION('Bookmarks|remove', {
	name: 'Remove bookmark',
	route: '+API ?',
	input: '*id',
	permissions: 'bookmarks',
	user: true,
	action: function($, model) {
		let index = PREF.bookmarks.findIndex('id', model.id);
		if (index !== -1) {
			PREF.bookmarks.splice(index, 1);
			PREF.save();
			$.success();
		} else
			$.invalid(404);
	}
});
