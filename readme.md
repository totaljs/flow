# Total.js Flow

[![Support](https://www.totaljs.com/img/button-support.png?v=2)](https://www.totaljs.com/support/)

__Total.js Flow 4.1.0__ is a visual programming interface. It's available as a package and can be added to any applications based on __Total.js framework__. Flow can be used to add missing or changing already implemented functionality to already existing applications without having to write any code as well as creating new applications. It can be used for connecting *Internet of Things*, home automation, etc.

Flow comes pre-installed with components such as:
- `HTTP route` for creating web endpoints
- `WebSockets` for real-time communication
- `MQTT` for connecting IoT devices
- `Template` for formating the output
- `Email` and `SMS` sender for sending emails and text messages
- `NoSQL` for saving and retrieving data (uses Total.js embedded nosql db engine)
- `Analitycs` for analyzing tha data
- __And many more to come__

If You miss some specific component You can always write it by yourself :)

__Terminology__:
- `Component` is a single unit which recieves data, processes them and responds with the result
- `Flow` is a series of components connected together
- `FlowData` is an instance of data recieved by component, see `data` event in component instance
- `Designer` is a user interface available at `/$flow` (can be changed in config)

## Installation

- Total.js `+v2.9.2`
- download and copy `flow.package` into the `/packages/` directory __or create a definition file with:__

```javascript
var options = {};

// ====================================
// COMMON (OPTIONAL)
// ====================================

// options.url = '/$flow/';

// A maximum length of request:
// options.limit = 50;

// Predefined set of components (default value):
// options.templates = 'https://raw.githubusercontent.com/totaljs/flowcomponents/v4.0.0/templates.json';

// +v4.0.2 Second user-defined set of components (default value is !!! EMPTY !!!):
// It must have same structure as "options.template", example:
// options.templates2 = 'https://raw.githubusercontent.com/totaljs/flowcomponents/v4.0.0/templates.json';

// +v4.0.0
// Default light theme
// options.dark = false;

// ====================================
// Security (OPTIONAL)
// ====================================

// HTTP Basic auth:
// options.auth = ['admin:admin', 'name:password'];

// Standard "authorize" flag
// options.auth = true;

// IP restrictions:
// options.restrictions = ['127.0.0.1', '138.201', '172.31.33'];

// options.token = ['OUR_COMPANY_TOKEN'];
// you can open flow using : /$flow/?token=OUR_COMPANY_TOKEN

INSTALL('package', 'https://cdn.totaljs.com/flow.package', options);
```

- __IMPORTANT__: it doesn't support `UPTODATE` mechanism

## Flow

- `FLOW` is a global variable
- URL address `http://127.0.0.1:8000/$flow/` (default, can be changed in config)

__Properties__:

```javascript
FLOW.variables;
// Returns all custom variables defined by user key/value
// returns {Object}
// +v3.0.0
```

__Methods__:

```javascript
FLOW.emit2('hello', 'arg1', 'arg..N');
// Emits event to all component instances

FLOW.emit('hello', 'arg1', 'arg..N');
// Emits event in main Flow instance

FLOW.send(message);
// Sends a message to designer via WebSocket

FLOW.debug(data, style, [group]);
// Sends a debug message
// message: {String/Object} - string will be formatted as markdown and object as JSON
// style: {String} - "info", "warning", "error" (default: "info")
// group: {String} (optional) - +v4.0.0

FLOW.set(key, value);
// Writes a value into the key-value store (data are stored on HDD)

FLOW.get(key);
// Reads a value from the key-value store (data are stored on HDD)

FLOW.rem(key);
// Removes value from the key-value store (data are stored on HDD)

FLOW.find(function(instance, definition){
    // return true if this instance satisfies your search criteria
});
// Finds instances
// returns {Array of Components}

FLOW.findByReference('STRING');
FLOW.findByReference(REGULAR_EXPRESSION);
// Finds all instances by reference
// returns {Array of Components}

FLOW.findByName('STRING');
FLOW.findByName(REGULAR_EXPRESSION);
// Finds all instances by name
// returns {Array of Components}

FLOW.findByComponent('STRING');
FLOW.findByComponent(REGULAR_EXPRESSION);
// Finds all instances by component name
// returns {Array of Components}

FLOW.findById('ID');
// Finds an instance by its ID
// returns {Component}

FLOW.hasComponent(name);
// Does have a flow registered component?
// returns {Boolean}

FLOW.hasInstance(id);
// Does have a flow registered instance?
// returns {Boolean}

FLOW.install(url, [callback]);
FLOW.install(filename, body, [callback]);
// Registers a new component and stores its content into the `/flow/` directory
// returns {FLOW}

FLOW.variable(key);
// Returns a value of variable by key
// return {Object}
// +v3.0.0
```

__Events__:

```javascript
ON('flow.register', function(declaration) {
    // New component has been registered
});

ON('flow.init', function(count) {
    // Init FLOW system
    // "count" a count of all new instances
});

ON('flow.reset', function(count) {
    // Components have been reset
});

ON('flow.open', function(instance) {
    // New instance of a component has been created
});

ON('flow.save', function(instance) {
    // Flow is saved/applied
    // +v1.2.0
});

ON('flow.close', function(instance) {
    // A component instance will be closed
});

ON('flow.options', function(instance) {
    // A component instance has changed options
    // +v3.0.0
});

ON('flow.variables', function(variables) {
    // Changed flow variables
    // +v3.0.0
});
```

## Component

- __IMPORTANT__: `exports.id` can contain `a-z` `0-9` chars only.

```javascript
// {String}, IMPORTANT (lower case without diacritics)
exports.id = 'component';

// {String}, optional (default: "component name")
exports.title = 'A component name (for human)';

// {String}, optional (default: "#656D78")
exports.color = '#656D78'; // use darker colors because the font color is "white"

// {Boolean}, optional (default: false)
exports.click = true;

// {Number}, optional (default: 0)
// +v3.0.0
exports.input = 0;

// or {Array of Colors}, input will have 2 inputs (red and blue)
// +v3.0.0
exports.input = ['red', 'blue'];

// {Number}, optional (default: 0)
exports.output = 1;

// or {Array of Colors}, output will have 2 outputs (red and blue)
exports.output = ['red', 'blue'];

// {String}, optional (default: "Common")
exports.group = 'Common';

// {String}, optional (default: "Unknown")
exports.author = 'Peter Širka';

// {String}, optional (default: "")
// Font-Awesome icon without "fa-"
exports.icon = 'home';

// {String or Object}, optional (default: undefined)
exports.status = 'DEFAULT STATUS TEXT';
// or
exports.status = { text: 'DEFAULT STATUS TEXT', color: 'red' };

// {String Array}
// optional (default: undefined), NPM dependencies
exports.npm = ['sqlagent', 'mqtt'];

// {Object}, optional (default "undefined")
// Default options for new and existing instances
exports.options = { enabled: true };

// Disables data cloning
exports.cloning = false;

// {Boolean}, optional (default: true)
// +v4.0.0
// hides stats under component box in designer UI
exports.traffic = false;

// {String}, optional (format: 'yyyy-MM-dd HH:mm')
// +v4.0.0
// Updated date
exports.dateupdated = '2017-17-10';

exports.install = function(component) {

    // =====================
    // DELEGATES
    // =====================

    // A close delegate (optional)
    // - "callback" argument must be executed!
    component.close = function(callback) {
        // This instance will be killed.
        // use this if some asyncronous work needs to be done
        // alternatively use component.on('close',...
    };


    // =====================
    // EVENTS
    // =====================

    component.on('click', function() {
        // optional
        // the component was clicked on in the designer
        // usefull for enabling/disabling some behavior or triggering some actions
    });

    component.on('data', function(message) {

        // RAW DATA
        // returns {Object}
        message.data;

        // Write value to data repository
        // returns {Message}
        message.set('key', 'value');

        // Read value from data repository
        // returns {Object}
        message.get('key');

        // Remove value from data repository
        // returns {Message}
        message.rem('key');

        // {Object Array} Array of all components the message has passed through (previous components)
        message.tracking;

        // {Object} Parent component (first component which started the flow)
        message.parent;

        // {Boolean} Is completed?
        message.completed;

        // {DateTime}
        message.begin;

        // How can I modify data?
        message.data = { newdata: true };

        // +v4.0.2
        // Replaces {KEY1} {KEY2} {KEY..N} according to the message repository
        // returns {String}
        message.arg('Dynamic arguments {name} according to {message} repository.');

        // send this message :-)
        component.send(message);

    });

    component.on('<input-number>', function(message) {
        // message as specified above in 'data' event
        // input 0 to event '0' and so on
    });

    component.on('options', function(new_options, old_options) {
        // optional
        // options have changed in the designer
        // instance.options holds the new_options already
    });

    component.on('variables', function(variables) {
        // +v3.0.0
        // optional
        // global variables have been changed
        // instance.variable(key)
    });

    component.on('close', function() {
        // optional
        // This instance will be killed
    });

    component.on('reinit', function() {
        // optional
        // Designer has been updated, but this instance still persists
        // This instance can have new connections.
    });

    component.on('signal', function(data, parent) {
        // optional
        // Captured signal
        // @data {Object} - optional, can be "null", or "undefined"
        // @parent {Component} - a component which created this signal
    });

    component.on('service', function(counter) {
        // optional
        // Service called each 1 minute
    });

    // =====================
    // METHODS
    // =====================

    component.status(message, [color]);
    // Sends a status to designer
    // @message: {String/Object} - string will be formatted as markdown and object as JSON
    // color: {String} - "black" (default: "gray")

    component.debug(message, [style]);
    // Sends a debug message
    // @message: {String/Object} - string will be formatted as markdown and object as JSON
    // style: {String} - "info", "warning", "error" (default: "info")

    component.hasConnection(index);
    // Calculates connections
    // @index: {Number}
    // returns {Number}

    var message = component.send([index], data);
    message.set('repositorykey', 'value');
    console.log(message.get('repositorykey'));
    // Sends data
    // @index: {Number} - optional, the output index (otherwise all outputs)
    // @data: {String/Object}
    // returns Message;

    var message = component.send2([index], data);
    if (message) {
        // message will be sent
    } else {
        // no connections
    }
    // +v3.0.0
    // Alias for component.send() but with a check of connections

    component.set(key, value);
    // Writes a value to a private key-value store (data are stored on HDD)
    // @key {String}
    // @value {Object}
    // returns {Component}

    component.get(key);
    // Reads a value from a private key-value store (data are stored on HDD)
    // @key {String}
    // returns {Object}

    component.make(data);
    // Creates a new FlowData/Message instance.
    // @data {Object}
    // returns {Message}

    component.rem(key);
    // Removes a value from a private key-value store (data are stored on HDD)
    // @key {String}
    // returns {Component}

    component.variable(key);
    // +v3.0.0
    // Reads a value from global variables
    // @key {String}
    // returns {Object}

    component.signal([index], [data]);
    // Sends a signal to first connection (it emits "signal" event in target connection)
    // @index {Number} - optional, an output index (default: "undefined" --> all connections)
    // @data {Object} - optional, an additional data
    // returns {Component}

    component.click();
    // Performs click event.
    // returns {Component}

    component.log([a], [b], [c], [d]);
    // Writes some info into the log file
    // returns {Component}

    component.error(err, [parent|response|component]);
    // Creates error
    // returns {Component}

    component.save();
    // Saves current options, useful when options are changed internally. Options from settings form are saved automatically
    // returns {Component}

    component.reconfig();
    // If the component options changes on the server (not by recieving new options from designer) then use this to update options in designer

    // =====================
    // PROPERTIES
    // =====================

    component.custom;
    // {Object} - empty object for custom variables and methods

    component.name;
    // {String} - readonly, a component name (USER-DEFINED)

    component.reference;
    // {String} - readonly, a component reference (USER-DEFINED)

    component.options;
    // {Object} - readonly, custom settings

    component.state;
    // {Object} - readonly, latest state

    component.connections;
    // {Object} - readonly, all connections
};

exports.uninstall = function() {
    // OPTIONAL
};
```

## Message

When is the message instance created?

```javascript
// FIRST CASE:
component.on('data', function(message) {
    // Properties:
    message.id;               // {Number} A message identificator
    message.index;            // {Number} An input number
    message.begin;            // {Date} when it started
    message.data;             // {Anything} user defined data
    message.completed;        // {Boolean} is sending completed?
    message.tracking;         // {Array of Instances} all instances in order which they modified data
    message.parent;           // {Component} a parent instance

    // Methods (private message repository):
    message.set(key, value);  // Sets a key-value to message repository (doesn't modify data)
    message.get(key);         // Gets a key-value (doesn't read data from "data")
    message.rem(key);         // Removes a key-value (doesn't read data from "data")
    message.rewrite(data);    // Rewrites the current with new
});

// SECOND CASE
var message = component.send('YOUR-DATA-TO-CHILD-CONNECTIONS');
```

## Multiple inputs

```javascript
// data from all inputs go to 'data' event
component.on('data', function(message) {
    // message as specified above
    message.index; // Input number
});

// data from specific input go also to the corresponding event -> input 0 to event '0'
component.on('0', function(message) {
    // message as specified above
});
```

---

## Client-Side

### Events

```javascript
ON('open.componentname', function(component, options) {
    // Settings will be open
});

ON('save.componentname', function(component, options) {
    // Settings will be save
});

ON('select.componentname', function(component) {
    // A component has been selected in designer.
});

ON('click.componentname', function(component) {
    // Performed "click"
});

ON('add.componentname', function(component) {
    // A component has been added.
});

ON('rem.componentname', function(component) {
    // A component has been removed.
});

ON('apply', function() {
    // Designer will be sent to server and then will be applied
});
```

### Good to know

__How to change count of outputs/inputs dynamically?__

`v3.0.0` This is possible on client-side only.

```javascript
ON('save.componentname', function(component, options) {

    component.output = 5;
    // component.input = 3;

    // or
    component.output = ['green', 'red', 'blue'];
    // component.input = ['green', 'red', 'blue'];

    // or set output to default
    component.output = null;
    // component.input = null;
});
```

### Components: jComponent +v11.0.0

Bellow jComponents can be used in `Settings form`:

- autocomplete (declared `body`)
- binder (declared in `body`)
- calendar (declared in `body`)
- checkbox
- checkboxlist
- codemirror
- colorpicker (declared in `body`)
- confirm (declared in `body`)
- contextmenu (declared in `body`)
- dropdown
- dropdowncheckbox
- error
- exec (declared in `body`)
- form
- importer
- keyvalue
- loading
- message (declared in `body`)
- nosqlcounter
- repeater
- repeater-group
- search
- selectbox
- textbox
- textboxlist
- validation
- visible
- multioptions
- dragdropfiles
- filereader

__References:__

- [Componentator.com](https://componentator.com/)
- [jComponents on Github](https://github.com/totaljs/jComponent)

### Triggers

- trigger executes a trigger on the server-side which can return some data

__Server-side__:

```javascript
// Register trigger
FLOW.trigger('name', function(next, data) {
    // Data sent from client-side
    console.log(data);

    // Sends back some data
    next([1, 2, 3, 4]);
});

// Unregister trigger
FLOW.trigger('name', null);
```

__Client-side__:

```javascript
// TRIGGER(trigger_name, [data], callback(data))

// Call the trigger
TRIGGER('name', function(data) {
    console.log(data); // outputs [1, 2, 3, 4]
});

TRIGGER('name', 'path.to.bind.response'); // window.path.to.bind.response === [1, 2, 3, 4]
```

## Contribute

This project is stored in private repository on GitHub. Contact me <petersirka@gmail.com> if you want be a contributor.