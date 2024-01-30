NEWACTION('CDN/clear', {
	name: 'Clear cdn',
	action: function($) {
		MODS.cdn.clear($.done());
	}
});