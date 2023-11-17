NEWACTION('CDN/Clear', {
	name: 'Clear cdn',
	action: function($) {
		MODS.cdn.clear($.done());
	}
});