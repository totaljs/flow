NEWSCHEMA('Console', function(schema) {

	var filename = F.isBundle ? PATH.root('../logs/debug.log') : PATH.root('logs/debug.log');

	schema.action('read', {
		name: 'Read app logs',
		action: function($) {

			// Tries to read app log
			F.Fs.stat(filename, function(err, stats) {
				if (stats) {
					var start = stats.size - (1024 * 4); // Max. 4 kB
					if (start < 0)
						start = 0;
					var buffer = [];
					F.Fs.createReadStream(filename, { start: start < 0 ? 0 : start }).on('data', chunk => buffer.push(chunk)).on('end', () => $.callback(Buffer.concat(buffer).toString('utf8')));
				} else
					$.callback('');
			});
		}
	});

	schema.action('clear', {
		name: 'Clear console logs',
		action: function($) {
			F.Fs.truncate(filename, NOOP);
			$.success();
		}
	});
});