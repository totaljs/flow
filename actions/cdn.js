NEWACTION('CDN|clear', {
	name: 'Clear CDN cache',
	route: '+API ?',
	user: true,
	action: function($) {
		MODS.cdn.clear($.done());
	}
});