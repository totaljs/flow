exports.id = 'function';
exports.title = 'Function';
exports.group = 'Common';
exports.color = '#656D78';
exports.icon = 'code';
exports.input = true;
exports.output = 1;
exports.version = '1.0.0';
exports.author = 'Martin Smola';
exports.options = { code: `




// leave bellow code as is unless you use async operation
// in that case assign the data using following "flowdata.data=\'my new data\'"
// and call next(value); from within callback function of your async operation
next(value);
` };

exports.readme = `# Function
Allows you to do sync operation on data

__Custom function__:

\`\`\`javascript
next;     // function to call once done
value;    //
instance; // ref to value.instance, available methods get, set, rem for storing data related to this instance of Function component
global;   // ref to value.global, available methods get, set, rem for storing data globally accessible in any component
flowdata; // ref to value.flowdata, instance of FlowData - available methods get, set, rem for storing data related to current flow

// Example #1:
flowdata.data = 'Hello world.';
next(value);

// Example #2:
db.insert(data).callback(function(err){
	flowdata.data = { err: err };
	next(value);
})
\`\`\``;

exports.html = `<div class="padding">
	<div data-jc="codemirror" data-jc-path="code" data-required="true">@(Code)</div>
</div>`;

exports.install = function(instance) {

	var fn;
	var VALUE = {
		instance: {
			get: instance.get,
			set: instance.set,
			rem: instance.rem,
			error: instance.error,
			debug: instance.debug,
			status: instance.status
		},
		global: {
			get: FLOW.get,
			set: FLOW.set,
			rem: FLOW.rem
		}
	};

	instance.custom.reconfigure = function(){
		// fn = new Function('instance', 'flowdata', 'next', instance.options.code);
		fn = SCRIPT('var instance = value.instance;var flowdata = value.flowdata;' + instance.options.code);
	};

	instance.on('data', function(flowdata) {
		VALUE.flowdata = flowdata;
		fn(VALUE, function(err, value) {
			if (err)
				instance.error('Error while processing function');
			else
				instance.send(value.flowdata);
		});
	});

	instance.on('options', instance.custom.reconfigure);
	instance.custom.reconfigure();
};