exports.id = 'parser';
exports.title = 'Data Parser';
exports.group = 'Parsers';
exports.color = '#37BC9B';
exports.input = true;
exports.output = 1;
exports.author = 'Peter Širka';
exports.icon = 'code';

exports.html = `<div class="padding">
	<div data-jc="dropdown" data-jc-path="parser" class="m" data-options=";Begin/End parser|beginend;Newline parser|newline" data-required="true">@(Parser type)</div>
</div>
<div data-jc="visible" data-jc-path="parser" data-if="value === 'beginend'">
	<section>
		<label><i class="fa fa-code"></i>@(Advanced settings)</label>
		<div data-jc="disable" data-jc-path="parser" data-if="value !== 'beginend'" data-validate="begin,end" class="padding">
			<div class="row">
				<div class="col-md-6 m">
					<div data-jc="textbox" data-jc-path="begin" data-required="true" data-placeholder="e.g. <@(PRODUCT)>">@(Begin phrase)</div>
				</div>
				<div class="col-md-6 m">
					<div data-jc="textbox" data-jc-path="end" data-required="true" data-placeholder="e.g. </@(PRODUCT)>">@(End phrase)</div>
				</div>
			</div>
		</div>
	</section>
</div>`;

exports.readme = `# XML/Newline parser (CSV) parser

- expects \`Buffer\``;

exports.install = function(instance) {
	var streamer;
	instance.on('data', response => streamer && streamer(response.data));
	instance.reconfigure = function() {
		var options = instance.options;
		switch (options.parser) {
			case 'beginend':
				streamer = U.streamer(options.begin, options.end, (data) => instance.send(data));
				break;
			case 'newline':
				streamer = U.streamer('\n', (data) => instance.send(data));
				break;
			default:
				streamer = null;
				break;
		}
	};
	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};