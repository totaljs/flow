exports.id = 'condition';
exports.title = 'Condition';
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.color = '#656D78';
exports.input = true;
exports.output = 1;
exports.cloning = false;
exports.options = { condition: '// Next has to contain an index for output (null/undefiend) will cancel current data\n\nnext(value > 20 ? 1 : value > 10 ? 0 : null)', output: 1 };
exports.readme = `# Condition

A condition has to return an \`index\` for re-send current data to the specific output. Return values like \`null\`, \`undefined\` or \`false\` cancels re-sending. \`true\` sends data to all outputs.`;

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-3 m">
			<div data-jc="textbox" data-jc-path="output" data-placeholder="@(Count of outputs)" data-maxlength="1" data-jc-type="number" data-increment="true" data-align="center" data-required="true" data-icon="fa-sitemap">@(Outputs)</div>
		</div>
	</div>
	<div data-jc="codemirror" data-jc-path="condition" data-height="200" data-required="true">@(Condition)</div>
	<div class="help">@(Data will continue when the condition will be validated.)</div>
</div><script>ON('save.condition', function(component, options) {
	component.output = options.output || 1;
});</script>`;

exports.install = function(instance) {

	var fn = null;

	instance.on('data', function(response) {
		fn && fn(response.data, instance.custom.response, response);
	});

	instance.custom.response = function(err, value, response) {
		if (err)
			return;
		if (value > -1)
			instance.send(value, response);
		else if (value === true)
			instance.send(response);
	};

	instance.custom.reconfigure = function() {
		try {
			instance.options.condition && (fn = SCRIPT(instance.options.condition));
		} catch(e) {
			fn = null;
		}
	};

	instance.on('options', instance.custom.reconfigure);
	instance.custom.reconfigure();
};