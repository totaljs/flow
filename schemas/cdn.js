NEWSCHEMA('CDN', function(schema) {

	schema.action('clear', {
		name: 'Clear cdn',
		action: function($) {
			MODULE('cdn').clear($.done());
		}
	});
});