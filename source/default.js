var MESSAGE_TRIGGER = { type: 'trigger' };
var MD_LOG = { urlify: false };
var flowtriggers = {};

function diagonal(x1, y1, x2, y2) {
	return 'M' + x1 + ',' + y1 + 'C' + ((x1 + x2 ) / 2) + ',' + y1 + ' ' + ((x1 + x2) / 2) + ',' + y2 + ' ' + x2 + ',' + y2;
}

function highlightcomponent(id) {

	if (id instanceof jQuery)
		id = id.attrd('id');

	var item = flow.components.findItem('id', id);
	if (!item)
		return false;

	var tab = flow.tabs.findItem('id', item.tab);
	if (!tab)
		return false;

	SETTER('loading', 'show');

	var com;
	var el = $('.designer-scrollbar');
	setTimeout(function() {
		SETTER('loading', 'hide');
		com = $('.node_' + item.id);
		com.aclass('highlight');

		var sx = item.x - (el.width() / 2);
		if (sx < 0)
			sx = 0;

		var sy = item.y - (el.height() / 2);
		if (sy < 0)
			sy = 0;

		el.animate({ scrollTop: sy, scrollLeft: sx });
	}, location.hash.substring(1) === tab.linker ? 100 : 1500);

	location.hash = tab.linker;

	setTimeout(function() {
		com.rclass('highlight');
	}, 8000);

	return true;
}

$(W).on('resize', function() {
	setTimeout2('gwr', function() {
		EMIT('resize2');
	}, 200);
});

function markdown(value, el, type) {
	el && setTimeout(function(el) {
		var arr = $(el || document.body).find('pre code');
		for (var i = 0; i < arr.length; i++) {
			var block = arr[i];
			if (!block.$processed) {
				block.$processed = true;
				hljs.highlightBlock(block);
			}
		}
	}, 1, el);
	var opt = type === 'debug' ? MD_LOG : null;
	return value.trim().markdown(opt).replace(/\t/g, '  ');
}

Thelpers.markdown = function(value) {
	return markdown(value);
};

Thelpers.markdownnotes = function(value) {
	return '<div class="markdown-small">{0}</div>'.format((value || '').markdown({ wrap: false })).replace(/\t/g, '  ');
};

function savescrollposition() {
	if (common.tab) {
		var el = $('.designer-scrollbar');
		var tmp = common.tabscroll['tab' + common.tab.id];
		var pos = { x: el.prop('scrollLeft'), y: el.prop('scrollTop') };
		if (!tmp || tmp.x !== pos.x || tmp.y !== pos.y)
			SET('common.tabscroll.tab' + common.tab.id, pos);
	}
}

Thelpers.duration = function(ms) {
	return ms > 999 ? ((ms / 1000).format(1) + ' s') : (ms + ' ms');
};

Thelpers.trafficsort = function(value, name) {
	var str = '<i class="fa fa-caret-{0}"></i>';
	if (value === name)
		return str.format('up');
	if (value === ('!' + name))
		return str.format('down');
	return '';
};

ON('ready', function() {

	setTimeout(function() {
		SETTER('loading', 'hide');
		$('.ui-loading').rclass('ui-loading-firstload');
	}, 2000);

	EMIT('resize', $(window));
});

$(window).on('resize', function() {
	EMIT('resize', $(window));
});

FUNC.resizetabs = function() {
	var el = $('.tabs-scroller nav');
	var size = 0;
	el.find('a').each(function() {
		size += $(this).innerWidth() + 5;
	});
	var main = el.parent().width() - 66;
	size = Math.ceil(size);
	el.css('width', size);
	$('.scrolling').tclass('hidden', size < main);
};

function getSize(el) {
	var size = {};
	el = $(el);
	size.width = el.width();
	size.height = el.height();
	return size;
}

function getTranslate(value) {
	if (value instanceof jQuery)
		value = value.attr('transform');
	var arr = value.substring(10, value.length - 1).split(/\s|,/);
	return { x: arr[0].parseInt(), y: arr[1].parseInt() };
}

window.TRIGGER = function(name, data, callback) {

	if (callback === undefined) {
		callback = data;
		data = undefined;
	}

	var id = GUID(15);
	MESSAGE_TRIGGER.name = name;
	MESSAGE_TRIGGER.id = id;
	MESSAGE_TRIGGER.body = data;
	flowtriggers[id] = callback;
	SETTER('websocket', 'send', MESSAGE_TRIGGER);
};

function success() {
	var el = $('#success');
	el.show();
	el.aclass('success-animation');
	setTimeout(function() {
		el.rclass('success-animation');
		setTimeout(function() {
			el.hide();
		}, 1000);
	}, 1500);
	SETTER('loading', 'hide', 500);
}

