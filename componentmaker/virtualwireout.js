exports.id = 'virtualwireout';
exports.title = 'Virtual wire out';
exports.version = '1.0.0';
exports.author = 'Martin Smola';
exports.color = '#303E4D';
exports.input = true;
exports.options = {};
exports.readme = `# Virtual wire out

When the wires between the components are mess it's time to use Virtual wire.

After creating new \`Virtual wire out\` make sure to hit Apply button, otherwise it will not appear in \`Virtual wire in\`s settings.
`;

var VIRTUAL_WIRES = [];

exports.install = function(instance) {	

	instance.custom.reconfigure = function(){
		if (!instance.name)
			return instance.status('Unique name required', 'red');

		instance.status('');
		VIRTUAL_WIRES[instance.id] = instance.name;
	};

	instance.on('data', function(flowdata) {		
		EMIT('virtualwire:' + instance.id,  flowdata);
	});

	instance.on('options', instance.custom.reconfigure);
	instance.custom.reconfigure();

	instance.on('close', function(){
		delete VIRTUAL_WIRES[instance.id];
	});

	
};

FLOW.trigger('virtualwires', function(next) {    

	var wires = [{}];

	Object.keys(VIRTUAL_WIRES).forEach(function(key){
		wires.push({id: key, name: VIRTUAL_WIRES[key]});
	});

    next(wires);
});
