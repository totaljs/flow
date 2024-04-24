NEWACTION('Bookmarks/list', {
	name: 'List of bookmarks',
	permissions: 'bookmarks',
	action: function($) {
		$.callback(PREF.bookmarks);
	}
});

NEWACTION('Bookmarks/create', {
	name: 'create bookmark',
	input: '*name,note,*url,icon,color,group',
	permissions: 'bookmarks',
	action: function($, model) {
		model.id = UID();
		model.dtcreated = NOW;
		PREF.bookmarks.push(model);
		$.success();
	}
});


NEWACTION('Bookmarks/update', {
	name: 'Update bookmark',
	input: '*id,*name,note,*url,icon,color,group',
	permissions: 'bookmarks',
	action: function($, model) {
		var item = PREF.bookmarks.findItem('id', model.id);
		if (item) {
			COPY(model, item);
			PREF.save();
			$.success();
		} else
			$.invalid(404);
	}
});

NEWACTION('Bookmarks/remove', {
	name: 'Remove bookmark',
	input: '*id',
	permissions: 'bookmarks',
	action: function($, model) {
		var index = PREF.bookmarks.findIndex('id', model.id);
		if (index !== -1) {
			PREF.bookmarks.splice(index, 1);
			PREF.save();
			$.success();
		} else
			$.invalid(404);
	}
});
