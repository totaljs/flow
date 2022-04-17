NEWSCHEMA('CDN', function(schema) {

	schema.addWorkflow('clear', function($) {
		MODULE('cdn').clear($.done());
	});

});