exports.id = 'virtualwirein';
exports.title = 'Virtual wire in';
exports.version = '1.0.0';
exports.author = 'Martin Smola';
exports.color = '#303E4D';
exports.input = false;
exports.output = 1;
exports.options = {};
exports.readme = `# Virtual wire in

After creating \`Virtual wire out\` make sure to hit Apply button otherwise it will not appear in setting of this component.

`;

exports.html = `<div class="padding">
	<div data-jc="dropdown" data-jc-path="wire" data-source="virtualwires_source" class="m">@(Select a wire)</div>
</div>
<script>
	TRIGGER('virtualwires', 'virtualwires_source');
</script>`;

exports.install = function(instance) {	

	instance.custom.reconfigure = function(options, old_options){
		if (old_options && old_options.wire && options.wire !== old_options.wire)
			OFF('virtualwire:' + options.wire, handler);

		if (instance.options.wire) {
			ON('virtualwire:' + instance.options.wire, handler);
			instance.status('');
		} else {
			instance.status('Not configured');
		}
	};

	instance.on('options', instance.custom.reconfigure);

	instance.custom.reconfigure();

	function handler(flowdata){
		instance.send(flowdata);
	};
};