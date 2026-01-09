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