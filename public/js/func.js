var TIDYUPWHITE = new RegExp(String.fromCharCode(160), 'g');

(function() {

	var meta = {};

	function inDOM(el) {
		if (!el)
			return;
		if (el.tagName === 'BODY')
			return true;
		var parent = el.parentNode;
		while (parent) {
			if (parent.tagName === 'BODY')
				return true;
			parent = parent.parentNode;
		}
	}

	function Instance(instance, el) {
		var t = this;
		t.id = instance.id;
		t.name = instance.name;
		t.instance = instance;
		t.element = el;
		t.dom = el[0];
		if (meta.pending[t.id]) {
			clearTimeout(meta.pending[t.id]);
			delete meta.pending[t.id];
		}
		el.on('click', 'button,.clickable', function() {
			t.click && t.click($(this));
		});
	}

	Instance.prototype = {

		get config() {
			return flow.config[this.instance.id];
		},

		set config(val) {
			this.instance.config = flow.config[this.instance.id] = val;
			UPD('flow.config.' + this.instance.id);
		}
	};

	Instance.prototype.rebind = function(type) {
		type && UPD('flow.' + type + '.' + this.instance.id);
	};

	Instance.prototype.reconfigure = function(val) {
		FUNC.reconfigure(this.id, val || this.instance.config);
	};

	Instance.prototype.trigger = function(data) {
		FUNC.trigger(this.id, data);
	};

	Instance.prototype.call = function(data, callback, globalcall) {
		var callbackid = GUID(10);
		if (typeof(data) === 'function') {
			callback = data;
			data = null;
		}
		flow.calls[callbackid] = callback;
		SETTER('websocket/send', { TYPE: 'call', id: globalcall ? ('@' + this.component.id) : this.id, data: data, callbackid: callbackid });
	};

	Instance.prototype.$destroy = function() {
		var t = this;
		delete meta.instances[t.id];
		t.close && t.close();
	};

	meta.components = {};
	meta.instances = {};
	meta.current = '';
	meta.pending = {};

	function reinit(id) {
		var instance = flow.data[id];
		if (instance)
			meta.init(instance.name, instance, $('.component[data-id="' + id + '"]'), true);
		delete meta.pending[id];
	}

	W.TOUCH = function(fn) {
		var name = W.flowinstances.current;
		var checksum = W.flowinstances.checksum;
		if (name) {
			if (meta.components[name]) {
				if (meta.components[name].checksum !== checksum) {
					for (var key in flow.data) {
						if (key !== 'groups' && key !== 'paused' && key !== 'tabs') {
							var tmp = flow.data[key];
							if (tmp.name === name)
								meta.pending[tmp.id] = setTimeout(reinit, 1000, tmp.id);
						}
					}
				}
			}
			meta.components[name] = { fn: fn, checksum: checksum };
		}
	};

	meta.exec = function(id, type, val) {
		if (id === '*') {
			for (var key in meta.instances)
				meta.exec(key, type, val);
		} else {
			var instance = meta.instances[id];
			if (instance && instance[type])
				instance[type](val);
		}
	};

	meta.init = function(name, instance, el, reinit) {
		var tmp = meta.components[name];
		if (tmp) {
			if (meta.instances[instance.id])
				meta.instances[instance.id].$destroy();
			var obj = new Instance(instance, el);
			meta.instances[instance.id] = obj;
			tmp.fn(obj, reinit);
			obj.configure && obj.configure(flow.config[instance.id], true);
			obj.status && obj.status(flow.status[instance.id], true);
			obj.note && obj.note(flow.note[instance.id], true);
		}
	};

	meta.remove = function(id) {
		var instance = meta.instances[id];
		instance && instance.$destroy();
	};

	ON('knockknock', function() {
		for (var key in meta.instances) {
			var instance = meta.instances[key];
			if (!inDOM(instance.dom))
				instance.$destroy();
		}
	});

	W.flowinstances = meta;

})();

FUNC.readme = function(title, md) {

	var winid = 'readme' + HASH(md);
	common.readmewindow = md;

	if (common.windows.findItem('id', winid)) {
		SETTER('windows/focus', winid);
	} else {
		PUSH('common.windows', { id: winid, cache: 'readme', html: '<div data-import="url:/forms/readme.html"></div>', title: title, actions: { move: true, autosave: true, close: true, maximize: false, minimize: false }, offset: { x: ((WW / 2) - 275) >> 0, y: ((WH / 2) - 250) >> 0, width: 550, height: 500, minwidth: 200, minheight: 300, maxwidth: 800, maxheight: 1200 }, make: function(el) {
			el.closest('.ui-windows-item').css('z-index', 50);
		}});
	}

};

