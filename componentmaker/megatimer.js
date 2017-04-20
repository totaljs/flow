exports.id = 'megatimer';
exports.title = 'Megatimer';
exports.group = 'Inputs';
exports.color = '#F6BB42';
exports.output = 1;
exports.click = true;
exports.author = 'Martin Smola';
exports.icon = 'calendar';
exports.options = { 
	weekly: {
		days: {
			monday: [],
			tuesday: [],
			wednesday: [],
			thursday: [],
			friday: [],
			saturday: [],
			sunday: [],
		}
	},
	enabled: true
};

exports.html = `
	<style>
		.col-day { width:90px; float:left; }
		.col-hours { width:80px; float:left; }
		.pr10 { padding-right:10px; }
		.text-center { text-align: center; }
		.weekly-day-col { width:14.2%; float:left; }
		.weekly-day { width: 100%; height: 30px; }
		.weekly-day-time { width: 100%; height: 30px; padding-top: 6px; cursor: pointer; }
		.fa-circle.toggle-on { color: green; margin-right: 4px; }
		.fa-circle.toggle-off { color: red; margin-right: 4px; }

		.weekly-inline-edit { position: fixed; z-index: 60; background-color: white; border: 1px #e0e0e0 solid; border-radius: 3px; box-shadow: 1px 1px 7px 0px rgba(0, 0, 0, 0.33); padding: 10px; }
		.weekly-inline-edit button { width: 100%; }

		.weekly-day-button { margin: 10px auto 0; width: 70%; }
		.weekly-day-button>button { width: 100%; }
		.weekly-inline-edit .button-remove { margin-top: 10px; }
	</style>
	<div class="padding">	

		<div class="row m">
			<div class="col-md-3">
				<div data-jc="checkbox" data-jc-path="enabled">@(Enabled)</div>
				<div data-jc="dropdown" data-jc-path="type" data-options=";@(Hourly)|hourly;@(Daily)|daily;@(Weekly)|weekly;@(Monthly)|monthly;@(Yearly)|yearly" class="m">Timer type</div>
			</div>
		</div>

		<section class="m">
			<label><i class="fa fa-database"></i>@(Data)</label>
			<div class="padding npb">	
				<div class="row">
					<div class="col-md-3">
						<div data-jc="dropdown" data-jc-path="datatype" data-options=";String|string;Number|number;Boolean|boolean;Date|date;Object|object" class="m">@(Data type (String by default))</div>
					</div>
					<div class="col-md-9">
						<div data-jc="textbox" data-jc-path="ondata" data-placeholder="@(e.g. Hello world or 123 or { hello: 'world'} or ['hello', 'world']))" class="m">@(On data)</div>
						<div data-jc="textbox" data-jc-path="offdata" data-placeholder="@(e.g. Hello world or 123 or { hello: 'world'} or ['hello', 'world']))" class="m">@(Off data)</div>
					</div>
				</div>				
			</div>
		</section>

		<div data-jc="visible" data-jc-path="type" data-if="value === 'daily'">
			<section>
				<label><i class="fa fa-edit"></i>@(Daily timer)</label>
				<div class="padding npb">
					@TODO				
				</div>
			</section>
		</div>

		<div data-jc="visible" data-jc-path="type" data-if="value === 'hourly'">
			<section>
				<label><i class="fa fa-edit"></i>@(Hourly timer)</label>
				<div class="padding npb">
					@TODO
				</div>
			</section>
		</div>

		<div data-jc="visible" data-jc-path="type" data-if="value === 'weekly'">
			<section>
				<label><i class="fa fa-calendar"></i>@(Weekly timer)</label>
				<div class="padding npb">
					<div class="row m">
						<div class="col-md-12">

							<div class="weekly-day-col">
								<div class="weekly-day text-center"><strong>@(Monday)</strong></div>
								<div data-jc="repeater" data-jc-path="weekly.days.monday">
									<script type="text/html">
										<div data-jc="megatimercomponent-hours" data-jc-path="weekly.days.monday[$index]" class="weekly-day-time text-center"><i class="fa fa-circle toggle-{{ type }}" aria-hidden="true"></i>{{ time }}</div>
									</script>
								</div>
								<div class="weekly-day-button"><button class="button button-small exec" data-exec="megatimercomponent_add" data-day="monday"><i class="fa fa-plus"></i>&nbsp;@(Add)</button></div>
							</div>

							<div class="weekly-day-col">
								<div class="weekly-day text-center"><strong>@(Tuesday)</strong></div>
								<div data-jc="repeater" data-jc-path="weekly.days.tuesday">
									<script type="text/html">
										<div data-jc="megatimercomponent-hours" data-jc-path="weekly.days.tuesday[$index]" class="weekly-day-time text-center"><i class="fa fa-circle toggle-{{ type }}" aria-hidden="true"></i>{{ time }}</div>
									</script>
								</div>
								<div class="weekly-day-button"><button class="button button-small exec" data-exec="megatimercomponent_add" data-day="tuesday"><i class="fa fa-plus"></i>&nbsp;@(Add)</button></div>
							</div>

							<div class="weekly-day-col">
								<div class="weekly-day text-center"><strong>@(Wednesday)</strong></div>
								<div data-jc="repeater" data-jc-path="weekly.days.wednesday">
									<script type="text/html">
										<div data-jc="megatimercomponent-hours" data-jc-path="weekly.days.wednesday[$index]" class="weekly-day-time text-center"><i class="fa fa-circle toggle-{{ type }}" aria-hidden="true"></i>{{ time }}</div>
									</script>
								</div>
								<div class="weekly-day-button"><button class="button button-small exec" data-exec="megatimercomponent_add" data-day="wednesday"><i class="fa fa-plus"></i>&nbsp;@(Add)</button></div>
							</div>

							<div class="weekly-day-col">
								<div class="weekly-day text-center"><strong>@(Thursday)</strong></div>
								<div data-jc="repeater" data-jc-path="weekly.days.thursday">
									<script type="text/html">
										<div data-jc="megatimercomponent-hours" data-jc-path="weekly.days.thursday[$index]" class="weekly-day-time text-center"><i class="fa fa-circle toggle-{{ type }}" aria-hidden="true"></i>{{ time }}</div>
									</script>
								</div>
								<div class="weekly-day-button"><button class="button button-small exec" data-exec="megatimercomponent_add" data-day="thursday"><i class="fa fa-plus"></i>&nbsp;@(Add)</button></div>
							</div>

							<div class="weekly-day-col">
								<div class="weekly-day text-center"><strong>@(Friday)</strong></div>
								<div data-jc="repeater" data-jc-path="weekly.days.friday">
									<script type="text/html">
										<div data-jc="megatimercomponent-hours" data-jc-path="weekly.days.friday[$index]" class="weekly-day-time text-center"><i class="fa fa-circle toggle-{{ type }}" aria-hidden="true"></i>{{ time }}</div>
									</script>
								</div>
								<div class="weekly-day-button"><button class="button button-small exec" data-exec="megatimercomponent_add" data-day="friday"><i class="fa fa-plus"></i>&nbsp;@(Add)</button></div>
							</div>

							<div class="weekly-day-col">
								<div class="weekly-day text-center"><strong>@(Saturday)</strong></div>
								<div data-jc="repeater" data-jc-path="weekly.days.saturday">
									<script type="text/html">
										<div data-jc="megatimercomponent-hours" data-jc-path="weekly.days.saturday[$index]" class="weekly-day-time text-center"><i class="fa fa-circle toggle-{{ type }}" aria-hidden="true"></i>{{ time }}</div>
									</script>
								</div>
								<div class="weekly-day-button"><button class="button button-small exec" data-exec="megatimercomponent_add" data-day="saturday"><i class="fa fa-plus"></i>&nbsp;@(Add)</button></div>
							</div>

							<div class="weekly-day-col">
								<div class="weekly-day text-center"><strong>@(Sunday)</strong></div>
								<div data-jc="repeater" data-jc-path="weekly.days.sunday">
									<script type="text/html">
										<div data-jc="megatimercomponent-hours" data-jc-path="weekly.days.sunday[$index]" class="weekly-day-time text-center"><i class="fa fa-circle toggle-{{ type }}" aria-hidden="true"></i>{{ time }}</div>
									</script>
								</div>
								<div class="weekly-day-button"><button class="button button-small exec" data-exec="megatimercomponent_add" data-day="sunday"><i class="fa fa-plus"></i>&nbsp;@(Add)</button></div>
							</div>


						</div>
					</div>
				</div>
			</section>
		</div>

		<div data-jc="visible" data-jc-path="type" data-if="value === 'monthly'">
			<section>
				<label><i class="fa fa-edit"></i>@(Monthly timer)</label>
				<div class="padding npb">
					@TODO
				</div>
			</section>
		</div>

		<div data-jc="visible" data-jc-path="type" data-if="value === 'yearly'">
			<section>
				<label><i class="fa fa-edit"></i>@(Yearly timer)</label>
				<div class="padding npb">
					@TODO
				</div>
			</section>
		</div>

	</div>
							
	<script type="text/html" id="template-weekly-inline-edit">
		<div class="weekly-inline-edit hidden" id="weekly-inline-edit">
			<div class="inline-edit">
				<div data-jc="dropdown" data-jc-path="megatimercomponent.form.type" data-options="On|on;Off|off" class="m">@(Type)</div>
				<div data-jc="dropdown" data-jc-path="megatimercomponent.form.time" data-source="megatimercomponent.hours" class="m">@(Time)</div>
				<button class="button"><i class="fa fa-check"></i>&nbsp;@(Set)</button>
				<button class="button button-remove"><i class="fa fa-trash"></i>&nbsp;@(Remove)</button>
			</div>
		</div>
	</script>

	<script>

		$('body').append($('#template-weekly-inline-edit').html());

		COMPONENT('megatimercomponent-hours', function() {
			var self = this;
			var $form;
			var visible = false;
			var index;
			var $parent;

			self.make = function() {				
				$form = $('#weekly-inline-edit');
				$parent = self.element.parent();
				self.element.on('click', function(e){
					e.preventDefault();
					e.stopPropagation();
					var $this = $(this);
					var data = self.get();
					index = data.index;
					var pos = $this.offset();
					$form.css({top: pos.top + 30, left: pos.left, width: $this.css('width')});
					$form.find('.button-remove').attr('data-index', data.index);
					$form.removeClass('hidden');	
					visible = true;	
					SET('megatimercomponent.form', { type: data.type || 'on', time: data.time || '12:00'});

					$form.find('button').off('click').on('click', function(){
						var $this = $(this);
						var path = 'settings.megatimer.' + $parent.attr('data-jc-path');
						if ($this.hasClass('button-remove')) {
							var d = GET(path);
							d = d.remove('index', +$this.attr('data-index'));
							SET(path, d);
							CHANGE('settings.megatimer.weekly.days');
							$form.addClass('hidden');
							visible = false;
							return;
						}
						var data = GET('megatimercomponent.form');
						SET(self.path, data);
						UPDATE(path);
						CHANGE('settings.megatimer.weekly.days');
						$form.addClass('hidden');
						visible = false;
					});
					$form.off('click').on('click', function(e){
						e.stopPropagation();
					});			
				});

				$('body').on('click', function(){
					visible && $form.addClass('hidden');
					visible = false;
				});
			};
		});

		function megatimercomponent_add(el){
			var day = el.attr('data-day');
			PUSH('settings.megatimer.weekly.days.' + day, { type: 'on', time: '12:00' }, true);
			CHANGE('settings.megatimer');
		}

		var megatimercomponent = {};
		megatimercomponent.hours = ["00:00","00:15","00:30","00:45","01:00","01:15","01:30","01:45","02:00","02:15","02:30","02:45","03:00","03:15","03:30","03:45","04:00","04:15","04:30","04:45","05:00","05:15","05:30","05:45","06:00","06:15","06:30","06:45","07:00","07:15","07:30","07:45","08:00","08:15","08:30","08:45","09:00","09:15","09:30","09:45","10:00","10:15","10:30","10:45","11:00","11:15","11:30","11:45","12:00","12:15","12:30","12:45","13:00","13:15","13:30","13:45","14:00","14:15","14:30","14:45","15:00","15:15","15:30","15:45","16:00","16:15","16:30","16:45","17:00","17:15","17:30","17:45","18:00","18:15","18:30","18:45","19:00","19:15","19:30","19:45","20:00","20:15","20:30","20:45","21:00","21:15","21:30","21:45","22:00","22:15","22:30","22:45","23:00","23:15","23:30","23:45"];

		
		
	</script>

`;

