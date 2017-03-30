exports.id = 'template';
exports.title = 'Template';
exports.group = 'Parsers';
exports.color = '#37BC9B';
exports.input = true;
exports.output = 1;
exports.author = 'Peter Širka';
exports.icon = 'code';
exports.options = { template: '<h1>Hello @{model.firstname}</h1>' };

exports.html = `<div class="padding">
	<div data-jc="codemirror" data-jc-path="template" data-required="true">@(Template)</div>
</div>`;

exports.readme = `# Template

Template can create formatted string. It uses Total.js View engine. Data have to be JavaScript Object.

- __Response__ is always \`String\``;

exports.install = function(instance) {

	var can = false;

	instance.on('data', function(response) {
		if (can) {
			try {
				response.data = F.viewCompile('@{nocompress all}\n' + instance.options.template, response.data, '', response.parent);
				instance.send(response);
			} catch (e) {}
		}
	});

	instance.reconfigure = function() {
		can = instance.options.template ? true : false;
		instance.status(can ? '' : 'Not configured', can ? undefined : 'red');
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};