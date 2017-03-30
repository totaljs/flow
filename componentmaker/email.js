exports.id = 'email';
exports.title = 'Email';
exports.group = 'Notifications';
exports.color = '#8CC152';
exports.input = true;
exports.author = 'Peter Širka';
exports.icon = 'commenting-o';

exports.html = `<div class="padding">
	<section>
		<label><i class="fa fa-lock"></i>@(SMTP sender)</label>
		<div class="padding npb">
			<div class="row">
				<div class="col-md-6 m">
					<div data-jc="textbox" data-jc-path="smtp" data-required="true" data-maxlength="50">@(SMTP server)</div>
				</div>
				<div class="col-md-6 m">
					<div data-jc="textbox" data-jc-path="port" data-required="true" data-maxlength="4" data-jc-type="number" data-jc-value="25">@(Port)</div>
				</div>
			</div>
			<div class="row">
				<div class="col-md-6 m">
					<div data-jc="textbox" data-jc-path="user" data-maxlength="50" data-placeholder="@(SMTP user)">User</div>
				</div>
				<div class="col-md-6 m">
					<div data-jc="textbox" data-jc-path="password" data-maxlength="50" data-placeholder="@(SMTP password)" data-jc-type="password">@(Password)</div>
				</div>
			</div>
		</div>
	</section>
	<br />
	<section>
		<label><i class="fa fa-envelope"></i>@(Mail message settings)</label>
		<div class="padding npb">
			<div class="b">@(Message)</div>
			<div class="row mt10">
				<div class="col-md-6 m">
					<div data-jc="textbox" data-jc-path="from" data-required="true" data-maxlength="120" data-jc-type="email" data-jc-value="'@'" data-icon="fa-envelope-o">@(From)</div>
				</div>
				<div class="col-md-6 m">
					<div data-jc="textbox" data-jc-path="target" data-required="true" data-maxlength="120" data-jc-type="email" data-jc-value="'@'" data-icon="fa-envelope-o">@(To)</div>
				</div>
			</div>
			<div data-jc="textbox" data-jc-path="subject" class="m" data-required="true" data-maxlength="100" data-jc-value="'@'">@(Subject)</div>
		</div>
	</section>
</div>`;

exports.readme = `# Email sender

The component has to be configured.`;

exports.install = function(instance) {

	var can = false;
	var smtp = null;

	instance.on('data', function(response) {
		can && instance.custom.send(response.data);
	});

	instance.custom.send = function(body) {
		var options = instance.options;
		var message = Mail.create(options.subject, typeof(body) === 'object' ? JSON.stringify(body) : body.toString());
		message.from(options.from);
		message.to(options.target);
		message.send(options.smtp, smtp);
	};

	instance.reconfigure = function() {
		var options = instance.options;
		can = options.smtp && options.subject;

		if (!can) {
			self.status('Not configured', 'red');
			return;
		}

		smtp = {};
		options.user && (smtp.user = options.user);
		options.password && (smtp.password = options.password);
		options.port && (smtp.port = options.port);

		if (smtp.port !== 25)
			smtp.secure = true;

		Mail.try(options.smtp, smtp, function(err) {
			if (err) {
				Mail.try(options.smtp, smtp, function(err) {
					instance.status(err ? err.toString() : '', err ? 'red' : undefined);
				});
			} else
				instance.status('');
		});
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};