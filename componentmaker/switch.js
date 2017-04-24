exports.id = 'switch';
exports.title = 'Switch';
exports.group = 'Logic';
exports.color = '#ffa824';
exports.version = '1.0.0';
exports.icon = '';
exports.input = true;
exports.output = 1;
exports.author = 'Martin Smola';
exports.options = { conditions: [ { operator: '==', datatype: 'Number', value: 1, index: 0} ] };

exports.html = `
	<style>
		.cond-col1 { width:20px; float:left; }
		.cond-col2 { width:150px; float:left; }
		.cond-col3 { width:110px; float:left; }
		.cond-col4 { width:420px; float:left; }
		.cond-col5 { width:30px; float:left; }
		.pr10 { padding-right:10px; }
		.cond-remove { padding: 8px 13px; }
	</style>
	<div class="padding">	
		<div data-jc="textbox" data-jc-path="property" data-placeholder="path.to.value">Property</div>
		<div class="help m">@(Property to use for comparison, defaults to data itself)</div>
		<section>
			<label><i class="fa fa-edit"></i>@(Conditions)</label>
			<div class="padding npb">
				<div class="row">
					<div class="col-md-12">
						<div class="cond-col1"><strong>#</strong></div>
						<div class="cond-col2"><strong>Operator</strong></div>
						<div class="cond-col3"><strong>Data-type</strong></div>
						<div class="cond-col4"><strong>Value</strong></div>
					</div>
				</div>
				<div data-jc="repeater" data-jc-path="conditions" class="mt10">
					<script type="text/html">
					<div class="row">
						<div class="col-md-12">
							<div class="cond-col1 mt5"><strong>$index</strong></div>
							<div class="cond-col2 pr10"><div data-jc="dropdown" data-jc-path="conditions[$index].operator" data-options=";>|>;<|<;>=|>=;<=|<=;==|==;!==|!==;startsWith (for strings only)|startsWith;endsWith (for strings only)|endsWith;indexOf|indexOf;Regex (for strings only)|Regex" class="m"></div></div>
							<div class="cond-col3 pr10"><div data-jc="dropdown" data-jc-path="conditions[$index].datatype" data-options=";Number;String;Boolean"></div></div>
							<div class="cond-col4 pr10"><div data-jc="textbox" data-jc-path="conditions[$index].value" data-placeholder="enter value"></div></div>
							<div class="cond-col5"><button class="exec button button-small cond-remove" data-exec="#switchcomponent_remove_condition" data-index="$index"><i class="fa fa-trash"></i></button></div>
						</div>
					</div>
					</script>
				</div>					
				<div class="row">
					<div class="col-md-2 m">
						<br>
						<button class="exec button button-small" data-exec="#switchcomponent_add_condition"><i class="fa fa-plus"></i>&nbsp;ADD</button>
					</div>
				</div>
			</div>
		</section>
	</div>
	<script>

		var changed = false;
		var outputs_count;

		ON('open.switch', function(component, options) {
			outputs_count = options.conditions.length || 0;
		});

		ON('save.switch', function(component, options) {
			var length = options.conditions.length || 0;
			if (changed && length !==  outputs_count) {
				component.connections = {};
				component.output = length;
				setState(MESSAGES.apply);
			}
		});

		OPERATION('switchcomponent_add_condition', function(){
			PUSH('settings.switch.conditions', {operator: '', datatype: '', value: ''});
			changed = true;
		});	

		OPERATION('switchcomponent_remove_condition', function(button){
			var index = button.attr('data-index');			
			var conditions = settings.switch.conditions;
			conditions = conditions.remove('index', parseInt(index));
			SET('settings.switch.conditions', conditions);
			changed = true;
		});

	</script>
`;

exports.readme = `
# Switch

- set property of the data object to be used in condition
- 

### Regex
Uses 'test' method e.g. if value is \`/he/g\` then it will be tested like this \`/he/g.test(<incoming data>)\` which returns true/false

`;

exports.install = function(instance) {

	var outputs_length;
	var config_errors = false;
	var CONDITIONS = [];
	var ERRORS = [];

	instance.on('data', function(flowdata) {
		if (config_errors)
			return;

		var data = flowdata.data;
		var conditions = instance.options.conditions;

		if (instance.options.property) {
			if (instance.options.property.indexOf('.') === -1)
				data = flowdata.data[instance.options.property];
			else
				data = U.get(flowdata.data, instance.options.property);
		}

		instance.status('Last: ' + data);

		for (var i = 0; i < outputs_length; i++) {
			if (CONDITIONS[i](data)) 
				instance.send(i, flowdata);
		}
	});

	instance.custom.reconfigure = function() {
		var options = instance.options;
		config_errors = false;
		ERRORS = [];

		if (!options.conditions.length) {
			instance.status('Not configured', 'red');
			CONDITIONS = [];
			outputs_length = 0;
			return;
		}

		instance.status('');

		outputs_length = options.conditions.length;

		options.conditions.forEach(function(item, index){
			CONDITIONS[index] = compile_fn(item);
		});

		if (ERRORS.length) {
			instance.status('See debug tab!!', 'red');
			instance.debug(ERRORS.join('\n'));
			config_errors = true;
		} 
	};	

	instance.on('options', instance.custom.reconfigure);
	instance.custom.reconfigure();

	function compile_fn(condition){

		if (condition.datatype === 'Number') {

			if (condition.operator !== '>' && condition.operator !== '<' && condition.operator !== '==' && condition.operator !== '!==' && condition.operator !== '>=' && condition.operator !== '<=') {
				ERRORS.push('Incorrect number operator: ' + condition.operator);
				return;
			}

			var c_value = U.parseFloat(condition.value);
			
			var fn = new Function('value','return value ' + condition.operator + ' ' + c_value);

			return function(value) {
				if (typeof value !== 'number') {
					value = value.parseFloat();
					if (isNaN(value)){
						instance.error('Error, input value is not a number: ' + value);
						return false;
					}
				}
				return fn(value);
			}	

		} else if (condition.datatype === 'Boolean') {
			
			var c_value = condition.value.parseBoolean();

			return function(value){
				if (typeof value !== 'boolean') {
					instance.error('Error, input value is not a number: ' + value);
					return false;
				}

				return value === c_value;
			}

		} else if (condition.datatype === 'String') {

			var c_val = condition.value;
			var c_op = condition.operator;
			var fn;

			switch(c_op) {
				case '==':
					fn = function (val){ return val === c_val; };
					break;
				case 'indexOf':
					fn = function (val){ return val.indexOf(c_val) > -1 };
					break;
				case 'startsWith':
				case 'endsWith':
					fn = function (val){ return val[c_op](c_val) };
					break;
				case 'Regex':
					var match = c_val.match(new RegExp('^/(.*?)/([gimy]*)$'));
					if (!match.length || match.length < 2) {
						ERRORS.push('Incorrect RegExp: ' + c_val);
						return;
					}
					fn = function (val){ return new RegExp(match[1], match[2]).test(val); };
					break;
			}

			return function(value){
				if (typeof value !== 'string') {
					value = '' + value;	
				}
				return fn(value);				
			}
		} else {
			ERRORS.push('Data-type `' + condition.datatype + '` not supported.');
		}
		
	};
};