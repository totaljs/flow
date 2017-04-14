exports.id = 'function';
exports.title = 'Function';
exports.group = 'Common';
exports.color = '#656D78';
exports.icon = 'code';
exports.input = true;
exports.output = 1;
exports.version = '1.0.0';
exports.author = 'Martin Smola';
exports.options = { 
	outputs: 1,
	code: `send('Hello world!');`};

exports.readme = `# Function
Allows you to do sync operation on data

If \`send\` function isn't called the data flow will not continue.

__Custom function__:

\`\`\`javascript
value;    	// 
send;    	// send data to next component, optionaly specify output index -> send(0, data);
instance; 	// ref to value.instance, available methods get, set, rem for storing temporary data related to this instance of Function component and  debug, status and error for sending data to designer
global;   	// ref to value.global, available methods get, set, rem for storing persistent data globally accessible in any component
flowdata; 	// ref to value.flowdata, instance of FlowData - available methods get, set, rem for storing temporary data related to current flow
Date;		// 

// Example #1:
send('Hello world.'); // sends data to all outputs
send(0, 'Hello world.'); // sends data only to first output
\`\`\``;

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-3">
			<div data-jc="textbox" data-jc-type="number" data-jc-path="outputs" data-validate="value > 0" data-increment="true" data-maxlength="3">Number of outputs</div>
			<div class="help m">@(Minimum is 1)</div>
		</div>
	</div>
	<div data-jc="codemirror" data-type="javascript" data-jc-path="code" data-required="true" data-height="500px">@(Code)</div>
</div>
<script>
	var function_outputs_count;

	ON('open.function', function(component, options) {
		function_outputs_count = options.outputs = options.outputs || 1;
	});
	
	ON('save.function', function(component, options) {
		if (function_outputs_count !== options.outputs) {
			component.connections = {};
			component.output = options.outputs || 1;
			setState(MESSAGES.apply);
		}
	});
</script>`;

exports.install = function(instance) {

	var fn;
	var VALUE = {
		instance: {
			get: instance.get.bind(instance),
			set: instance.set.bind(instance),
			rem: instance.rem.bind(instance),
			error: instance.error.bind(instance),
			debug: instance.debug.bind(instance),
			status: instance.status.bind(instance),
			send: function(flowdata, index, data){

				if (data instanceof Array) {
					for (let i = 0, length = data.length; i < length; i++){
						flowdata.data = data[i];
						instance.send(i, flowdata);
					}
				} else {
					flowdata.data = data;
					instance.send(index, flowdata);
				}
			}
		},
		global: {
			get: FLOW.get,
			set: FLOW.set,
			rem: FLOW.rem
		},
		Date: Date,
		Object: Object
	};

	instance.custom.reconfigure = function(){
		// fn = new Function('value', instance.options.code);
		fn = SCRIPT(`
			var instance = value.instance;
			var flowdata = value.flowdata;
			var Date = value.Date;
			var Object = value.Object;
			var global = value.global;
			var send = function(index, data){
				if (!data){
					data = index;
					index = 0;
				} 
				value.instance.send(value.flowdata, index || undefined, data);
			}

			${instance.options.code}

			next(value);
		`);
	};

	instance.on('data', function(flowdata) {
		VALUE.flowdata = flowdata;

		fn(VALUE, function(err, value) {
			if (err)
				return instance.error('Error while processing function ' + err);

			//instance.send(value.flowdata);
		});
	});

	instance.on('options', instance.custom.reconfigure);
	instance.custom.reconfigure();
};