FUNC.makeid = function(type) {
	return type + Date.now().toString(36).slice(4) + Math.random().toString(16).slice(10);
};

FUNC.trigger = function(el, data) {
	if (data && data.constructor !== Object)
		data = null;
	if (!data || typeof(data) !== 'object')
		data = {};
	setTimeout(function(id, data) {
		if (id && flow.data[id] && flow.data[id].connected) {
			data.TYPE = 'trigger';
			data.id = id;
			SETTER('websocket/send', data);
		}
	}, 10, el instanceof jQuery ? el.attrd2('id') : el, data);
	return data;
};

FUNC.send = function(msg, callback, loading) {
	loading && SETTER('loading/show');
	if (callback)
		msg.callback = callback;
	SETTER('websocket/send', msg);
};

FUNC.import = function(callback) {
	SET('importform @default', { callback: callback });
	SET('common.form', 'importform');
};

FUNC.rtrim = function(value) {
	var lines = value.split('\n');
	var reg = /\s+$/;
	for (var i = 0; i < lines.length; i++)
		lines[i] = lines[i].replace(reg, '');
	return lines.join('\n').replace(TIDYUPWHITE, ' ');
};

FUNC.strim = function(value) {

	var c = value.charAt(0);
	if (c !== ' ' && c !== '\t')
		return value;

	for (var i = 0; i < value.length; i++) {
		c = value.charAt(i);
		if (c !== ' ' && c !== '\t')
			break;
	}

	var count = i;
	var lines = value.split('\n');

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		if (line.length > count) {
			if ((/^[\s\t]+$/g).test(line.substring(0, count)))
				lines[i] = line.substring(count);
		}
	}

	return lines.join('\n');
};

