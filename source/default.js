var MESSAGE_TRIGGER = { type: 'trigger' };
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

function markdown(value, el) {
	el && setTimeout(function(el) {
		$(el || document.body).find('pre code').each(function(i, block) {
			if (!block.$processed) {
				block.$processed = true;
				hljs.highlightBlock(block);
			}
		});
	}, 1, el);
	return value.trim().markdown().replace(/\t/g, '  ');;
}

Thelpers.markdown = function(value) {
	return markdown(value);
};

Thelpers.markdownnotes = function(value) {
	return '<div class="md">{0}</div>'.format((value || '').markdown({ wrap: false })).replace(/\t/g, '  ');
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

if (String.prototype.markdown == null) {
	(function Markdown() {

		var links = /(!)?\[.*?\]\(.*?\)/g;
		var links2 = /&lt;(https|http)+:\/\/.*?&gt;/g;
		var imagelinks = /\[!\[.*?\]\(.*?\)\]\(.*?\)/g;
		var format = /__.*?__|_.*?_|\*\*.*?\*\*|\*.*?\*|~~.*?~~|~.*?~/g;
		var ordered = /^[a-z|0-9]{1}\.\s|^-\s/i;
		var orderedsize = /^(\s|\t)+/;
		var code = /`.*?`/g;
		var encodetags = /<|>/g;
		var formatclean = /_|\*|~/g;
		var regid = /[^\w]+/g;
		var regdash = /-{2,}/g;
		var regtags = /<\/?[^>]+(>|$)/g;
		var regicons = /(^|[^\w]):[a-z-]+:([^\w]|$)/g;
		var regemptychar = /\s|\W/;

		var encode = function(val) {
			return '&' + (val === '<' ? 'lt' : 'gt') + ';';
		};

		function markdown_code(value) {
			return '<code>' + value.substring(1, value.length - 1) + '</code>';
		}

		function markdown_imagelinks(value) {
			var end = value.indexOf(')') + 1;
			var img = value.substring(1, end);
			return '<a href="' + value.substring(end + 2, value.length - 1) + '" target="_blank">' + markdown_links(img) + '</a>';
		}

		function markdown_table(value, align, ishead) {

			var columns = value.substring(1, value.length - 1).split('|');
			var builder = '';

			for (var i = 0; i < columns.length; i++) {
				var column = columns[i].trim();
				if (column.charAt(0) == '-')
					continue;
				var a = align[i];
				builder += '<' + (ishead ? 'th' : 'td') + (a && a !== 'left' ? (' class="' + a + '"') : '') + '>' + column + '</' + (ishead ? 'th' : 'td') + '>';
			}

			return '<tr>' + builder + '</tr>';
		}

		function markdown_links(value) {
			var end = value.lastIndexOf(']');
			var img = value.charAt(0) === '!';
			var text = value.substring(img ? 2 : 1, end);
			var link = value.substring(end + 2, value.length - 1);
			var responsive = true;

			if (img) {
				if (text.charAt(0) === '+') {
					responsive = false;
					text = text.substring(1);
				}
			} else {
				if ((/^#\d+$/).test(link)) {
					// footnotes
					return (/^\d+$/).test(text) ? '<sup data-id="{0}" class="footnote">{1}</sup>'.format(link.substring(1), text) : '<span data-id="{0}" class="footnote">{1}</span>'.format(link.substring(1), text);
				}
			}

			var nofollow = link.charAt(0) === '@' ? 'rel="nofollow"' : 'target="_blank"';
			return img ? ('<img src="' + link + '" alt="' + text + '"' + (responsive ? ' class="img-responsive"' : '') + ' border="0" />') : ('<a href="' + link + '" ' + nofollow + '>' + text + '</a>');
		}

		function markdown_links2(value) {
			value = value.substring(4, value.length - 4);
			return '<a href="' + value + '" target="_blank">' + value + '</a>';
		}

		function markdown_format(value, index, text) {

			var p = text.charAt(index - 1);
			var n = text.charAt(index + value.length);

			if ((!p || regemptychar.test(p)) && (!n || regemptychar.test(n))) {

				var beg = '';
				var end = '';

				if (value.indexOf('*') !== -1) {
					beg += '<em>';
					end = '</em>' + end;
				}
				if (value.indexOf('_') !== -1) {
					beg += '<strong>';
					end = '</strong>' + end;
				}

				if (value.indexOf('~') !== -1) {
					beg += '<strike>';
					end = '</strike>' + end;
				}

				return beg + value.replace(formatclean, '') + end;
			}

			return value;
		}

		function markdown_id(value) {

			var end = '';
			var beg = '';

			if (value.charAt(0) === '<')
				beg = '-';

			if (value.charAt(value.length - 1) === '>')
				end = '-';

			return (beg + value.replace(regtags, '').toLowerCase().replace(regid, '-') + end).replace(regdash, '-');
		}

		function markdown_icon(value) {

			var beg = -1;
			var end = -1;

			for (var i = 0; i < value.length; i++) {
				var code = value.charCodeAt(i);
				if (code === 58) {
					if (beg === -1)
						beg = i + 1;
					else
						end = i;
				}
			}

			return value.substring(0, beg - 1) + '<i class="fa fa-' + value.substring(beg, end) + '"></i>' + value.substring(end + 1);
		}

		function markdown_urlify(str) {
			return str.replace(/(^|\s)+(((https?:\/\/)|(www\.))[^\s]+)/g, function(url, b, c) {
				var len = url.length;
				var l = url.charAt(len - 1);
				var f = url.charAt(0);
				if (l === '.' || l === ',')
					url = url.substring(0, len - 1);
				else
					l = '';
				url = (c === 'www.' ? 'http://' + url : url).trim();
				return (f.charCodeAt(0) < 40 ? f : '') + '[' + url + '](' + url + ')' + l;
			});
		}

		String.prototype.markdown = function(opt) {

			// opt.wrap = true;
			// opt.linetag = 'p';
			// opt.ul = true;
			// opt.code = true;
			// opt.images = true;
			// opt.links = true;
			// opt.formatting = true;
			// opt.icons = true;
			// opt.tables = true;
			// opt.br = true;
			// opt.headlines = true;
			// opt.hr = true;
			// opt.blockquotes = true;
			// opt.sections = true;
			// opt.custom
			// opt.footnotes = true;
			// opt.urlify = true;

			var str = this;

			if (!opt)
				opt = {};

			if (opt.urlify !== false && opt.links !== false)
				str = markdown_urlify(str);

			var lines = str.split('\n');
			var builder = [];
			var ul = [];
			var table = false;
			var iscode = false;
			var ishead = false;
			var prev;
			var prevsize = 0;
			var tmp;

			if (opt.wrap == null)
				opt.wrap = true;

			if (opt.linetag == null)
				opt.linetag = 'p';

			var closeul = function() {
				while (ul.length) {
					var text = ul.pop();
					builder.push('</' + text + '>');
				}
			};

			var formatlinks = function(val) {
				return markdown_links(val, opt.images);
			};

			for (var i = 0, length = lines.length; i < length; i++) {

				lines[i] = lines[i].replace(encodetags, encode);

				if (lines[i].substring(0, 3) === '```') {

					if (iscode) {
						if (opt.code !== false)
							builder.push('</code></pre></div>');
						iscode = false;
						continue;
					}

					closeul();
					iscode = true;
					if (opt.code !== false)
						tmp = '<div class="code"><pre><code class="lang-' + lines[i].substring(3) + '">';
					prev = 'code';
					continue;
				}

				if (iscode) {
					if (opt.code !== false)
						builder.push(tmp + lines[i]);
					if (tmp)
						tmp = '';
					continue;
				}

				var line = lines[i];

				if (opt.custom)
					line = opt.custom(line);

				if (opt.links !== false) {
					if (opt.images !== false)
						line = line.replace(imagelinks, markdown_imagelinks);
					line = line.replace(links, formatlinks).replace(links2, markdown_links2);
				}

				if (opt.formatting !== false)
					line = line.replace(format, markdown_format).replace(code, markdown_code);

				if (opt.icons !== false)
					line = line.replace(regicons, markdown_icon);

				if (!line) {
					if (table) {
						table = null;
						if (opt.tables !== false)
							builder.push('</tbody></table>');
					}
				}

				if (line === '' && lines[i - 1] === '') {
					closeul();
					if (opt.br !== false)
						builder.push('<br />');
					prev = 'br';
					continue;
				}

				if (line[0] === '|') {
					closeul();
					if (!table) {
						var next = lines[i + 1];
						if (next[0] === '|') {
							table = [];
							var columns = next.substring(1, next.length - 1).split('|');
							for (var j = 0; j < columns.length; j++) {
								var column = columns[j].trim();
								var align = 'left';
								if (column.charAt(column.length - 1) === ':')
									align = column[0] === ':' ? 'center' : 'right';
								table.push(align);
							}
							if (opt.tables !== false)
								builder.push('<table class="table table-bordered"><thead>');
							prev = 'table';
							ishead = true;
							i++;
						} else
							continue;
					}

					if (opt.tables !== false) {
						if (ishead)
							builder.push(markdown_table(line, table, true) + '</thead><tbody>');
						else
							builder.push(markdown_table(line, table));
					}
					ishead = false;
					continue;
				}

				if (line.charAt(0) === '#') {

					closeul();

					if (line.substring(0, 2) === '# ') {
						tmp = line.substring(2).trim();
						if (opt.headlines !== false)
							builder.push('<h1 id="' + markdown_id(tmp) + '">' + tmp + '</h1>');
						prev = '#';
						continue;
					}

					if (line.substring(0, 3) === '## ') {
						tmp = line.substring(3).trim();
						if (opt.headlines !== false)
							builder.push('<h2 id="' + markdown_id(tmp) + '">' + tmp + '</h2>');
						prev = '##';
						continue;
					}

					if (line.substring(0, 4) === '### ') {
						tmp = line.substring(4).trim();
						if (opt.headlines !== false)
							builder.push('<h3 id="' + markdown_id(tmp) + '">' + tmp + '</h3>');
						prev = '###';
						continue;
					}

					if (line.substring(0, 5) === '#### ') {
						tmp = line.substring(5).trim();
						if (opt.headlines !== false)
							builder.push('<h4 id="' + markdown_id(tmp) + '">' + tmp + '</h4>');
						prev = '####';
						continue;
					}

					if (line.substring(0, 6) === '##### ') {
						tmp = line.substring(6).trim();
						if (opt.headlines !== false)
							builder.push('<h5 id="' + markdown_id(tmp) + '">' + tmp + '</h5>');
						prev = '#####';
						continue;
					}
				}

				tmp = line.substring(0, 3);

				if (tmp === '---' || tmp === '***') {
					prev = 'hr';
					if (opt.hr !== false)
						builder.push('<hr class="line' + (tmp.charAt(0) === '-' ? '1' : '2') + '" />');
					continue;
				}

				// footnotes
				if ((/^#\d+:(\s)+/).test(line)) {
					if (opt.footnotes !== false) {
						tmp = line.indexOf(':');
						builder.push('<div class="footnotebody" data-id="{0}"><span>{0}:</span> {1}</div>'.format(line.substring(1, tmp).trim(), line.substring(tmp + 1).trim()));
					}
					continue;
				}

				if (line.substring(0, 5) === '&gt; ') {
					if (opt.blockquotes !== false)
						builder.push('<blockquote>' + line.substring(5).trim() + '</blockquote>');
					prev = '>';
					continue;
				}

				if (line.substring(0, 5) === '&lt; ') {
					if (opt.sections !== false)
						builder.push('<section>' + line.substring(5).trim() + '</section>');
					prev = '<';
					continue;
				}

				var tmpline = line.trim();

				if (opt.ul !== false && ordered.test(tmpline)) {

					var size = line.match(orderedsize);
					if (size)
						size = size[0].length;
					else
						size = 0;

					var append = false;

					if (prevsize !== size) {
						// NESTED
						if (size > prevsize) {
							prevsize = size;
							append = true;
							var index = builder.length - 1;
							builder[index] = builder[index].substring(0, builder[index].length - 5);
							prev = '';
						} else {
							// back to normal
							prevsize = size;
							builder.push('</' + ul.pop() + '>');
						}
					}

					var type = tmpline.charAt(0) === '-' ? 'ul' : 'ol';
					if (prev !== type) {
						var subtype;
						if (type === 'ol')
							subtype = tmpline.charAt(0);
						builder.push('<' + type + (subtype ? (' type="' + subtype + '"') : '') + '>');
						ul.push(type + (append ? '></li' : ''));
						prev = type;
						prevsize = size;
					}

					builder.push('<li>' + (type === 'ol' ? tmpline.substring(tmpline.indexOf('.') + 1) : tmpline.substring(2)).trim().replace(/\[x\]/g, '<i class="fa fa-check-square green"></i>').replace(/\[\s\]/g, '<i class="far fa-square"></i>') + '</li>');

				} else {
					closeul();
					line && builder.push((opt.linetag ? ('<' + opt.linetag + '>') : '') + line.trim() + (opt.linetag ? ('</' + opt.linetag + '>') : ''));
					prev = 'p';
				}
			}

			closeul();
			table && opt.tables !== false && builder.push('</tbody></table>');
			iscode && opt.code !== false && builder.push('</code></pre>');
			return (opt.wrap ? '<div class="markdown">' : '') + builder.join('\n') + (opt.wrap ? '</div>' : '');
		};

	})();
}