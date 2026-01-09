// Important: Do not remove this file
// This script loads 3rd-party extensions into each FlowStream

exports.install = function(instance) {

	REPO.extensions = [];

	// It loads all HTML files in the extensions directory
	let path = Total.path.root('extensions');

	Total.Fs.readdir(path, async function(err, response) {

		if (err)
			return;

		for (let file of response) {

			if (!file.endsWith('.html'))
				continue;

			let body = await Total.readfile(PATH.join(path, file), 'utf8');
			let index = body.indexOf('<script total>');
			let total = null;

			if (index !== -1) {
				total = body.substring(index, body.indexOf('</script>', index + 14) + 9);
				body = body.replace(total, '').trim();
				total = total.substring(14, total.length - 9).trim();
			}

			let name = file.replace(/\.html$/i, '');

			if (total)
				(new Function('exports', total))({ id: name, name: name, flow: instance });

			if (body)
				REPO.extensions.push({ id: name, html: body });

		}

	});

	// A global action that returns UI customization
	NEWACTION('Extensions', {
		action: function($) {
			$.callback(REPO.extensions);
		}
	});

};