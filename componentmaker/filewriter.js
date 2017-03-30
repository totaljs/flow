const Fs = require('fs');

exports.id = 'filewriter';
exports.title = 'File Writer';
exports.color = '#656D78';
exports.icon = 'fa-file-text-o';
exports.input = true;
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.options = { filename: '', append: true, delimiter: '\\n' };

exports.html = `<div class="padding">
	<div data-jc="textbox" data-jc-path="filename" data-placeholder="@(Type a filename with extension, e.g. output.txt)" data-maxlength="100">@(Filename)</div>
	<div class="help m">@(The file will be stored in the public directory. Can be accessed via HTTP e.g. <code>https://domain/filename.txt</code>)</div>
	<div class="m">
		<div data-jc="checkbox" data-jc-path="append">Append mode</div>
	</div>
	<div class="row">
		<div class="col-lg-2 col-md-3 m">
			<div data-jc="textbox" data-jc-path="delimiter" data-placeholder="@(\\n)" data-maxlength="10" data-align="center">@(Delimiter)</div>
		</div>
	</div>
</div>`;

exports.readme = `# File Writer

This component writes data into the file.`;

exports.install = function(instance) {

	var filename;
	var delimiter = '';

	instance.on('data', function(response) {
		filename && instance.custom.write(response.data);
	});

	instance.custom.write = function(data) {
		U.queue(instance.id, 1, function(next) {
			var line = data instanceof Buffer ? data : typeof(data) === 'string' ? data + delimiter : JSON.stringify(data) + delimiter;
			if (instance.options.append)
				Fs.appendFile(filename, line, next);
			else
				Fs.writeFile(filename, line, next);
			F.touch('/' + instance.options.filename);
		});
	};

	instance.custom.reconfigure = function() {
		filename = instance.options.filename ? F.path.public(instance.options.filename) : null;
		delimiter = (instance.options.delimiter || '').replace(/\\n/g, '\n');
		instance.status(filename ? instance.options.filename : 'Not configured', filename ? undefined : 'red');
		filename && Fs.mkdir(F.path.public(), NOOP);
	};

	instance.custom.reconfigure();
	instance.on('options', instance.custom.reconfigure);
};