exports.readme = `# Timer

Timer will trigger flow at the given times and dates. You can optionally define a data-type of the output and the data.

`;

exports.install = function(instance) {
	console.log('instance.options.enabled',instance.options.enabled);
	instance.options.enabled = true;

	var queue = [];

	// instance.on('click', function(){
	// 	instance.options.enabled = !instance.options.enabled;
	// });

	var timers = {};

	timers.weekly = function(){

		var weekly = instance.options.weekly;
		var todayday = F.datetime.getDay();
		todayday === 0 && (todayday = 7);

		Object.keys(weekly.days).forEach(function(dayname){
			var daynumber = weekdays[dayname]; // sunday === 7 not 0 !!!
			var day = weekly.days[dayname];
			var add = 0;
			
			if (daynumber < todayday)
				// 7 - (wed - tue) => 7 - (3 - 2) => 7 - 1 => 6
				add = 7 - (todayday - daynumber); 

			if (daynumber > todayday)
				add = daynumber - todayday;

			var date = F.datetime.add('{0} days'.format(add));

			day.forEach(function(d){
				var time = d.time.split(':');
				date.setHours(time[0]);
				date.setMinutes(time[1]);
				queue.push({
					expire: date.getTime(),
					type: d.type
				});
			});
		});
	};

	instance.on('options', reconfigure);

	//reconfigure();

	function reconfigure(o, old_options) {

		queue = [];

		var options = instance.options;

		if (!options.type) {
			instance.status('Not configured', 'red');
			return;
		}

		instance.status(options.type);

		if (timers[options.type])
		 	timers[options.type]();
	};


	F.on('service', function(){

		console.log('SERVICE');

		var now = F.datetime.getTime();
		var l = queue.length;
		var last = 0;
		var index;

		for (var i = 0; i < l; i++) {
			var t = queue[i];
			if (t.expire < now && t.expire > last) {
				last = t.expire;
				index = i;
			}
		}

		if (index == null)
			return;

		var t = queue[index];
		t.expire = new Date().setTime(t.expire + 604800000); // +7 days

		var key = t.type + 'data';		
		var data = instance.options[key];
		data = instance.options.datatype === 'object' ? JSON.parse(data) : data;
		console.log('instance.options.enabled',instance.options.enabled);
		instance.options.enabled && instance.send(data);

	});

};

var weekdays = {
	'monday': 1,
	'tuesday': 2,
	'wednesday': 3,
	'thursday': 4,
	'friday': 5,
	'saturday': 6,
	'sunday': 7
}
