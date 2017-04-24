exports.id = 'nosql';
exports.title = 'NoSQL';
exports.version = '1.0.0';
exports.group = 'Databases';
exports.author = 'Martin Smola';
exports.color = '#D770AD';
exports.input = true;
exports.output = 1;
exports.options = {  };
exports.readme = `# NoSQL

## Collection
if the collection field is left empty, then we try to look at \`flowdata.get('collection')\`, to set this value you need to use \`flowdata.set('collection', '<collection-name>')\` in previous component (currently only \`function\` can be used)

## Insert
- will insert recieved data into DB
- expects data to be an Object

## Read
- will read a document from DB
- expects data to be an Object with an \`id\` property

## Update
- will update document by id
- expects data to be an Object with \`id\` and all the props to be updated

## Remove
- will remove document by id
- expects data to be an Object with an \`id\` property

## Query
- will query DB
- expects data to be an Array as shown bellow

\`\`\`javascript
[
 ['where', 'sensor', 'temp'], // builder.where('sensor', 'temp');
 ['limit', 2]                 // builder.limit(2);
]
\`\`\`
`;

exports.html = `
	<div class="padding">
		<div data-jc="textbox" data-jc-path="collection" class="m mt10">DB collection name</div>
		<div data-jc="dropdown" data-jc-path="method" data-required="true" data-options="insert;update;read;query;remove" class="m">@(Method)</div>
		<div data-jc="visible" data-jc-path="method" data-if="value === 'insert'">
			<div data-jc="checkbox" data-jc-path="addid">Add unique ID to data before insert</div>
		</div>
	</div>
`;

exports.install = function(instance) {

	instance.on('data', function(flowdata) {

		var options = instance.options;
		var nosql = NOSQL(options.collection || flowdata.get('collection'));

		if (options.method === 'read') {

			if (!flowdata.data.id)
				instance.error('[DB] Cannot get record by id: `undefined`');

			nosql.find().make(function(builder) {
				builder.where('id', flowdata.data.id);
				builder.callback(function(err, response) {
					if (err) {
						instance.error(err);
					}

					flowdata.data = response;
					instance.send(flowdata);
				});
			});

		} else if (options.method === 'insert') {

			options.addid && (flowdata.data.id = UID());
			nosql.insert(flowdata.data).callback(function(err) {
				if (err) {
					instance.error(err);
				}
				instance.send(flowdata);
			});

		} else if (options.method === 'query') {

			var query = flowdata.data;

			nosql.find().make(function(builder) {

				query.forEach(function(q){
					var m = q[0];
					var args = q.splice(1);
					builder[m].apply(builder, args);
				});

				builder.callback(function(err, response) {
					if (err) {
						instance.error(err);
					}

					flowdata.data = response || [];
					instance.send(flowdata);
				});
			});

		} else if (options.method === 'update') {

			if (!flowdata.data.id) {
				instance.send(flowdata);
				return instance.error('[DB] Cannot update record by id: `undefined`');
			}

			nosql.modify(flowdata.data).make(function(builder) {
				builder.where('id', flowdata.data.id);
				builder.callback(function(err, count) {
					if (err) {
						instance.error(err);
					}

					flowdata.data = count || 0;
					instance.send(flowdata);
				});
			});

		} else if (options.method === 'remove') {

			if (!flowdata.data.id) {
				instance.send(flowdata);
				return instance.error('[DB] Cannot remove record by id: `undefined`');
			}

			nosql.remove().make(function(builder) {
				builder.where('id', flowdata.data.id);
				builder.callback(function(err, count) {
					if (err) {
						instance.error(err);
					}

					flowdata.data = count || 0;
					instance.send(flowdata);
				});
			});

		}

	});


};