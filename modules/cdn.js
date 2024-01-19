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

	var filename = $.split[1];
	var key = filename;

	if (Cache[key] === 1) {
		setTimeout(cdn, 500, $);
		return;
	}

	var path = PATH.join(Directory, filename);

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
	F.Fs.readdir(Directory, function(err, files) {

		if (err) {
			callback(err);
			return;
		}

		for (var i = 0; i < files.length; i++) {
			var file = files[i];
			TOUCH('/cdn/' + file);
			files[i] = PATH.join(Directory, file);
		}

		Cache = {};
		PATH.unlink(files, () => callback(null, files.length));
	});
};