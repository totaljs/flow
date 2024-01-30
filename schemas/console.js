const Filename = F.isBundle ? PATH.root('../logs/debug.log') : PATH.root('logs/debug.log');

NEWACTION('Console/read', {
	name: 'Read app logs',
	action: function($) {

		// Tries to read app log
		F.Fs.stat(Filename, function(err, stats) {
			if (stats) {
				var start = stats.size - (1024 * 4); // Max. 4 kB
				if (start < 0)
					start = 0;
				var buffer = [];
				F.Fs.createReadStream(Filename, { start: start < 0 ? 0 : start }).on('data', chunk => buffer.push(chunk)).on('end', () => $.callback(Buffer.concat(buffer).toString('utf8')));
			} else
				$.callback('');
		});
	}
});

NEWACTION('Console/clear', {
	name: 'Clear console logs',
	action: function($) {
		F.Fs.truncate(Filename, NOOP);
		$.success();
	}
});