Number.prototype.filesize = function(decimals, type) {

	if (typeof(decimals) === 'string') {
		var tmp = type;
		type = decimals;
		decimals = tmp;
	}

	var value;

	// this === bytes
	switch (type) {
		case 'bytes':
			value = this;
			break;
		case 'KB':
			value = this / 1024;
			break;
		case 'MB':
			value = filesizehelper(this, 2);
			break;
		case 'GB':
			value = filesizehelper(this, 3);
			break;
		case 'TB':
			value = filesizehelper(this, 4);
			break;
		default:

			type = 'bytes';
			value = this;

			if (value > 1023) {
				value = value / 1024;
				type = 'KB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'MB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'GB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'TB';
			}

			break;
	}

	type = ' ' + type;
	return (decimals === undefined ? value.format(2).replace('.00', '') : value.format(decimals)) + type;
};

function filesizehelper(number, count) {
	while (count--) {
		number = number / 1024;
		if (number.toFixed(3) === '0.000')
			return 0;
	}
	return number;
}

Thelpers.filesize = function(value, decimals, type) {
	return value ? value.filesize(decimals, type) : '...';
};

Thelpers.counter = function(value) {
	if (value > 999999)
		return (value / 1000000).format(2) + ' M';
	if (value > 9999)
		return (value / 10000).format(2) + ' K';
	return value ? value.format(0) : 0;
};

function shownotifications(force) {
	var el = $('#panel-notification');
	if (force) {
		var msg = flownotifications.shift();
		if (msg) {
			el.find('div').html(msg);
			setTimeout(function() {
				shownotifications(true);
			}, 3000);
			if (!flownotified) {
				el.aclass('panel-notified');
				flownotified = true;
			}
		} else if (flownotified) {
			el.rclass('panel-notified');
			flownotified = false;
		}
	} else if (!el.hclass('panel-notified'))
		shownotifications(true);
}


function trafficsort(el) {
	var name = el.attrd('name');
	var old = common.trafficsort;

	if (old === name)
		name = '!' + name;
	else if (old === ('!' + name))
		name = '';

	SET('common.trafficsort', name);
}

function refreshTrafficNodes() {
	common.trafficnodes = $('.node_traffic').toArray();
	for (var i = 0; i < common.trafficnodes.length; i++) {
		common.trafficnodes[i] = $(common.trafficnodes[i]);
		var el = common.trafficnodes[i];
		var item = el.get(0);
		item.$io = el.find('.traffic');
		item.$duration = el.find('.duration');
		if (!item.$duration.length)
			item.$duration = null;
		item.$pending = el.find('.pending');
	}
}

function refreshTraffic() {

	if (!common.traffic || !common.trafficnodes)
		return;

	var count = common.traffic.count;
	var key;
	var animate = [];

	for (var i = 0, length = common.trafficnodes.length; i < length; i++) {

		var el = common.trafficnodes[i];
		var id = el.attrd('id');
		var stats = common.traffic[id];
		var input = 0;
		var output = 0;
		var inputc = 0;
		var outputc = 0;
		var pending = 0;
		var duration = 0;
		var ci = 0;
		var co = 0;
		var keys;
		var index;
		var outputk = '';

		if (stats) {

			if (stats.input || stats.output) {
				input = ((stats.input / count) * 100 >> 0);
				output = ((stats.output / count) * 100 >> 0);
				inputc = stats.input;
				outputc = stats.output;
				outputk = (stats.no0 || 0) + 'x' + (stats.no1 || 0) + 'x' + (stats.no2 || 0) + 'x' + (stats.no3 || 0) + 'x' + (stats.no4 || 0) + 'x' + (stats.no5 || 0);
			}

			ci = stats.ci;
			co = stats.co;
			duration = stats.duration;
			pending = stats.pending;

			// analyze
			if (stats.no && common.animations) {
				keys = Object.keys(flow.connections);
				for (var j = 0, jl = keys.length; j < jl; j++) {
					key = keys[j];
					index = key.indexOf('#');
					if (key.substring(0, index) === id) {
						index = +key.substring(index + 1, key.indexOf('#', index + 1));
						var subid = key.substring(key.lastIndexOf('#') + 1);
						var tmpout = common.traffic[id];
						if (tmpout && tmpout['no' + index])
							animate.push({ id: 'id' + id + '' + index + '' + subid, com: subid, parent: id, count: tmpout['no' + index] });
					}
				}
			}
		}

		inputc < 0 && (inputc = 0);

		var key = inputc + 'x' + outputc + 'x' + pending + 'x' + duration + 'x' + outputk;
		var item = el.get(0);

		if (key === item.$traffic)
			continue;

		item.$traffic = key;
		var sum = input > output ? input : output;

		el.tclass('m1', sum < 25).tclass('m2', sum > 24 && sum < 50).tclass('m3', sum > 49 && sum < 70).tclass('m4', sum > 69);

		if (!!window.MSInputMethodContext && !!document.documentMode) {
			// IE
			item.$io.text('IO: ' + inputc + ' / ' + outputc);
			item.$duration && item.$duration.text(Thelpers.duration(duration || 0));
		} else {
			item.$io.html('<title>' + (ci.format(0)) + ' / ' + (co.format(0)) + '</title>IO: <tspan>' + inputc + '</tspan> &#8644; <tspan>' + outputc + '</tspan>');
			item.$duration && item.$duration.html('&empty; ' + Thelpers.duration(duration || 0));
			var pel = item.$pending.tclass('hide', pending ? false : true);
			pending && pel.html(pending ? ('&#10711; ' + pending) : '');
		}
	}

	if (common.animations && !common.form) {

		for (var i = 0; i < animate.length; i++) {

			var item = animate[i];
			var sleep = 0;
			count = 0;

			if (item.parent) {
				var tmp = item;
				while (true) {
					tmp = animate.findItem('com', tmp.parent);
					if (!tmp || count++ >= 10)
						break;
					sleep += 500;
				}
			}

			setTimeout(function(item) {
				SETTER('designer', 'newdata', item.id, item.count);
			}, sleep, item);
		}
	}
}

