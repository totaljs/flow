# Total.js Flow

__Total.js Flow__ is a visual programming interface. It's available as a package and can be added to any applications based on __Total.js framework__.
Flow can be used to add missing or changing already implemented functionality to already existing applications without having to write any code as well as creating new applications.
It can be used for connecting *Internet of Things*, home automation, etc.

Flow comes pre-installed with components such as:
- `HTTP route` for creating web endpoints
- `WebSockets` for real-time communication
- `MQTT` for connecting IoT devices
- `Template` for formating the output
- `Email` and `SMS` sender for sending emails and text messages
- Logic components such as:
    - `Switch` for controlling the flow of the data
    - `Range` for converting incomming data to certain range, e.g. 0-1023 -> 0-100%
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

- Total.js `+v2.5.0`
- download and copy `flow.package` into the `/packages/` directory __or create a definition file with:__

```javascript
var options = {};

// ====================================
// COMMON (OPTIONAL)
// ====================================

// options.url = '/$flow/';

// A maximum length of request:
// options.limit = 50;

// ====================================
// Security (OPTIONAL)
// ====================================

// HTTP Basic auth:
// options.auth = ['admin:admin', 'name:password'];

// IP restrictions:
// options.restrictions = ['127.0.0.1', '138.201', '172.31.33'];

// options.token = ['OUR_COMPANY_TOKEN'];
// you can open flow using : /$flow/?token=OUR_COMPANY_TOKEN

INSTALL('package', 'https://cdn.totaljs.com/2017xc9db052e/flow.package', options);
```

- __IMPORTANT__: it doesn't support `UPTODATE` mechanism

## Flow

- `FLOW` is a global variable
- URL address `http://127.0.0.1:8000/$flow/` (default, can be changed in config)

__Methods__:

```javascript
FLOW.emit('hello', 'arg1', 'arg..N');
// Emits event to all component instances

FLOW.send(message);
// Sends a message to designer via WebSocket

FLOW.debug(data, style);
// Sends a debug message
// message: {String/Object} - string will be formatted as markdown and object as JSON
// style: {String} - "info", "warning", "error" (default: "info")

FLOW.set(key, value);
// Writes a value into the key-value store (data are stored on HDD)

FLOW.get(key);
// Reads a value from the key-value store (data are stored on HDD)

FLOW.rem(key);
// Removes value from the key-value store (data are stored on HDD)

FLOW.findByReference('reference');
// Finds all instances by reference
// returns {Array of Components}

FLOW.findByName('name');
// Finds all instances by name
// returns {Array of Components}

FLOW.findByComponent('name');
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

ON('flow.close', function(instance) {
    // A component instance will be closed
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

// {Boolean}, optional (default: true)
exports.input = true;

// {Number}, optional (default: 0)
exports.output = 1;

// {Array of Colors}, output will have 2 outputs (red and blue)
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

    component.on('data', function(response) {

        // RAW DATA
        // returns {Object}
        response.data;

        // Write value to data repository
        // returns {Message}
        response.set('key', 'value');

        // Read value from data repository
        // returns {Object}
        response.get('key');

        // Remove value from data repository
        // returns {Message}
        response.rem('key');

        // {Object Array} Array of all components the message has passed through (previous components)
        response.tracking;

        // {Object} Parent component (first component which started the flow)
        response.parent;

        // {Boolean} Is completed?
        response.completed;

        // {DateTime}
        response.begin;

        // How can I modify data?
        response.data = { newdata: true };

        // send this response :-)
        component.send(response);
    });

    component.on('options', function(new_options, old_options) {
        // optional
        // options have changed in the designer
        // self.options holds the new_options already
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
  
    component.set(key, value);
    // Writes a value to a private key-value store (data are stored on HDD)
    // @key {String}
    // @value {Object}
    // returns {Component}

    component.get(key);
    // Reads a value from a private key-value store (data are stored on HDD)
    // @key {String}
    // returns {Object}

    component.rem(key);
    // Removes a value from a private key-value store (data are stored on HDD)
    // @key {String}
    // returns {Component}

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

When the message instance is created?

```javascript
// FIRST CASE:
instance.on('data', function(message) {
    // Properties:
    message.begin;            // {Date} when it started
    message.data;             // {Object} raw data (you can modify it)
    message.completed;        // {Boolean} is sending completed?
    message.tracking;         // {Array of Instances} all instances in order which they modified data
    message.parent;           // {Component} a parent instance

    // Methods (private message repository):
    message.set(key, value);  // Sets a key-value to message repository (doesn't modify data)
    message.get(key);         // Gets a key-value (doesn't read data from "data")
    message.rem(key);        // Removes a key-value (doesn't read data from "data")
});

// SECOND CASE
var message = instance.send('YOUR-DATA-TO-CHILD-CONNECTIONS');
```


---

## Client-Side

### Events

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

### Good to know

__How to change count of outputs dynamically?__

This is possible on client-side only.

```javascript
ON('save.componentname', function(component, options) {
    component.output = 5;

    // or
    component.output = ['green', 'red', 'blue'];

    // or set output to default
    component.output = null;
});
```

### Components: jComponent

Bellow jComponents can be used in `Settings form`

- autocomplete (declared `body`)
- binder (declared in `body`)
- calendar (declared `body`)
- checkbox
- checkboxlist
- codemirror
- confirm (declared `body`)
- contextmenu (declared `body`)
- dropdown
- dropdowncheckbox
- error
- exec (declared in `body`)
- form
- importer
- keyvalue
- loading
- message (declared `body`)
- repeater
- repeater-group
- search
- selectbox
- textbox
- textboxlist
- validation
- visible
- nosqlcounter

Reference:

- (Componentator.com)[https://componentator.com/]
- (jComponents on Github)[https://github.com/totaljs/jComponent]

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