(function() {

	var TABSCOUNT = function(val) {
		var count = 0;
		for (var i = 0; i < val.length; i++) {
			if (val.charAt(i) === '\t')
				count++;
			else
				break;
		}
		return count;
	};

	var TABS = function(count) {
		var str = '';
		for (var i = 0; i < count; i++)
			str += '\t';
		return str;
	};

	FUNC.wrapbracket = function(cm, pos) {

		var line = cm.getLine(pos.line);

		if (!(/(function|switch|else|with|if|for|while)\s\(/).test(line) || (/\w/).test(line.substring(pos.ch)))
			return;

		var tabs = TABSCOUNT(line);
		var lines = cm.lineCount();
		var plus = '';
		var nl;

		if (line.indexOf('= function') !== -1)
			plus = ';';
		else if (line.indexOf(', function') !== -1 || line.indexOf('(function') !== -1)
			plus = ');';

		if (pos.line + 1 >= lines) {
			// end of value
			cm.replaceRange('\n' + TABS(tabs + 1) + '\n' + TABS(tabs) + '}' + plus, pos, null, '+input');
			pos.line++;
			pos.ch = tabs + 1;
			cm.setCursor(pos);
			return true;
		}

		if (plus) {
			var lchar = line.substring(line.length - 2);

			if (lchar !== ');') {
				lchar = line.charAt(line.length - 1);
				if (lchar !== ';' && lchar !== ')')
					lchar = '';
			}

			if (lchar) {
				pos.ch = line.length - lchar.length;
				var post = {};
				post.line = pos.line;
				post.ch = line.length;
				cm.replaceRange('', pos, post, '+move');
			}
		}

		for (var i = pos.line + 1; i < lines; i++) {

			var cl = cm.getLine(i);
			var tc = TABSCOUNT(cl);

			if (tc <= tabs) {
				var nl = cl && cl.indexOf('}') === -1 ? true : false;
				pos.line = i - 1;
				pos.ch = 10000;
				cm.replaceRange('\n' + TABS(tabs) + '}' + plus + (nl ? '\n' : ''), pos, null, '+input');
				pos.ch = tabs.length;
				cm.setCursor(pos);
				return true;
			}
		}
	};
})();

FUNC.hex2rgba = function(hex, opacity) {

	var c = (hex.charAt(0) === '#' ? hex.substring(1) : hex).split('');

	if(c.length === 3)
		c = [c[0], c[0], c[1], c[1], c[2], c[2]];

	var a = c.splice(6);
	if (a.length)
		a = parseFloat(parseInt((parseInt(a.join(''), 16) / 255) * 1000) / 1000);
	else
		a = opacity || '1';

	c = '0x' + c.join('');
	return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + a + ')';
};

FUNC.rgba2hex = function(rgba) {
	var m = rgba.match(/\d+,(\s)?\d+,(\s)?\d+,(\s)?[.0-9]+/);
	if (m) {
		m = m[0].split(',').trim();

		var a = m[3];
		if (a) {
			if (a.charAt(0) === '.')
				a = '0' + a;
			a = a.parseFloat();
			a = ((a * 255) | 1 << 8).toString(16).slice(1);
		} else
			a = '';

		return '#' + ((m[0] | 1 << 8).toString(16).slice(1) + (m[1] | 1 << 8).toString(16).slice(1) + (m[2] | 1 << 8).toString(16).slice(1) + a).toUpperCase();

	} else
		return rgba;
};

FUNC.colorize = function(css, cls) {
	var lines = css.split('\n');
	var builder = [];

	var findcolor = function(val) {
		var color = val.match(/#[0-9A-F]{1,6}/i);
		if (color)
			return color + '';
		var beg = val.indexOf('rgba(');
		if (beg === -1)
			return;
		return val.substring(beg, val.indexOf(')', beg) + 1);
	};

	for (var i = 0; i < lines.length; i++) {

		var line = lines[i];

		if (!line) {
			builder.push('');
			continue;
		}

		var beg = line.indexOf('{');
		if (beg === -1)
			continue;

		var end = line.lastIndexOf('}');
		if (end === -1)
			continue;

		var cmd = line.substring(beg + 1, end).split(';');
		var cmdnew = [];

		for (var j = 0; j < cmd.length; j++) {
			var c = cmd[j].trim().split(':').trim();
			switch (c[0]) {
				case 'border':
				case 'border-left':
				case 'border-top':
				case 'border-right':
				case 'border-bottom':
				case 'outline':
					var color = findcolor(c[1]);
					if (color)
						cmdnew.push(c[0] + '-color: ' + color);
					break;
				case 'background':
				case 'border-left-color':
				case 'border-right-color':
				case 'border-top-color':
				case 'border-bottom-color':
				case 'border-color':
				case 'background-color':
				case 'outline-color':
				case 'color':
				case 'stroke':
				case 'fill':
					cmdnew.push(c[0] + ': ' + c[1]);
					break;
			}
		}
		if (cmdnew.length) {
			var selector = line.substring(0, beg).trim();
			var sel = selector.split(',').trim();
			for (var k = 0; k < sel.length; k++)
				sel[k] = (cls ? (cls + ' ') : '') + sel[k].trim().replace(/\s{2,}/g, ' ');
			builder.push(sel.join(', ') + ' { ' + cmdnew.join('; ') + '; }');
		}
	}

	var arr = [];
	var prev = '';
	for (var i = 0; i < builder.length; i++) {
		var line = builder[i];
		if (prev === line)
			continue;
		prev = line;
		arr.push(line);
	}

	return arr.join('\n');
};

FUNC.comment = function(ext, sel) {
	for (var j = 0; j < sel.length; j++) {

		var line = sel[j].trimRight();
		if (!line)
			continue;

		var index = line.lastIndexOf('\t');
		switch (ext) {
			case 'js':
				if (line.indexOf('//') === -1) {
					if (index !== -1)
						index++;
					line = line.substring(0, index) + '// ' + line.substring(index);
				} else
					line = line.replace(/\/\/(\s)/g, '');
				break;

			case 'html':
				if (line.indexOf('<!--') === -1) {
					if (index !== -1)
						index++;
					line = line.substring(0, index) + '<!-- ' + line.substring(index) + ' -->';
				} else
					line = line.replace(/<!--(\s)|(\s)-->/g, '');
				break;
			case 'css':
				if (line.indexOf('/*') === -1) {
					if (index !== -1)
						index++;
					line = line.substring(0, index) + '/* ' + line.substring(index) + ' */';
				} else
					line = line.replace(/\/\*(\s)|(\s)\*\//g, '');
				break;
		}
		sel[j] = line;
	}
	return sel;
};


FUNC.pref_save = function(key, value) {
	var id = 'flow' + HASH(common.socket).toString(36) + '_' + key;
	PREF.set(id, value, '1 month');
};

FUNC.pref_read = function(key) {
	var id = 'flow' + HASH(common.socket).toString(36) + '_' + key;
	return PREF[id];
};

FUNC.checkhtml = function(html) {
	var m = html.match(/exports\.(id|name|version|icon)(\s)?\=.*?;/g);
	if (m) {
		var opt = {};
		try {
			new Function('exports', m.join('\n'))(opt);
			if (opt.name && opt.version && opt.icon)
				return opt;
		} catch (e) {}
	}
};