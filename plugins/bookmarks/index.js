exports.icon = 'ti ti-bookmark';
exports.name = '@(Bookmarks)';
exports.position = 6;
exports.permissions = [{ id: 'bookmarks', name: 'Components' }];
exports.visible = user => user.sa || user.permissions.includes('bookmarks');

exports.install = function() {

	ROUTE('+API    ?    -bookmarks                 -->    Bookmarks/list');
	ROUTE('+API    ?    +bookmarks_create          -->    Bookmarks/create');
	ROUTE('+API    ?    +bookmarks_update          -->    Bookmarks/update');
	ROUTE('+API    ?    +bookmarks_remove          -->    Bookmarks/remove');

};

ON('ready', function() {
	if (!PREF.bookmarks)
		PREF.bookmarks = [];
});