function themechanger() {
	SETTER('loading', 'show');
	setTimeout(function() {
		SET('common.theme', common.theme === 'dark' ? '' : 'dark');
		SETTER('loading', 'hide', 1000);
		var color = common.theme === 'dark' ? 'white' : 'black';
		$('.input,.output').each(function() {
			var el = $(this);
			var cur = el.attr('fill');
			cur !== color && el.attr('fill', el.attrd('index') === '99' ? 'red' : color);
		});
		$('.consumption').each(function() {
			this.setAttribute('fill', common.theme === 'dark' ? '#505050' : '#E0E0E0');
		});
		refreshTraffic();
	}, 1000);
}

function showhelp() {
	SET('common.form', 'help');
}

SETTER(true, 'shortcuts', 'register', 'esc', function(e) {
	if (common.form2) {
		SET('common.form2', '');
		e.preventDefault();
		e.stopPropagation();
	} else if (common.form) {

		e.preventDefault();
		e.stopPropagation();

		if (common.form.substring(0, 8) === 'settings') {
			var path = common.form.split('-')[1];
			if (!DISABLED('settings.' + path)) {
				SETTER('confirm', 'show', 'Are you sure you want to close this form without saving?', ['Yes', 'Cancel'], function(index) {
					!index && SET('common.form', '');
				});
				return;
			}
		}

		SET('common.form', '');
	}
});

CodeMirror.defineMode('totaljsresources', function() {

	var REG_KEY = /^[a-z0-9_\-.#]+/i;
	return {

		startState: function() {
			return { type: 0, keyword: 0 };
		},

		token: function(stream, state) {

			var m;

			if (stream.sol()) {

				var line = stream.string;
				if (line.substring(0, 2) === '//') {
					stream.skipToEnd();
					return 'comment';
				}

				state.type = 0;
			}

			m = stream.match(REG_KEY, true);
			if (m)
				return 'tag';

			if (!stream.string) {
				stream.next();
				return '';
			}

			var count = 0;

			while (true) {

				count++;
				if (count > 5000)
					break;

				var c = stream.peek();
				if (c === ':') {
					stream.skipToEnd();
					return 'def';
				}

				if (c === '(') {
					if (stream.skipTo(')')) {
						stream.eat(')');
						return 'variable-L';
					}
				}

			}

			stream.next();
			return '';
		}
	};
});

function getIcons() {
	var classes = document.styleSheets[0].rules || document.styleSheets[0].cssRules;
	var icons = {};
	for (var x = 0; x < classes.length; x++) {
		var cls = classes[x];
		var sel = cls.selectorText;

		if (sel && sel.substring(0, 4) == '.fa-') {
			sel = sel.split(',');
			var val = cls.cssText ? cls.cssText : cls.cssText.style.cssText;
			var a = val.match(/[^\x00-\x7F]+/);
			if (a)
				sel.forEach(function(s){
					s = s.trim();
					s = s.substring(4, s.indexOf(':')).trim();
					icons[s] = a.toString();
				});
		}
	}
	return icons;
}

function changedTab() {
	$('.tabs-flow').find('.tab[data-id="{0}"]'.format(common.tab.id)).aclass('changed');
	common.tab.changed = true;
}