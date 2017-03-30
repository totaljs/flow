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
// see info tab on the right for more details
next(value);
` };

exports.readme = `# Function
Allows you to do sync operation on data

WARNING: read warning bellow examples

__Custom function__:

\`\`\`javascript
next;    	// function to call once done
value;    	//
instance; 	// ref to value.instance, available methods get, set, rem for storing temporary data related to this instance of Function component
global;   	// ref to value.global, available methods get, set, rem for storing persistent data globally accessible in any component
flowdata; 	// ref to value.flowdata, instance of FlowData - available methods get, set, rem for storing temporary data related to current flow

// Example #1:
flowdata.data = 'Hello world.';
next(value);

// Example #2:
db.insert(data).callback(function(err){
	flowdata.data = { err: err };
	next(value);
})

// WARNING!! below code will not update flowdata.data property
// flowdata.data === 'incomming data';
var data = flowdata.data;
data = 'hello world';
next(value);
// in the next component the flowdata.data will still be 'incomming data'
// always use
flowdata.data = 'hello world';
\`\`\``;

exports.html = `<div class="padding">
	<div data-jc="codemirror" data-type="javascript" data-jc-path="code" data-required="true" data-height="500px">@(Code)</div>
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
		},
		Date: Date
	};

	instance.custom.reconfigure = function(){
		// fn = new Function('value', instance.options.code);
		fn = SCRIPT('var instance = value.instance;var flowdata = value.flowdata;var Date = value.Date;var global = value.global;' + instance.options.code);
	};

	instance.on('data', function(flowdata) {
		VALUE.flowdata = flowdata;

		fn(VALUE, function(err, value) {
			if (err)
				instance.error('Error while processing function ' + err);
			else
				instance.send(value.flowdata);
		});
	});

	instance.on('options', instance.custom.reconfigure);
	instance.custom.reconfigure();
};