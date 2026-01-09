// CDN downloader
// The MIT License
// Copyright 2022 (c) Peter Širka <petersirka@gmail.com>

var Cache = {};
var Directory;

exports.install = function() {
	Directory = PATH.public('cdn');
	PATH.mkdir(Directory);
	ROUTE('FILE /cdn/*.html', cdn);
};

function cdn($) {

	let filename = $.split[1];
	let key = filename;

	if (Cache[key] === 1) {
		setTimeout(cdn, 500, $);
		return;
	}

	let path = PATH.join(Directory, filename);

	if (Cache[key] === 2) {
		$.file(path);
		return;
	}

	Cache[key] = 1;
	PATH.exists(path ,function(err, response) {
		if (response) {
			Cache[key] = 2;
			$.file(path);
		} else {
			// Download
			DOWNLOAD('https://cdn.componentator.com/' + filename, path, function() {
				Cache[key] = 2;
				$.file(path);
			});
		}
	});
}

exports.clear = function(callback) {
	Total.Fs.readdir(Directory, function(err, files) {

		if (err) {
			callback(err);
			return;
		}

		let rem = [];

		for (let i = 0; i < files.length; i++) {
			let file = files[i];
			if (file.endsWith('.html')) {
				TOUCH('/cdn/' + file);
				rem.push(PATH.join(Directory, file));
			}
		}

		Cache = {};
		if (rem.length)
			PATH.unlink(rem, () => callback(rem.length));
		else
			$.callback(0);
	});
};