// TEST INTERFACE FOR TOTAL.JS FLOW COMPONENT
require('total.js');
require('./flow');
FLOWINIT(require('./' + U.getName(process.argv[1].replace(/\-run\.js$/, ''))));

// `assert` is a global variable

// ====================
// GLOBAL METHODS
// ====================

// FLOWDATA(data)              - sends data to component
// FLOWCLICK()                 - performs click event
// FLOWSIGNAL([data])          - sends signal to component
// FLOWEMIT(event, [data])     - emits an event
// FLOWOPTIONS(options)        - simulates a change of options
// FLOWCLOSE([callback])       - simulates closing
// FLOWTRIGGER(name, [data])   - simulates trigger
// FLOWDEBUG(true/false)       - enables internal output from console (default: true)
// FLOWUNINSTALL()             - uninstalls component
// FLOWINSTANCE                - a component instance

// ====================
// EVENTS FOR UNIT-TEST
// ====================

// ON('flow.ready')                    - triggered when the flow system is ready
// ON('flow.data', fn(data))           - triggered when FLOWDATA() is executed
// ON('flow.send', fn(index, data))    - triggered when the component performs `component.send()`
// ON('flow.options', fn(options))     - triggered when FLOWPTIONS() is executed
// ON('flow.signal', fn(index, data))  - triggered when FLOWSIGNAL() is executed
// ON('flow.status', fn(text, style))  - triggered when the component performs `component.status()`
// ON('flow.debug', fn(data, style))   - triggered when the component performs `component.debug()`
// ON('flow.close')                    - triggered when the component is closed

ON('flow.ready', function() {
	FLOWOPTIONS({ fn: 'next({ value: value.value, group: value.group });', type: 'sum', format: '{0}x', decimals: 0 });
	setTimeout(function() {
		FLOWDATA({ value: 2, group: 'Audi' });
		FLOWDATA({ value: 5, group: 'BMW' });
		FLOWEMIT('service', 1);
		FLOWDATA({ value: 5, group: 'Audi' });
		FLOWDATA({ value: 9, group: 'VW' });
		FLOWDATA({ value: 1, group: 'BMW' });
		FLOWEMIT('service', 2);
		FLOWDATA({ value: 1, group: 'Audi' });
		FLOWDATA({ value: 3, group: 'VW' });
		FLOWDATA({ value: 5, group: 'BMW' });
		FLOWEMIT('service', 3);
		FLOWDATA({ value: 2, group: 'VW' });
		FLOWDATA({ value: 5, group: 'Audi' });
		FLOWDATA({ value: 8, group: 'BMW' });
		// console.log(FLOWINSTANCE.custom.current());
	}, 1000);
});
