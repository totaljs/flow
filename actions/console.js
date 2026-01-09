const Filename = F.isBundle ? PATH.root('../logs/debug.log') : PATH.root('logs/debug.log');

NEWACTION('Console|read', {
	name: 'Read console logs',
	route: '+API ?',
	user: true,
	action: function($) {

		// Tries to read app log
		Total.Fs.stat(Filename, function(err, stats) {
			if (stats) {
				let start = stats.size - (1024 * 4); // Max. 4 kB
				if (start < 0)
					start = 0;
				let buffer = [];
				Total.Fs.createReadStream(Filename, { start: start < 0 ? 0 : start }).on('data', chunk => buffer.push(chunk)).on('end', () => $.callback(Buffer.concat(buffer).toString('utf8')));
			} else
				$.callback('');
		});
	}
});

NEWACTION('Console|clear', {
	name: 'Clear console logs',
	route: '+API ?',
	user: true,
	action: function($) {
		Total.Fs.truncate(Filename, NOOP);
		$.success();
	}
});