COMPONENT('exec', function(self, config) {
	self.readonly();
	self.blind();
	self.make = function() {
		self.event('click', config.selector || '.exec', function(e) {
			var el = $(this);

			var attr = el.attrd('exec');
			var path = el.attrd('path');
			var href = el.attrd('href');

			if (el.attrd('prevent') === 'true') {
				e.preventDefault();
				e.stopPropagation();
			}

			attr && EXEC(attr, el, e);
			href && NAV.redirect(href);

			if (path) {
				var val = el.attrd('value');
				if (val == null) {
					var a = new Function('return ' + el.attrd('value-a'))();
					var b = new Function('return ' + el.attrd('value-b'))();
					var v = GET(path);
					if (v === a)
						SET(path, b, true);
					else
						SET(path, a, true);
				} else
					SET(path, new Function('return ' + val)(), true);
			}
		});
	};
});

COMPONENT('error', function(self, config) {

	self.readonly();
	self.nocompile();

	self.make = function() {
		self.aclass('ui-error hidden');
	};

	self.setter = function(value) {

		if (!(value instanceof Array) || !value.length) {
			self.tclass('hidden', true);
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++)
			builder.push('<div><span class="fa {1}"></span>{0}</div>'.format(value[i].error, 'fa-' + (config.icon || 'warning')));

		self.html(builder.join(''));
		self.tclass('hidden', false);
	};
});

COMPONENT('search', 'class:hidden;delay:50;attribute:data-search', function(self, config) {
	self.readonly();
	self.setter = function(value) {

		if (!config.selector || !config.attribute || value == null)
			return;

		setTimeout2('search' + self.ID, function() {

			var elements = self.find(config.selector);
			if (!value) {
				elements.rclass(config.class);
				return;
			}

			var search = value.toSearch();

			elements.each(function() {
				var el = $(this);
				var val = (el.attr(config.attribute) || el.text()).toSearch();
				el.tclass(config.class, val.indexOf(search) === -1);
			});

		}, config.delay);
	};
});

COMPONENT('binder', function(self) {

	var keys, keys_unique;

	self.readonly();
	self.blind();

	self.make = function() {
		self.watch('*', self.autobind);
		self.scan();

		var fn = function() {
			setTimeout2(self.id, self.scan, 200);
		};

		self.on('import', fn);
		self.on('component', fn);
		self.on('destroy', fn);
	};

	self.autobind = function(path) {

		var mapper = keys[path];
		if (!mapper)
			return;

		var template = {};

		for (var i = 0, length = mapper.length; i < length; i++) {
			var item = mapper[i];
			var value = GET(item.path);
			var element = item.selector ? item.element.find(item.selector) : item.element;

			template.value = value;
			item.classes && classes(element, item.classes(value));

			var is = true;

			if (item.visible) {
				is = !!item.visible(value);
				element.tclass('hidden', !is);
			}

			if (is) {
				item.html && element.html(item.Ta ? item.html(template) : item.html(value));
				item.disable && element.prop('disabled', item.disable(value));
				item.src && element.attr('src', item.src(value));
				item.href && element.attr('href', item.href(value));
				item.exec && EXEC(item.exec, element, value, item.path);
			}
		}
	};

	function classes(element, val) {
		var add = '';
		var rem = '';
		var classes = val.split(' ');

		for (var i = 0; i < classes.length; i++) {
			var item = classes[i];
			switch (item.substring(0, 1)) {
				case '+':
					add += (add ? ' ' : '') + item.substring(1);
					break;
				case '-':
					rem += (rem ? ' ' : '') + item.substring(1);
					break;
				default:
					add += (add ? ' ' : '') + item;
					break;
			}
		}
		rem && element.rclass(rem);
		add && element.aclass(add);
	}

	function decode(val) {
		return val.replace(/&#39;/g, '\'');
	}

	self.prepare = function(code) {
		return code.indexOf('=>') === -1 ? FN('value=>' + decode(code)) : FN(decode(code));
	};

	self.scan = function() {

		keys = {};
		keys_unique = {};

		var keys_news = {};

		self.find('[data-b]').each(function() {

			var el = $(this);
			var path = el.attrd('b').replace('%', 'jctmp.');

			if (path.indexOf('?') !== -1) {
				var scope = el.closest('[data-jc-scope]');
				if (scope) {
					var data = scope.get(0).$scopedata;
					if (data == null)
						return;
					path = path.replace(/\?/g, data.path);
				} else
					return;
			}

			var arr = path.split('.');
			var p = '';

			var classes = el.attrd('b-class');
			var html = el.attrd('b-html');
			var visible = el.attrd('b-visible');
			var disable = el.attrd('b-disable');
			var selector = el.attrd('b-selector');
			var src = el.attrd('b-src');
			var href = el.attrd('b-href');
			var exec = el.attrd('b-exec');
			var obj = el.data('data-b');

			keys_unique[path] = true;

			if (!obj) {
				obj = {};
				obj.path = path;
				obj.element = el;
				obj.classes = classes ? self.prepare(classes) : undefined;
				obj.visible = visible ? self.prepare(visible) : undefined;
				obj.disable = disable ? self.prepare(disable) : undefined;
				obj.selector = selector ? selector : null;
				obj.src = src ? self.prepare(src) : undefined;
				obj.href = href ? self.prepare(href) : undefined;
				obj.exec = exec;

				if (el.attrd('b-template') === 'true') {
					var tmp = el.find('script[type="text/html"]');
					var str = '';

					if (tmp.length)
						str = tmp.html();
					else
						str = el.html();

					if (str.indexOf('{{') !== -1) {
						obj.html = Tangular.compile(str);
						obj.Ta = true;
						tmp.length && tmp.remove();
					}
				} else
					obj.html = html ? self.prepare(html) : undefined;

				el.data('data-b', obj);
				keys_news[path] = true;
			}

			for (var i = 0, length = arr.length; i < length; i++) {
				p += (p ? '.' : '') + arr[i];
				if (keys[p])
					keys[p].push(obj);
				else
					keys[p] = [obj];
			}
		});

		var nk = Object.keys(keys_news);
		for (var i = 0; i < nk.length; i++)
			self.autobind(nk[i]);

		return self;
	};
});

COMPONENT('confirm', function(self) {

	var cls = 'ui-' + self.name;
	var cls2 = '.' + cls;
	var is;
	var events = {};

	self.readonly();
	self.singleton();
	self.nocompile && self.nocompile();

	self.make = function() {

		self.aclass(cls + ' hidden');

		self.event('click', 'button', function() {
			self.hide(+$(this).attrd('index'));
		});

		self.event('click', cls2 + '-close', function() {
			self.callback = null;
			self.hide(-1);
		});

		self.event('click', function(e) {
			var t = e.target.tagName;
			if (t !== 'DIV')
				return;
			var el = self.find(cls2 + '-body');
			el.aclass(cls + '-click');
			setTimeout(function() {
				el.rclass(cls + '-click');
			}, 300);
		});
	};

	events.keydown = function(e) {
		var index = e.which === 13 ? 0 : e.which === 27 ? 1 : null;
		if (index != null) {
			self.find('button[data-index="{0}"]'.format(index)).trigger('click');
			e.preventDefault();
			e.stopPropagation();
			events.unbind();
		}
	};

	events.bind = function() {
		$(W).on('keydown', events.keydown);
	};

	events.unbind = function() {
		$(W).off('keydown', events.keydown);
	};

	self.show2 = function(message, buttons, fn) {
		self.show(message, buttons, function(index) {
			!index && fn();
		});
	};

	self.show = self.confirm = function(message, buttons, fn) {
		self.callback = fn;

		var builder = [];

		for (var i = 0; i < buttons.length; i++) {
			var item = buttons[i];
			var icon = item.match(/"[a-z0-9-]+"/);
			if (icon) {
				item = item.replace(icon, '').trim();
				icon = '<i class="fa fa-{0}"></i>'.format(icon.toString().replace(/"/g, ''));
			} else
				icon = '';

			var color = item.match(/#[0-9a-f]+/i);
			if (color)
				item = item.replace(color, '').trim();

			builder.push('<button data-index="{1}"{3}>{2}{0}</button>'.format(item, i, icon, color ? ' style="background:{0}"'.format(color) : ''));
		}

		self.content('<div class="{0}-message">{1}</div>{2}'.format(cls, message.replace(/\n/g, '<br />'), builder.join('')));
	};

	self.hide = function(index) {
		self.callback && self.callback(index);
		self.rclass(cls + '-visible');
		events.unbind();
		setTimeout2(self.id, function() {
			$('html').rclass(cls + '-noscroll');
			self.aclass('hidden');
		}, 1000);
	};

	self.content = function(text) {
		$('html').aclass(cls + '-noscroll');
		!is && self.html('<div><div class="{0}-body"><span class="{0}-close"><i class="fa fa-times"></i></span></div></div>'.format(cls));
		self.find(cls2 + '-body').append(text);
		self.rclass('hidden');
		events.bind();
		setTimeout2(self.id, function() {
			self.aclass(cls + '-visible');
		}, 5);
	};
});

COMPONENT('form', 'zindex:12;scrollbar:1', function(self, config) {

	var cls = 'ui-form';
	var cls2 = '.' + cls;
	var container;
	var csspos = {};

	if (!W.$$form) {

		W.$$form_level = W.$$form_level || 1;
		W.$$form = true;

		$(document).on('click', cls2 + '-button-close', function() {
			SET($(this).attrd('path'), '');
		});

		var resize = function() {
			setTimeout2('form', function() {
				for (var i = 0; i < M.components.length; i++) {
					var com = M.components[i];
					if (com.name === 'form' && !HIDDEN(com.dom) && com.$ready && !com.$removed)
						com.resize();
				}
			}, 200);
		};

		if (W.OP)
			W.OP.on('resize', resize);
		else
			$(W).on('resize', resize);

		$(document).on('click', cls2 + '-container', function(e) {
			var el = $(e.target);
			if (!(el.hclass(cls + '-container-padding') || el.hclass(cls + '-container')))
				return;
			var form = $(this).find('.ui-form');
			var c = cls + '-animate-click';
			form.aclass(c);
			setTimeout(function() {
				form.rclass(c);
			}, 300);
		});
	}

	self.readonly();
	self.submit = function() {
		if (config.submit)
			EXEC(config.submit, self.hide);
		else
			self.hide();
	};

	self.cancel = function() {
		config.cancel && EXEC(config.cancel, self.hide);
		self.hide();
	};

	self.hide = function() {
		self.set('');
	};

	self.icon = function(value) {
		var el = this.rclass2('fa');
		value.icon && el.aclass('fa fa-' + value.icon);
	};

	self.resize = function() {

		if (self.scrollbar) {
			container.css('height', WH);
			self.scrollbar.resize();
		}

		if (!config.center || self.hclass('hidden'))
			return;

		var ui = self.find(cls2);
		var fh = ui.innerHeight();
		var wh = WH;
		var r = (wh / 2) - (fh / 2);
		csspos.marginTop = (r > 30 ? (r - 15) : 20) + 'px';
		ui.css(csspos);
	};

	self.make = function() {

		$(document.body).append('<div id="{0}" class="hidden {4}-container invisible"><div class="{4}-scrollbar"><div class="{4}-container-padding"><div class="{4}" style="max-width:{1}px"><div data-bind="@config__html span:value.title__change .{4}-icon:@icon" class="{4}-title"><button name="cancel" class="{4}-button-close{3}" data-path="{2}"><i class="fa fa-times"></i></button><i class="{4}-icon"></i><span></span></div></div></div></div>'.format(self.ID, config.width || 800, self.path, config.closebutton == false ? ' hidden' : '', cls));

		var scr = self.find('> script');
		self.template = scr.length ? scr.html().trim() : '';
		if (scr.length)
			scr.remove();

		var el = $('#' + self.ID);
		var body = el.find(cls2)[0];
		container = el.find(cls2 + '-scrollbar');

		if (config.scrollbar) {
			el.css('overflow', 'hidden');
			self.scrollbar = SCROLLBAR(el.find(cls2 + '-scrollbar'), { visibleY: 1 });
	    }

		while (self.dom.children.length)
			body.appendChild(self.dom.children[0]);

		self.rclass('hidden invisible');
		self.replace(el);

		self.event('scroll', function() {
			EMIT('scroll', self.name);
			EMIT('reflow', self.name);
		});

		self.event('click', 'button[name]', function() {
			var t = this;
			switch (t.name) {
				case 'submit':
					self.submit(self.hide);
					break;
				case 'cancel':
					!t.disabled && self[t.name](self.hide);
					break;
			}
		});

		config.enter && self.event('keydown', 'input', function(e) {
			e.which === 13 && !self.find('button[name="submit"]')[0].disabled && setTimeout(self.submit, 800);
		});
	};

	self.configure = function(key, value, init, prev) {
		if (init)
			return;
		switch (key) {
			case 'width':
				value !== prev && self.find(cls2).css('max-width', value + 'px');
				break;
			case 'closebutton':
				self.find(cls2 + '-button-close').tclass('hidden', value !== true);
				break;
		}
	};

	self.setter = function(value) {

		setTimeout2(cls + '-noscroll', function() {
			$('html').tclass(cls + '-noscroll', !!$(cls2 + '-container').not('.hidden').length);
		}, 50);

		var isHidden = value !== config.if;

		if (self.hclass('hidden') === isHidden)
			return;

		setTimeout2(cls, function() {
			EMIT('reflow', self.name);
		}, 10);

		if (isHidden) {
			self.aclass('hidden');
			self.release(true);
			self.find(cls2).rclass(cls + '-animate');
			W.$$form_level--;
			return;
		}

		if (self.template) {
			var is = self.template.COMPILABLE();
			self.find(cls2).append(self.template);
			self.template = null;
			is && COMPILE();
		}

		if (W.$$form_level < 1)
			W.$$form_level = 1;

		W.$$form_level++;

		self.css('z-index', W.$$form_level * config.zindex);
		self.element.scrollTop(0);
		self.rclass('hidden');

		self.resize();
		self.release(false);

		config.reload && EXEC(config.reload, self);
		config.default && DEFAULT(config.default, true);

		if (!isMOBILE && config.autofocus) {
			var el = self.find(config.autofocus ? 'input[type="text"],select,textarea' : config.autofocus);
			el.length && el[0].focus();
		}

		setTimeout(function() {
			self.rclass('invisible');
			self.element.scrollTop(0);
			self.find(cls2).aclass(cls + '-animate');
		}, 300);

		// Fixes a problem with freezing of scrolling in Chrome
		setTimeout2(self.ID, function() {
			self.css('z-index', (W.$$form_level * config.zindex) + 1);
		}, 500);
	};
});

COMPONENT('loading', function(self) {
	var pointer;

	self.readonly();
	self.singleton();
	self.nocompile();

	self.make = function() {
		self.aclass('ui-loading');
		self.append('<div></div>');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.rclass('hidden');
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			self.aclass('hidden');
		}, timeout || 1);
		return self;
	};
});

COMPONENT('repeater', function(self) {

	var filter = null;
	var recompile = false;
	var reg = /\$(index|path)/g;

	self.readonly();

	self.configure = function(key, value) {
		if (key === 'filter')
			filter = value ? GET(value) : null;
	};

	self.make = function() {
		var element = self.find('script');

		if (!element.length) {
			element = self.element;
			self.element = self.element.parent();
		}

		var html = element.html();
		element.remove();
		self.template = Tangular.compile(html);
		recompile = (/data-jc="|data-bind="/).test(html);
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			item.index = i;
			if (!filter || filter(item)) {
				builder.push(self.template(item).replace(reg, function(text) {
					return text.substring(0, 2) === '$i' ? i.toString() : self.path + '[' + i + ']';
				}));
			}
		}

		self.html(builder.join(''));
		recompile && self.compile();
	};
});

COMPONENT('repeatergroup', function(self, config) {

	var html, template_group;
	var reg = /\$(index|path)/g;
	var force = false;
	var recompile = false;

	self.readonly();

	self.released = function(is) {
		if (is) {
			html = self.html();
			self.empty();
		} else
			html && self.html(html);
	};

	self.make = function() {
		self.find('script').each(function(index) {
			var element = $(this);
			var html = element.html();
			element.remove();
			if (index)
				template_group = Tangular.compile(html);
			else
				self.template = Tangular.compile(html);
			!recompile && (recompile = html.COMPILABLE());
		});
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		if (key === 'group') {
			force = true;
			self.refresh();
		}
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		if (!force && NOTMODIFIED(self.id, value))
			return;

		force = false;
		html = '';
		var length = value.length;
		var groups = {};

		for (var i = 0; i < length; i++) {
			var name = value[i][config.group] || '0';
			if (groups[name])
				groups[name].push(value[i]);
			else
				groups[name] = [value[i]];
		}

		var index = 0;
		var indexgroup = 0;
		var builder = '';
		var keys = Object.keys(groups);

		keys.quicksort();
		keys.forEach(function(key) {
			var arr = groups[key];
			var tmp = '';

			for (var i = 0, length = arr.length; i < length; i++) {
				var item = arr[i];
				tmp += self.template(item).replace(reg, function(text) {
					return text.substring(0, 2) === '$i' ? index.toString() : self.path + '[' + index + ']';
				});
				item.index = index++;
			}

			if (key !== '0') {
				var options = {};
				options[config.group] = key;
				options.length = arr.length;
				options.index = indexgroup++;
				options.body = tmp;
				builder += template_group(options);
			}

		});

		self.html(builder);
		recompile && COMPILE();
	};
});

COMPONENT('textbox', function(self, config) {

	var input, content = null, isfilled = false;
	var innerlabel = function() {
		var is = !!input[0].value;
		if (isfilled !== is) {
			isfilled = is;
			self.tclass('ui-textbox-filled', isfilled);
		}
	};

	self.nocompile && self.nocompile();

	self.validate = function(value) {

		if ((!config.required || config.disabled) && !self.forcedvalidation())
			return true;

		if (self.type === 'date')
			return value instanceof Date && !isNaN(value.getTime());

		if (value == null)
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		if (config.minlength && value.length < config.minlength)
			return false;

		switch (self.type) {
			case 'email':
				return value.isEmail();
			case 'phone':
				return value.isPhone();
			case 'url':
				return value.isURL();
			case 'currency':
			case 'number':
				return value > 0;
		}

		return config.validation ? !!self.evaluate(value, config.validation, true) : value.length > 0;
	};

	self.make = function() {

		content = self.html();

		self.type = config.type;
		self.format = config.format;

		self.event('click', '.fa-calendar', function(e) {
			if (!config.disabled && !config.readonly && config.type === 'date') {
				e.preventDefault();
				SETTER('calendar', 'toggle', self.element, self.get(), function(date) {
					self.change(true);
					self.set(date);
				});
			}
		});

		self.event('click', '.fa-caret-up,.fa-caret-down', function() {
			if (!config.disabled && !config.readonly && config.increment) {
				var el = $(this);
				var inc = el.hclass('fa-caret-up') ? 1 : -1;
				self.change(true);
				self.inc(inc);
			}
		});

		self.event('click', '.ui-textbox-label', function() {
			input.focus();
		});

		self.event('click', '.ui-textbox-control-icon', function() {
			if (config.disabled || config.readonly)
				return;
			if (self.type === 'search') {
				self.$stateremoved = false;
				$(this).rclass('fa-times').aclass('fa-search');
				self.set('');
			} else if (self.type === 'password') {
				var el = $(this);
				var type = input.attr('type');

				input.attr('type', type === 'text' ? 'password' : 'text');
				el.rclass2('fa-').aclass(type === 'text' ? 'fa-eye' : 'fa-eye-slash');
			} else if (config.iconclick)
				EXEC(config.iconclick, self);
		});

		self.event('focus', 'input', function() {
			if (!config.disabled && !config.readonly && config.autocomplete)
				EXEC(config.autocomplete, self);
		});

		self.event('input', 'input', innerlabel);
		self.redraw();
		config.iconclick && self.configure('iconclick', config.iconclick);
	};

	self.setter2 = function(value) {
		if (self.type === 'search') {
			if (self.$stateremoved && !value)
				return;
			self.$stateremoved = !value;
			self.find('.ui-textbox-control-icon').tclass('fa-times', !!value).tclass('fa-search', !value);
		}
		innerlabel();
	};

	self.redraw = function() {

		var attrs = [];
		var builder = [];
		var tmp = 'text';

		switch (config.type) {
			case 'password':
				tmp = config.type;
				break;
			case 'number':
			case 'phone':
				isMOBILE && (tmp = 'tel');
				break;
		}

		self.tclass('ui-disabled', config.disabled === true);
		self.tclass('ui-textbox-required', config.required === true);
		self.type = config.type;
		attrs.attr('type', tmp);
		config.placeholder && !config.innerlabel && attrs.attr('placeholder', config.placeholder);
		config.maxlength && attrs.attr('maxlength', config.maxlength);
		config.keypress != null && attrs.attr('data-jc-keypress', config.keypress);
		config.delay && attrs.attr('data-jc-keypress-delay', config.delay);
		config.disabled && attrs.attr('disabled');
		config.readonly && attrs.attr('readonly');
		config.error && attrs.attr('error');
		attrs.attr('data-jc-bind', '');

		if (config.autofill) {
			attrs.attr('name', self.path.replace(/\./g, '_'));
			self.autofill && self.autofill();
		} else {
			attrs.attr('name', 'input' + Date.now());
			attrs.attr('autocomplete', 'new-password');
		}

		config.align && attrs.attr('class', 'ui-' + config.align);
		!isMOBILE && config.autofocus && attrs.attr('autofocus');

		builder.push('<div class="ui-textbox-input"><input {0} /></div>'.format(attrs.join(' ')));

		var icon = config.icon;
		var icon2 = config.icon2;

		if (!icon2 && self.type === 'date')
			icon2 = 'calendar';
		else if (!icon2 && self.type === 'password')
			icon2 = 'eye';
		else if (self.type === 'search')
			icon2 = 'search';

		icon2 && builder.push('<div class="ui-textbox-control"><span class="fa fa-{0} ui-textbox-control-icon"></span></div>'.format(icon2));
		config.increment && !icon2 && builder.push('<div class="ui-textbox-control"><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');

		if (config.label)
			content = config.label;

		self.tclass('ui-textbox-innerlabel', !!config.innerlabel);

		if (content.length) {
			var html = builder.join('');
			builder = [];
			builder.push('<div class="ui-textbox-label">');
			icon && builder.push('<i class="fa fa-{0}"></i> '.format(icon));
			builder.push('<span>' + content + (content.substring(content.length - 1) === '?' ? '' : ':') + '</span>');
			builder.push('</div><div class="ui-textbox">{0}</div>'.format(html));
			config.error && builder.push('<div class="ui-textbox-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
			self.html(builder.join(''));
			self.aclass('ui-textbox-container');
			input = self.find('input');
		} else {
			config.error && builder.push('<div class="ui-textbox-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
			self.aclass('ui-textbox ui-textbox-container');
			self.html(builder.join(''));
			input = self.find('input');
		}
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'readonly':
				self.find('input').prop('readonly', value);
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('input').prop('disabled', value);
				self.reset();
				break;
			case 'format':
				self.format = value;
				self.refresh();
				break;
			case 'required':
				self.noValid(!value);
				!value && self.state(1, 1);
				self.tclass('ui-textbox-required', value === true);
				break;
			case 'placeholder':
				input.prop('placeholder', value || '');
				break;
			case 'maxlength':
				input.prop('maxlength', value || 1000);
				break;
			case 'autofill':
				input.prop('name', value ? self.path.replace(/\./g, '_') : '');
				break;
			case 'label':
				if (content && value)
					self.find('.ui-textbox-label span').html(value);
				else
					redraw = true;
				content = value;
				break;
			case 'type':
				self.type = value;
				if (value === 'password')
					value = 'password';
				else
					self.type = 'text';
				self.find('input').prop('type', self.type);
				break;
			case 'align':
				input.rclass(input.attr('class')).aclass('ui-' + value || 'left');
				break;
			case 'autofocus':
				input.focus();
				break;
			case 'icon2click': // backward compatibility
			case 'iconclick':
				config.iconclick = value;
				self.find('.ui-textbox-control').css('cursor', value ? 'pointer' : 'default');
				break;
			case 'icon':
				var tmp = self.find('.ui-textbox-label .fa');
				if (tmp.length)
					tmp.rclass2('fa-').aclass('fa-' + value);
				else
					redraw = true;
				break;
			case 'icon2':
			case 'increment':
				redraw = true;
				break;
			case 'labeltype':
				redraw = true;
				break;
		}

		redraw && setTimeout2('redraw.' + self.id, function() {
			self.redraw();
			self.refresh();
		}, 100);
	};

	self.formatter(function(path, value) {
		if (value) {
			switch (config.type) {
				case 'lower':
					value = value.toString().toLowerCase();
					break;
				case 'upper':
					value = value.toString().toUpperCase();
					break;
			}
		}
		return config.type === 'date' ? (value ? value.format(config.format || 'yyyy-MM-dd') : value) : value;
	});

	self.parser(function(path, value) {
		if (value) {
			switch (config.type) {
				case 'lower':
					value = value.toLowerCase();
					break;
				case 'upper':
					value = value.toUpperCase();
					break;
			}
		}
		return value ? config.spaces === false ? value.replace(/\s/g, '') : value : value;
	});

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : self.forcedvalidation() ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.tclass('ui-textbox-invalid', invalid);
		config.error && self.find('.ui-textbox-helper').tclass('ui-textbox-helper-show', invalid);
	};

	self.forcedvalidation = function() {
		var val = self.get();
		return (self.type === 'phone' || self.type === 'email') && (val != null && (typeof val === 'string' && val.length !== 0));
	};
});

COMPONENT('importer', function(self, config) {

	var init = false;
	var clid = null;
	var content = '';

	self.readonly();

	self.make = function() {
		var scr = self.find('script');
		content = scr.length ? scr.html() : '';
	};

	self.reload = function(recompile) {
		config.reload && EXEC(config.reload);
		recompile && COMPILE();
	};

	self.setter = function(value) {

		if (config.if !== value) {
			if (config.cleaner && init && !clid)
				clid = setTimeout(self.clean, config.cleaner * 60000);
			return;
		}

		if (clid) {
			clearTimeout(clid);
			clid = null;
		}

		if (init) {
			self.reload();
			return;
		}

		init = true;

		if (content) {
			self.html(content);
			setTimeout(self.reload, 50, true);
		} else
			self.import(config.url, self.reload);
	};

	self.clean = function() {
		config.clean && EXEC(config.clean);
		setTimeout(function() {
			self.empty();
			init = false;
			clid = null;
		}, 1000);
	};
});

COMPONENT('visible', function(self, config) {
	var processed, is = false;
	var old = null;

	self.readonly();
	self.setter = function(value) {

		var condition = config.if;

		if (condition)
			is = self.evaluate(condition);
		else
			is = value ? true : false;

		if (old === is)
			return;

		if (is && config.template && !processed) {
			self.import(config.template, NOOP, false);
			processed = true;
		}

		self.tclass('hidden', !is);
		old = is;
	};
});

COMPONENT('validation', 'delay:100;flags:visible', function(self, config) {

	var path, elements = null;
	var def = 'button[name="submit"]';
	var flags = null;

	self.readonly();

	self.make = function() {
		elements = self.find(config.selector || def);
		path = self.path.replace(/\.\*$/, '');
		setTimeout(function() {
			self.watch(self.path, self.state, true);
		}, 50);
	};

	self.configure = function(key, value, init) {
		switch (key) {
			case 'selector':
				if (!init)
					elements = self.find(value || def);
				break;
			case 'flags':
				if (value) {
					flags = value.split(',');
					for (var i = 0; i < flags.length; i++)
						flags[i] = '@' + flags[i];
				} else
					flags = null;
				break;
		}
	};

	self.state = function() {
		setTimeout2(self.id, function() {
			var disabled = DISABLED(path, flags);
			if (!disabled && config.if)
				disabled = !EVALUATE(self.path, config.if);
			elements.prop('disabled', disabled);
		}, config.delay);
	};
});

COMPONENT('websocket', 'reconnect:3000;encoder:true', function(self, config) {

	var ws, url;
	var queue = [];
	var sending = false;

	self.online = false;
	self.readonly();
	self.nocompile && self.nocompile();

	self.make = function() {
		url = (config.url || '').env(true);
		if (!url.match(/^(ws|wss):\/\//))
			url = (location.protocol.length === 6 ? 'wss' : 'ws') + '://' + location.host + (url.substring(0, 1) !== '/' ? '/' : '') + url;
		setTimeout(self.connect, 500);
		self.destroy = self.close;

		$(W).on('offline', function() {
			self.close();
		});

		$(W).on('online', function() {
			setTimeout(self.connect, config.reconnect);
		});

	};

	self.send = function(obj) {
		var data = JSON.stringify(obj);
		if (config.encoder)
			queue.push(encodeURIComponent(data));
		else
			queue.push(data);
		self.process();
		return self;
	};

	self.process = function(callback) {

		if (!ws || !ws.send || sending || !queue.length || ws.readyState !== 1) {
			callback && callback();
			return;
		}

		sending = true;
		var async = queue.splice(0, 3);

		async.wait(function(item, next) {
			if (ws) {
				ws.send(item);
				setTimeout(next, 5);
			} else {
				queue.unshift(item);
				next();
			}
		}, function() {
			callback && callback();
			sending = false;
			queue.length && self.process();
		});
	};

	self.close = function(isClosed) {
		if (!ws)
			return self;
		self.online = false;
		ws.onopen = ws.onclose = ws.onmessage = null;
		!isClosed && ws.close();
		ws = null;
		self.isonline(false);
		return self;
	};

	self.isonline = function(is) {
		if (config.online)
			self.EXEC(config.online, is);
		else
			EMIT('online', is);
	};

	function onClose(e) {

		if (e.code === 4001) {
			location.href = location.href + '';
			return;
		}

		e.reason && WARN('WebSocket:', config.encoder ? decodeURIComponent(e.reason) : e.reason);
		self.close(true);
		setTimeout(self.connect, config.reconnect);
	}

	function onMessage(e) {

		var data;

		try {
			data = PARSE(config.encoder ? decodeURIComponent(e.data) : e.data);
		} catch (e) {
			return;
		}

		if (config.message)
			self.EXEC(config.message, data);
		else
			EMIT('message', data);
	}

	function onOpen() {
		self.online = true;
		self.process(function() {
			self.isonline(true);
		});
	}

	self.connect = function() {
		ws && self.close();
		setTimeout2(self.ID, function() {
			ws = new WebSocket(url.env(true));
			ws.onopen = onOpen;
			ws.onclose = onClose;
			ws.onmessage = onMessage;
		}, 100);
		return self;
	};
});

COMPONENT('designer', function(self, config, cls) {

	var svg, connection;
	var drag = {};
	var skip = false;
	var data, selected = [], dragdrop, container, lines, main, scroller, touch, anim;
	var move = { x: 0, y: 0, drag: false, node: null, offsetX: 0, offsetY: 0, type: 0, scrollX: 0, scrollY: 0, moveby: { x: 0, y: 0 } };
	var select = { x: 0, y: 0, active: false, origin: { x: 0, y: 0 }, items: [] };
	var selector;
	var zoom = 1;
	var animcache = {};
	var animrunning = {};
	var animtoken = 0;
	var icons = getIcons();

	self.nocompile();

	function findPoint(selector, x, y) {
		var arr = svg.find(selector);
		var o = svg.offset();

		x += o.left;
		y += o.top;

		for (var i = 0, length = arr.length; i < length; i++) {
			var el = arr[i];
			var off = el.getBoundingClientRect();
			var ax = x - off.width;
			var ay = y - off.height;
			if (off.left >= ax && x <= off.right && off.top >= ay && y <= off.bottom)
				return el;
		}
		return svg.get(0);
	}

	function translateAlong(count, path) {
		var l = path.getTotalLength();
		var t = (l / 100) * count;
		var p = path.getPointAtLength(t);
		return 'translate(' + p.x + ',' + p.y + ')';
	}

	self.animclear = function() {
		animcache = {};
		animrunning = {};
	};

	self.newdata = function(id, count) {

		var el = document.querySelectorAll('.' + id);
		if (!el.length)
			return;

		var speed = 3;

		for (var x = 0; x < el.length; x++) {
			var p = el[x];

			if (!p || p.hidden)
				continue;

			if (count) {
				var length = (p.getTotalLength() / 60) >> 0;
				if (animcache[id]) {
					animcache[id] += count;
					if (animrunning[id] > 0) {
						if (animrunning[id] < length) {
							length = length - animrunning[id];
							for (var i = 0; i < length + 1; i++)
								self.animdata(id, p, speed);
						}
						return;
					}
				} else
					animcache[id] = count;

				var delay = 100;

				if (count > 1 && count > length)
					count = length;

				animcache[id] -= count;

				if (animcache[id] < 0)
					animcache[id] = 0;

				if (animcache[id] > 20)
					speed = 5;

				if (animcache[id] > 50)
					speed = 10;

				if (animcache[id] > 100)
					animcache[id] = 10;

				for (var i = 0; i < count; i++) {
					setTimeout(function(p, id) {
						!document.hidden && self.animdata(id, p, speed);
					}, delay * i, p, id);
				}

			} else if (animcache[id]) {

				animcache[id]--;

				if (animcache[id] < 0)
					animcache[id] = 0;

				setTimeout(function(p, id) {
					self.animdata(id, p, speed);
				}, 100, p, id);

			}
		}
	};

	self.animdata = function(id, p, speed) {

		var el = anim.asvg('circle').aclass('data').attr('r', 5);
		el.$path = p;
		el.$count = 0;
		el.$token = animtoken;

		if (animrunning[id])
			animrunning[id]++;
		else
			animrunning[id] = 1;

		var fn = function() {

			el.$count += (speed || 3);

			if (!el.$path || document.hidden || el.$token !== animtoken) {
				el.remove();
				animrunning[id]--;
				return;
			}

			if (el.$count >= 100) {
				animrunning[id]--;
				el.remove();
				self.newdata(id);
				return;
			} else
				el.attr('transform', translateAlong(el.$count, el.$path));

			requestAnimationFrame(fn);
		};

		requestAnimationFrame(fn);
	};

	self.readonly();

	self.make = function() {
		var url = location.pathname;
		if (url.substring(url.length - 1) !== '/')
			url += '/';

		scroller = self.element.parent();
		self.aclass(cls);
		self.append('<div class="ui-designer-grid"><svg width="6000" height="6000"><defs><filter id="svgshadow" x="0" y="0" width="180%" height="180%"><feGaussianBlur in="SourceAlpha" stdDeviation="5"/><feOffset dx="2" dy="2" result="offsetblur"/><feComponentTransfer><feFuncA type="linear" slope="0.20"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter><pattern patternUnits="userSpaceOnUse" id="svggrid" x="0" y="0" width="150" height="150"><image width="150" height="150" xlink:href="{0}img/theme{1}.png" /></pattern></defs><g class="svggrid"><rect id="svggridbg" width="15000" height="15000" fill="url(#svggrid)" /></g></svg></div>'.format(url, common.theme || 'white'));

		var tmp = self.find('svg');

		svg = $(tmp.get(0));
		main = svg.asvg('g');
		connection = main.asvg('path').attr('class', 'connection');
		lines = main.asvg('g');
		container = main.asvg('g');
		anim = svg.asvg('g').attr('class', 'animations');
		selector = svg.asvg('rect').attr('class', 'selector').attr('opacity', 0).attr('rx', 5).attr('ry', 5);
		self.resize();

		tmp.on('mouseleave', function(e) {
			if (!common.touches && move.drag)
				self.mup(e.pageX, e.pageY, 0, 0, e);
		});

		tmp.on('contextmenu', function(e) {

			var target = $(e.target);
			var node = target.closest('.node');
			var item = null;
			var isconn = false;

			e.preventDefault();

			if (node.length) {
				var id = node.attrd('id');
				item = self.get().findItem('id', id);
			} else if (target.hclass('node_connection')) {
				isconn = true;
				item = target;
			}

			EMIT('designer.contextmenu', item, e, isconn, target);
		});

		tmp.on('mousedown mousemove mouseup', function(e) {

			if (common.touches)
				return;

			if (select.active && !(e.ctrlKey || e.metaKey)) {
				select.active = false;
				selector.attr('height', 0).attr('width', 0).attr('opacity', 0);
				return;
			}

			var offset;

			if (e.type === 'mousemove') {
				if (move.drag) {
					offset = offsetter(e);
					self.mmove(e.pageX, e.pageY, offset.x, offset.y, e);
				}
				if ((e.ctrlKey || e.metaKey) && select.active) {
					self.selectormove(e);
				}
			} else {
				offset = offsetter(e);
				if (e.type === 'mouseup') {
					if ((e.ctrlKey || e.metaKey) && select.active)
						return self.selectorup(e);
					self.mup(e.pageX, e.pageY, offset.x, offset.y, e);
				} else {
					if ((e.ctrlKey || e.metaKey) && !select.active && $(e.target).attr('id') === 'svggridbg')
						return self.selectordown(e);
					self.mdown(e.pageX, e.pageY, offset.x, offset.y, e);
				}
			}
		});

		var touch;

		tmp.on('touchstart touchmove touchend', function(evt) {

			if (!common.touches)
				return;

			var e = evt.touches[0];
			var offset;

			if (evt.type === 'touchmove') {
				offset = offsetter(evt);
				touch = evt;
				if (move.drag) {
					if (move.type === 2 || move.type === 3) {
						offset.x += move.scrollX;
						offset.y += move.scrollY;
					}
					self.mmove(e.pageX, e.pageY, offset.x, offset.y, evt);
					evt.preventDefault();
				}
			} else if (evt.type === 'touchend') {

				if (touch) {
					offset = offsetter(touch);
					e = touch.touches[0];

					if (move.type === 2 || move.type === 3) {
						offset.x += move.scrollX;
						offset.y += move.scrollY;
					}

					touch.target = move.node ? findPoint(move.node.hclass('output') ? '.input' : '.output', move.tx, move.ty) : svg.get(0);
					self.mup(e.pageX, e.pageY, offset.x, offset.y, touch);
					touch = null;
				}

			} else {
				offset = offsetter(evt);
				move.scrollX = +scroller.prop('scrollLeft');
				move.scrollY = +scroller.prop('scrollTop');
				touch = evt;
				self.mdown(e.pageX, e.pageY, offset.x, offset.y, evt);
			}
		});

		$(window).on('keyup', function(e) {
			if (!(e.ctrlKey || e.metaKey))
				self.allowedselected = [];

			if (e.target.tagName === 'BODY' && e.which === 17)
				tmp.css('cursor', 'move');
		});

		$(window).on('keydown', function(e) {

			if (e.ctrlKey || e.metaKey)
				self.allowedselected = [];

			if (e.target.tagName === 'BODY') {

				if (e.ctrlKey || e.metaKey)
					tmp.css('cursor', 'default');
				else
					tmp.css('cursor', 'move');

				var step = e.shiftKey ? 100 : 0;
				if (e.keyCode === 38) {
					self.move(0, -20 - step, e);
				} else if (e.keyCode === 40) {
					self.move(0, 20 + step, e);
				} else if (e.keyCode === 39) {
					self.move(20 + step, 0, e);
				} else if (e.keyCode === 37) {
					self.move(-20 - step, 0, e);
				}
			}

			if ((e.keyCode !== 8 && e.keyCode !== 46) || !selected || self.disabled || e.target.tagName !== 'BODY')
				return;

			self.remove();
			e.preventDefault();
		});

		self.mmove = function(x, y, offsetX, offsetY, e) {
			switch (move.type) {
				case 1:
					scroller.prop('scrollLeft', move.x - x).prop('scrollTop', move.y - y);
					return;
				case 2:
				case 3:
					var off = svg.offset();
					var tx = x - off.left;
					var ty = y - off.top;

					if (zoom !== 1) {
						tx = (tx / zoom);
						ty = (ty / zoom);
					}

					connection.attr('d', diagonal(move.x, move.y, tx, ty));
					move.tx = tx;
					move.ty = ty;
					break;
				case 5:
					move.moved = true;
					// Current node
					if (!selected.length)
						break;
					var mousepos = offsetter(e);
					var off = svg.offset();
					// mouse position within svg
					mousepos.x = mousepos.x - off.left;
					mousepos.y = mousepos.y - off.top;

					var mpos = offsetter(e);
					var off = svg.offset();

					var newposx = mpos.x - off.left;
					var newposy = mpos.y - off.top;
					var mbx = move.mposx - newposx;
					var mby = move.mposy - newposy;

					move.moveby.x += mbx;
					move.moveby.y += mby;

					if (move.moveby.x >= 3 || move.moveby.x <= -3) {
						self.move(-move.moveby.x, 0, e);
						move.moveby.x = 0;
					}

					if (move.moveby.y >= 3 || move.moveby.y <= -3) {
						self.move(0, -move.moveby.y, e);
						move.moveby.y = 0;
					}

					move.mposx = newposx;
					move.mposy = newposy;
			}
		};

		self.mup = function(x, y, offsetX, offsetY, e) {

			if (!move.moved) {
				if (move.node && move.node[0] && move.node[0].tagName !== 'path')
					self.select(move.node, e, 'component');
			}

			var el = $(e.target);
			switch (move.type) {
				case 2:
					connection.attr('d', '');
					if (el.hclass('input')) {
						var oindex = +move.node.attrd('index');
						var output = move.node.closest('.node');
						var input = el.closest('.node');
						var iindex = el.attrd('index');
						var instance = flow.components.findItem('id', output.attrd('id'));
						if (instance) {
							var id = input.attrd('id');
							var is = false;
							if (instance.connections[oindex]) {
								if (instance.connections[oindex].flowConnection(iindex, id))
									is = true;
								else
									instance.connections[oindex].push({ index: iindex, id: id });
							} else
								instance.connections[oindex] = [{ index: iindex, id: id }];
							!is && self.connect(+iindex, oindex, output, input, true);
						}
					}
					break;
				case 3:
					connection.attr('d', '');
					if (el.hclass('output')) {
						var oindex = +el.attrd('index');
						var output = el.closest('.node');
						var input = move.node.closest('.node');
						var iindex = move.node.attrd('index');
						var instance = flow.components.findItem('id', output.attrd('id'));
						if (instance) {
							var id = input.attrd('id');
							var is = false;
							if (instance.connections[oindex]) {
								if (instance.connections[oindex].flowConnection(iindex, id))
									is = true;
								else
									instance.connections[oindex].push({ index: iindex, id: id });
							} else
								instance.connections[oindex] = [{ index: iindex, id: id }];
							!is && self.connect(+iindex, oindex, output, input, true);
						}
					}
					break;
				case 5:
					if (move.moved)
						EMIT('changed', 'mov', move.node.attrd('id'));
					break;
			}
			move.type === 1 && savescrollposition();
			move.type = 0;
			move.drag = false;
		};

		self.mdown = function(x, y, offsetX, offsetY, e) {

			var el = $(e.target);
			var tmp;

			move.drag = true;
			move.moved = false;

			var mpos = offsetter(e);
			var off = svg.offset();
			// mouse position within svg
			move.mposx = mpos.x - off.left;
			move.mposy = mpos.y - off.top;

			if (e.target.tagName === 'svg' || e.target.id === 'svggridbg') {
				move.x = x + scroller.prop('scrollLeft');
				move.y = y + scroller.prop('scrollTop');
				move.type = 1;
				move.node = null;
				self.select(null);
				return;
			}

			if (el.hclass('output')) {
				// output point
				move.type = 2;
				move.node = el;
				tmp = getTranslate(el.closest('.node'));
				var x = tmp.x + (+el.attr('cx'));
				var y = tmp.y + (+el.attr('cy'));
				move.x = x;
				move.y = y;
			} else if (el.hclass('input')) {
				// input point
				move.type = 3;
				move.node = el;
				tmp = getTranslate(el.closest('.node'));
				var x = tmp.x + (+el.attr('cx'));
				var y = tmp.y + (+el.attr('cy'));
				move.x = x;
				move.y = y;
			} else if (el.hclass('node_connection')) {
				// connection
				move.type = 4;
				move.node = el;
				move.drag = false;
				self.select(el, e, 'connection');
			} else if (el.hclass('click')) {
				tmp = el.closest('.node').attrd('id');
				move.drag = false;
				if (BLOCKED('click.' + tmp, 1000))
					return;
				EMIT('designer.click', tmp);
			} else {
				tmp = el.closest('.node');
				var ticks = Date.now();

				if (move.node && tmp.get(0) === move.node.get(0)) {
					var diff = ticks - move.ticks;
					if (diff < 300) {
						EMIT('designer.settings', move.node.attrd('id'));
						return;
					}
				}

				// node
				move.node = tmp;
				move.ticks = ticks;

				if (!move.node.length) {
					move.drag = false;
					return;
				}

				var transform = getTranslate(move.node);
				move.offsetX = transform.x - offsetX;
				move.offsetY = transform.y - offsetY;
				move.type = 5;

				if (!(e.ctrlKey || e.metaKey) && selected.length < 2)
					self.select(tmp, e, 'component');
			}
		};

		self.remove = function() {
			EMIT('designer.selectable', null);
			var arr = [];

			selected.forEach(function(sel) {
				if (sel.hclass('node'))
					arr.push(sel.attrd('id'));
				else
					arr.push(sel);
			});

			if (!arr.length)
				return;

			if (selected.$type === 'component') {
				EMIT('designer.rem', arr);
			} else if (selected.$type === 'connection') {
				EMIT('designer.rem.connection', arr);
				selected.forEach(function(el) {
					el.remove();
				});
			}
		};

		self.select = function(el, e, type) {

			if (!el)
				SETTER('!menu', 'hide');

			// reset cache for self.move function
			self.allowedselected = [];

			if (selected.$type !== type) {
				selected.forEach(function(el) {
					el.rclass('selected');
				});
				// reset
				selected = [];
				selected.$type = type;
			}

			if ((selected.length && !el)) {
				selected.forEach(function(el) {
					el.rclass('selected');
				});

				selected = [];
				selected.$type = null;
				EMIT('designer.selectable', null);
				return;
			}

			if (selected.length && selected.filter(function(sel) { return sel.get(0) === el.get(0); }).length && (e && (e.ctrlKey || e.metaKey))) {
				selected = selected.filter(function(sel) {
					var is = sel.get(0) === el.get(0);
					is && el.rclass('selected');
					return !is;
				});

				selected.$type = selected.length ? type : null;
				EMIT('designer.selectable', selected);
				return;
			}

			if (!el) {
				selected = [];
				selected.$type = null;
				EMIT('designer.selectable', null);
				return;
			}

			if (selected.length && selected.$type !== type)
				return;

			if (e && (e.ctrlKey || e.metaKey)) {
				selected.push(el);
			} else {
				selected.forEach(function(el) {
					el.rclass('selected');
				});
				selected = [];
				selected.push(el);
			}

			selected.$type = type;

			selected.forEach(function(el) {
				el.aclass('selected');
			});

			EMIT('designer.selectable', selected);
			EMIT('designer.select', el.attrd('id'));
		};

		self.selectormove = function(e) {
			var mousepos = offsetter(e);
			var off = svg.offset();
			// mouse position within svg
			mousepos.x = mousepos.x - off.left;
			mousepos.y = mousepos.y - off.top;

			var width = mousepos.x - select.origin.x;
			var height = mousepos.y - select.origin.y;

			if (height <= 0) {
				height = -height;
				select.y = select.origin.y - height;
			}
			if (width <= 0) {
				width = -width;
				select.x = select.origin.x - width;
			}
			selector.attr('x', select.x).attr('y', select.y).attr('width', width).attr('height', height).attr('opacity', 0.2);
			self.selectMultiple(select.x, select.y, select.x + width, select.y + height, off);
		};

		self.selectorup = function() {
			select.active = false;
			selector.attr('width', 0).attr('height', 0).attr('opacity', 0);
			selected.forEach(function(el){
				$(el).rclass('selected');
			});
			selected = [];
			if (select.items.length)
				select.items.forEach(function(node){
					selected.push(node);
					$(node).aclass('selected');
				});
			selected.$type = 'component';
			select.items = [];
			EMIT('designer.selectable', selected);
		};

		self.selectordown = function(e) {
			select.active = true;
			var mousepos = offsetter(e);
			var off = svg.offset();
			select.x = mousepos.x - off.left;
			select.y = mousepos.y - off.top;
			select.origin.x = mousepos.x - off.left;
			select.origin.y = mousepos.y - off.top;
		};

		self.selectNew = function() {
			self.select();
			var nodes = tmp.find('.node_new');
			nodes.length && nodes.each(function(i, el){
				el = $(el);
				el.aclass('selected');
				selected.push(el);
			});
			selected.$type = 'component';
			EMIT('designer.selectable', selected);
		};

		self.selectMultiple = function(startx, starty, endx, endy, off) {

			self.allowedselected = [];
			select.items = [];

			tmp.find('.node rect.rect').each(function(index, el){
				var pos = el.getBoundingClientRect();
				var $el = $(el);
				var is = false;
				if (startx < pos.x - off.left + 30 && starty < pos.y - off.top + 30 && endx > (pos.x + pos.width - off.left - 15) && endy > (pos.y + pos.height - off.top - 15))
					is = true;
				var el = $el.parent();
				el.tclass('selected', is);
				//el.aclass('select_new');
				is && select.items.push(el);
			});
		};

		self.event('click', 'circle.input, circle.output, polygon', function() {

			var el = $(this);
			var com_el = el.closest('.node');
			var id = com_el.attrd('id');
			var io_index = +el.attrd('index');
			var com = flow.components.findItem('id', id);
			if (!com)
				return;

			setTimeout2(id + io_index, function(){
				if (el.hclass('input')) {
					el.aclass('hidden');
					self.add_cross(el.parent(), id, 'input', io_index, +el.attr('cx') - 6, +el.attr('cy') - 6);
					if (com.disabledio.input.indexOf(io_index) < 0)
						com.disabledio.input.push(io_index);
					!com.isnew && EMIT('designer.component.io', id, 'input', io_index, false);
				} else if (el.hclass('output')) {
					el.aclass('hidden');
					self.add_cross(el.parent(), id, 'output', io_index, +el.attr('cx') - 6, +el.attr('cy') - 6);
					if (com.disabledio.output.indexOf(io_index) < 0)
						com.disabledio.output.push(io_index);
					!com.isnew && EMIT('designer.component.io', id, 'output', io_index, false);
				} else {
					var io = el.attrd('io');
					el.parent().parent().find('.' + io + '[data-index=' + io_index + ']').rclass('hidden');
					el.parent().remove();
					var i = com.disabledio[io].indexOf(io_index);
					if (i > -1)
						com.disabledio[io].splice(i, 1);
					!com.isnew && EMIT('designer.component.io', id, io, io_index, true);
				}
			}, 300);
		});

		self.event('dragover dragenter drag drop', 'svg', function(e) {

			if (common.touches)
				return;

			if (!dragdrop)
				return;

			switch (e.type) {
				case 'dragenter':

					if (!dragdrop.input || !dragdrop.output)
						return;

					if (drag.cache === e.target)
						return;

					if (drag.conn) {
						drag.conn.rclass('dropselection');
						drag.conn = null;
					}

					if (e.target.nodeName === 'path') {
						drag.conn = $(e.target).aclass('dropselection');
					}

					drag.cache = e.target;
					break;

				case 'drop':
					var tmp = $(e.target);
					var is = drag.conn ? true : false;

					if (drag.conn) {
						drag.conn.rclass('dropselection');
						drag.conn = null;
					}

					var off = self.element.offset();

					var x = e.pageX - off.left;
					var y = e.pageY - off.top;

					x += self.element.prop('scrollLeft');
					y += self.element.prop('scrollTop');

					EMIT('designer.add', dragdrop, (x - 50) / zoom, (y - 30) / zoom, is, tmp.attrd('from'), tmp.attrd('to'), +tmp.attrd('toindex'), null, +tmp.attrd('fromindex'));
					break;
			}
			e.preventDefault();
		});
	};

	self.dragdrop = function(el) {
		dragdrop = el;
	};

	self.resize = function() {
		var size = getSize('.body');
		size.height -= self.element.offset().top;
		self.element.css(size);
	};

	self.add = function(item) {

		if (!item.$component)
			return;

		self.find('.node_' + item.id).remove();

		var g = container.asvg('g');
		var err = item.errors ? Object.keys(item.errors) : EMPTYARRAY;
		g.attr('class', 'node node_unbinded selectable' + (err.length ? ' node_errors' : '') + ' node_' + item.id + (item.isnew ? ' node_new' : ''));
		g.attrd('id', item.id);
		var rect = g.asvg('rect');
		g.asvg('text').attr('class', 'node_status node_status_' + item.id).attr('transform', 'translate(2,-8)').text((item.state ? item.state.text : '') || '').attr('fill', (item.state ? item.state.color : '') || 'gray');
		g.asvg('circle').attr('class', 'node_debug blink3' + (item.options && item.options.debug ? '' : ' hidden')).attr('cx', 7).attr('cy', 7).attr('r', 3);

		var icon = null;

		if (item.$component && item.$component.icon) {
			icon = item.$component.icon;
			if (icon)
				icon = icons[icon];
		}

		var body = g.asvg('g');
		var label = (item.name || item.reference) ? body.asvg('text').attr('transform', 'translate({0}, 0)'.format(icon ? 35 : 0)).attr('class', 'node_label') : null;

		if (label) {
			if (!!window.MSInputMethodContext && !!document.documentMode)
				label.text((item.reference ? ' | | ' : '') + Thelpers.encode(item.name || ''));
			else
				label.html((item.reference ? '<tspan>{0}</tspan> | '.format(item.reference) : '') + Thelpers.encode(item.name || ''));
		}

		var text = body.asvg('text').text(item.$component.name).attr('class', 'node_name').attr('transform', 'translate({1}, {0})'.format(label ? 14 : 5, icon ? 35 : 0));

		var inputcolors = null;
		var input = 0;
		var outputcolors = null;
		var output = 0;

		if (item.input != null) {
			if (item.input instanceof Array) {
				inputcolors = item.input;
				input = inputcolors.length;
			} else
				input = item.input;
		} else if (item.$component.input instanceof Array) {
			inputcolors = item.$component.input;
			input = inputcolors.length;
		} else
			input = item.$component.input;

		if (item.output != null) {
			if (item.output instanceof Array) {
				outputcolors = item.output;
				output = outputcolors.length;
			} else
				output = item.output;
		} else if (item.$component.output instanceof Array) {
			outputcolors = item.$component.output;
			output = outputcolors.length;
		} else
			output = item.$component.output;

		output++;

		var padding = 18;
		var radius = 7;
		var count = Math.max(output || 1, input || 1);
		var height = (label ? (count > 1 ? 0 : 20) : (count > 1 ? 0 : 4)) + 6 + count * padding;
		var width = (Math.max(label ? label.get(0).getComputedTextLength() : 0, text.get(0).getComputedTextLength()) + (output || input ? 30 : 20)) >> 0;

		if (icon)
			width += 34;

		if (icon) {
			g.asvg('text').attr('class', 'icon').attr('text-anchor', 'middle').text(icon).attr('transform', 'translate(20,{0})'.format(((height / 2) >> 0) + 6));
			g.asvg('line').attr('x1', 40).attr('x2', 40).attr('y1', 0).attr('y2', height).attr('class', 'iconline');
		}

		body.attr('transform', 'translate({0}, {1})'.format(output || input ? 15 : 10, (height / 2) - 2));
		var color = item.color || item.$component.color || '#656D78';
		rect.attr('width', width).attr('height', height).attr('rx', 3).attr('ry', 3).attr('fill', color).attr('class', 'rect').attr('stroke', color).attr('stroke-width', 3);

		// Performance killer:
		// rect.attr('filter', 'url(#svgshadow)');

		g.attrd('width', width);
		g.attrd('height', height);

		var points = g.asvg('g');
		var top = ((height / 2) - ((item.$component.input * padding) / 2)) + 10;

		top = ((height / 2) - ((input * padding) / 2)) + 10;

		for (var i = 0; i < input; i++) {
			var o = points.asvg('circle').attr('class', 'input').attrd('index', i).attr('cx', 0).attr('cy', top + i * padding).attr('r', radius);

			// if (title)
			// 	o.aclass('tooltip').attrd('tooltip', title);

			if (inputcolors) {
				var t = inputcolors[i] || '';
				if (t.indexOf('|') !== -1) {
					t = t.split('|');
					var tcolor = (t[0] || '').trim();
					var ttitle = (t[1] || '').trim();
					o.attr('fill', tcolor ? tcolor : common.theme === 'dark' ? 'white' : 'black');
					ttitle && o.aclass('tooltip').attrd('tooltip', ttitle);
				} else {
					if ((/^[a-z]|^#/).test(t))
						o.attr('fill', t);
					else {
						o.attr('fill', common.theme === 'dark' ? 'white' : 'black');
						o.asvg('title').text(t);
					}
				}
			} else
				o.attr('fill', common.theme === 'dark' ? 'white' : 'black');

			if (item.disabledio && item.disabledio.input.indexOf(i) > -1) {
				o.aclass('hidden');
				self.add_cross(points, item.id, 'input', i, -6, -6 + top + i * padding);
			}
		}

		top = ((height / 2) - ((output * padding) / 2)) + 10;

		// titles = item.$component.outputs || EMPTYARRAY;

		for (var i = 0; i < output; i++) {

			// var title = titles[i] || '';
			var err = i === output - 1;
			var o = points.asvg('circle').attr('class', 'output').attrd('index', err ? 99 : i).attr('cx', width).attr('cy', (err ? 8 : 5) + top + i * padding).attr('r', (radius + (err ? -2 : 0)));

			// if (title)
			// 	o.aclass('tooltip').attrd('tooltip', title);

			if (err) {
				o.attr('fill', 'red');
				o.asvg('title').text('Error path');
				continue;
			}

			if (outputcolors) {
				var t = outputcolors[i] || '';
				if (t.indexOf('|') !== -1) {
					t = t.split('|');
					var tcolor = (t[0] || '').trim();
					var ttitle = (t[1] || '').trim();
					o.attr('fill', tcolor ? tcolor : common.theme === 'dark' ? 'white' : 'black');
					ttitle && o.aclass('tooltip').attrd('tooltip', ttitle);
				} else {
					if ((/^[a-z]|^#/).test(t))
						o.attr('fill', t);
					else {
						o.attr('fill', common.theme === 'dark' ? 'white' : 'black');
						o.asvg('title').text(t);
					}
				}
			} else
				o.attr('fill', common.theme === 'dark' ? 'white' : 'black');

			if (item.disabledio && item.disabledio.output.indexOf(i) > -1) {
				o.aclass('hidden');
				self.add_cross(points, item.id, 'output', i, width - 6, top + i * padding);
			}
		}

		if ((item.$component.input || item.$component.output) && item.$component.traffic) {
			var plus = g.asvg('g').attr('class', 'node_traffic').attrd('id', item.id);
			plus.asvg('text').aclass('traffic').attr('transform', 'translate(2,{0})'.format(height + 17)).text('...');
			var plustop = 31;
			if (item.$component.input && item.$component.output) {
				plus.asvg('text').aclass('duration').attr('transform', 'translate(2,{0})'.format(height + plustop)).text('...');
				plustop += 14;
			}
			plus.asvg('g').attr('transform', 'translate(2,{0})'.format(height + plustop)).asvg('text').aclass('pending');
		}

		g.attr('transform', 'translate({0},{1})'.format(item.x, item.y));

		if (item.$component.click) {
			var clicker = g.asvg('g').aclass('click');
			clicker.asvg('rect').aclass('click').attrd('click', 'true').attr('transform', 'translate({0},{1})'.format(width / 2 - 7, height - 7)).attr('width', 14).attr('height', 14).attr('rx', 1).attr('ry', 1);
			clicker.asvg('rect').aclass('click').attrd('click', 'true').attr('transform', 'translate({0},{1})'.format(width / 2 - 2, height - 2)).attr('width', 4).attr('height', 4);
		}

		data[item.id] = item;
	};

	self.add_cross = function (el, id, type, index, tx, ty) {
		var g = el.asvg('g');
		g.attr('transform', 'translate({0},{1})'.format(tx, ty));

		var p = g.asvg('polygon');
		p.attr('transform', 'scale(0.025)');
		p.attr('style', 'fill:#ff0000;stroke:black;stroke-width:75;');
		p.attr('points', '490,386.812 348.187,244.999 490,103.187 386.813,0 245,141.812 103.188,0 0,103.188 141.813,245 0,386.812 103.187,489.999 245,348.187 386.813,490');
		p.attrd('id', id);
		p.attrd('index', index);
		p.attrd('io', type);
	};

	self.move = function(x, y, e) {

		e.preventDefault();

		if (!e.ctrlKey)
			self.allowedselected = [];

		if (selected.length) {
			// Caching

			if (!self.allowedselected.length) {

				self.allowed = {};
				selected.forEach(function(sel){

					var find = function(com) {
						if (com) {
							self.allowed[com.id] = true;
							e.ctrlKey && Object.keys(com.connections).forEach(function(index) {
								com.connections[index].forEach(function(item) {
									self.allowed[item.id] = true;
									find(flow.components.findItem('id', item.id));
								});
							});
						}
					};

					var id = sel.attrd('id');
					find(flow.components.findItem('id', id));
					self.allowedselected.push(id);
					EMIT('changed', 'mov', id);
				});
			}

		} else
			self.allowed = null;

		self.find('.node_connection').each(function() {

			var el = $(this);
			if (self.allowed && !self.allowed[el.attrd('to')] && !self.allowed[el.attrd('from')])
				return;

			var off = el.attrd('offset').split(',');

			if (self.allowed) {

				if (self.allowed[el.attrd('from')]) {
					off[4] = +off[4] + x;
					off[5] = +off[5] + y;
					off[6] = +off[6];
					off[7] = +off[7];
				}

				if (self.allowed[el.attrd('to')]) {
					off[4] = +off[4];
					off[5] = +off[5];
					off[6] = +off[6] + x;
					off[7] = +off[7] + y;
				}

			} else {
				off[4] = +off[4] + x;
				off[5] = +off[5] + y;
				off[6] = +off[6] + x;
				off[7] = +off[7] + y;
			}

			this.setAttribute('data-offset', '{0},{1},{2},{3},{4},{5},{6},{7}'.format(off[0], off[1], off[2], off[3], off[4], off[5], off[6], off[7]));
			el.attr('d', diagonal(off[4], off[5], off[6], off[7]));
		});

		self.find('.node').each(function() {
			var el = $(this);
			if (self.allowed && !self.allowed[el.attrd('id')])
				return;
			var offset = el.attr('transform');
			offset = offset.substring(10, offset.length - 1).split(',');
			var px = +offset[0] + x;
			var py = +offset[1] + y;
			el.attr('transform', 'translate({0},{1})'.format(px, py));
			var instance = flow.components.findItem('id', el.attrd('id'));
			if (instance) {
				instance.x = px;
				instance.y = py;
				EMIT('changed', 'mov', instance.id);
			}
		});
	};

	self.autoconnect = function(reset) {

		reset && self.find('.node_connection').remove();

		for (var i = 0, length = flow.components.length; i < length; i++) {
			var instance = flow.components[i];
			var output = self.find('.node_' + instance.id);
			if (!output.length)
				continue;
			Object.keys(instance.connections).forEach(function(index) {
				var arr = instance.connections[index];
				arr.forEach(function(item) {
					var hash = 'c' + index + '_' + instance.id + 'x' + item.id;
					var e = lines.find('.' + hash);
					if (e.length)
						return;
					var input = self.find('.node_' + item.id);
					input.length && output.length && self.connect(+item.index, +index, output, input);
				});
			});
		}
	};

	self.connect = function(iindex, oindex, output, input, isnew) {

		var a = output.find('.output[data-index="{0}"]'.format(oindex));
		var b = input.find('.input[data-index="{0}"]'.format(iindex));

		var tmp = getTranslate(output);
		var acx = +a.attr('cx');
		var acy = +a.attr('cy');
		var ax = tmp.x + acx;
		var ay = tmp.y + acy;

		tmp = getTranslate(input);
		var bcx = +b.attr('cx');
		var bcy = +b.attr('cy');
		var bx = tmp.x + bcx;
		var by = tmp.y + bcy;

		var aid = output.attrd('id');
		var bid = input.attrd('id');

		if (aid !== bid) {
			var attr = {};
			attr['d'] = diagonal(ax, ay, bx, by);
			attr['data-offset'] = '{0},{1},{2},{3},{4},{5},{6},{7}'.format(acx, acy, bcx, bcy, ax, ay, bx, by);
			attr['stroke-width'] = 3;
			attr['data-fromindex'] = oindex;
			attr['data-from'] = aid;
			attr['data-to'] = bid;
			attr['data-toindex'] = iindex;
			attr['class'] = ('id' + aid + '' + oindex + '' + bid) + ' node_connection selectable from_' + aid + ' to_' + bid + (flow.connections[aid + '#' + oindex + '#' + iindex + '#' + bid] ? '' : ' path_new') + (oindex === 99 ? ' path_err' : '');
			// attr['id'] = 'id' + aid + '' + bid;
			lines.asvg('path').attr(attr);
			isnew && EMIT('designer.add.connection', aid, bid);
		}
	};

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value)
			return;

		animcache = {};
		animrunning = {};
		data = {};
		selected = [];
		animtoken = (Math.random() * 1000).floor(0);

		anim.empty();
		lines.empty();
		container.empty();

		value.forEach(self.add);
		value.length && self.autoconnect(true);
		self.select(null);
	};

	self.getZoom = function() {
		return zoom;
	};

	self.zoom = function(val) {
		switch (val) {
			case 0:
				zoom = 1;
				break;
			case 1:
				zoom += 0.1;
				break;
			case -1:
				zoom -= 0.1;
				break;
		}
		zoom = zoom.floor(1);
		self.find('.svggrid').attr('transform', 'scale({0})'.format(zoom));
		main.attr('transform', 'scale({0})'.format(zoom));
		anim.attr('transform', 'scale({0})'.format(zoom));
	};
});

function offsetter(evt) {
	var position = { x: 0, y: 0 };

	if (!evt)
		return position;

	if (evt.touches){
		position.x = evt.touches[0].pageX;
		position.y = evt.touches[0].pageY;
	} else {
		position.x = evt.pageX;
		position.y = evt.pageY;
	}

	var parent = evt.target;

	while (parent.offsetParent) {
		position.x -= parent.offsetLeft;
		position.y -= parent.offsetTop;
		parent = parent.offsetParent;
	}

	return position;
}

COMPONENT('checkbox', function(self, config) {

	self.nocompile && self.nocompile();

	self.validate = function(value) {
		return (config.disabled || !config.required) ? true : (value === true || value === 'true' || value === 'on');
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'label':
				self.find('span').html(value);
				break;
			case 'required':
				self.find('span').tclass('ui-checkbox-label-required', value);
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				break;
			case 'checkicon':
				self.find('i').rclass2('fa-').aclass('fa-' + value);
				break;
		}
	};

	self.make = function() {
		self.aclass('ui-checkbox');
		self.html('<div><i class="fa fa-{2}"></i></div><span{1}>{0}</span>'.format(config.label || self.html(), config.required ? ' class="ui-checkbox-label-required"' : '', config.checkicon || 'check'));
		config.disabled && self.aclass('ui-disabled');
		self.event('click', function() {
			if (config.disabled)
				return;
			self.dirty(false);
			self.getter(!self.get());
		});
	};

	self.setter = function(value) {
		self.tclass('ui-checkbox-checked', !!value);
	};
});

COMPONENT('checkboxlist', 'checkicon:check', function(self, config) {

	var W = window;
	!W.$checkboxlist && (W.$checkboxlist = Tangular.compile('<div class="ui-checkboxlist-item-container{{ if $.class }} {{ $.class }}{{ fi }}"><div class="ui-checkboxlist-item" data-index="{{ index }}"><div><i class="fa fa-{{ $.checkicon }}"></i></div><span>{{ text }}</span></div></div>'));

	var template = W.$checkboxlist;
	var container, data, datasource, content, dataold, render = null;

	self.nocompile();

	self.validate = function(value) {
		return config.disabled || !config.required ? true : value && value.length > 0;
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {

			case 'type':
				self.type = value;
				break;

			case 'checkicon':
				self.find('i').rclass().aclass('fa fa-' + value);
				break;

			case 'disabled':
				self.tclass('ui-disabled', value);
				break;

			case 'datasource':
				self.datasource(value, self.bind);
				datasource && self.refresh();
				datasource = value;
				break;

			case 'icon':
				if (!self.find('.ui-checkboxlist-label').find('i').rclass().aclass('fa fa-' + value).length)
					redraw = true;
				break;

			case 'required':
				self.tclass('ui-checkboxlist-required', value);
				self.state(1, 1);
				break;

			case 'label':
				redraw = true;
				break;

			case 'items':

				if (value instanceof Array) {
					self.bind('', value);
					return;
				}

				var items = [];
				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var val = (item[1] == null ? item[0] : item[1]).trim();
					if (config.type === 'number')
						val = +val;
					items.push({ name: item[0].trim(), id: val });
				});

				self.bind('', items);
				self.refresh();
				break;
		}

		redraw && setTimeout2(self.id + '.redraw', function() {
			self.redraw();
			self.bind('', dataold);
			self.refresh();
		}, 100);
	};

	self.make = function() {

		self.aclass('ui-checkboxlist');
		content = self.html();
		config.type && (self.type = config.type);
		self.redraw();

		if (config.items)
			self.reconfigure({ items: config.items });
		else if (config.datasource)
			self.reconfigure({ datasource: config.datasource });
		else
			self.bind('', null);

		self.event('click', '.ui-checkboxlist-item', function(e) {

			e.stopPropagation();

			if (config.disabled)
				return;

			var el = $(this);
			var is = !el.hasClass('ui-checkboxlist-checked');
			var index = +el.attrd('index');
			var value = data[index];

			if (value == null)
				return;

			value = value.value;

			var arr = self.get();
			if (!(arr instanceof Array))
				arr = [];

			var index = arr.indexOf(value);

			if (is) {
				index === -1 && arr.push(value);
			} else {
				index !== -1 && arr.splice(index, 1);
			}

			self.reset(true);
			self.set(arr, 2);
		});
	};

	self.redraw = function() {
		var label = config.label || content;
		self.tclass('ui-checkboxlist-required', config.required);
		self.html((label ? '<div class="ui-checkboxlist-label">{1}{0}</div>'.format(label, config.icon ? '<i class="fa fa-{0}"></i>'.format(config.icon) : '') : '') + '<div class="ui-checkboxlist-container"></div>');
		container = self.find('.ui-checkboxlist-container');
	};

	self.selectall = function() {

		if (config.disabled)
			return;

		var arr = [];
		var inputs = self.find('.ui-checkboxlist-item');
		var cur = self.get();

		inputs.each(function() {
			var el = $(this);
			var val = self.parser(data[+el.attrd('index')].value);
			if (this.offsetParent) {
				if (!el.hclass('ui-checkboxlist-checked'))
					arr.push(val);
			} else {
				if (cur.indexOf(val) !== -1)
					arr.push(val);
			}
		});

		self.set(arr);
		self.change(true);
	};

	self.bind = function(path, value) {

		if (!value)
			return;

		var kv = config.value || 'id';
		var kt = config.text || 'name';

		render = '';
		data = [];
		dataold = value;

		for (var i = 0, length = value.length; i < length; i++) {
			var isString = typeof(value[i]) === 'string';
			var item = { value: isString ? value[i] : value[i][kv], text: isString ? value[i] : value[i][kt], index: i };
			render += template(item, config);
			data.push(item);
		}

		if (render)
			container.html(render);
		else
			container.html(config.empty);

		path && setTimeout(function() {
			self.refresh();
		}, 200);
	};

	self.setter = function(value) {
		container.find('.ui-checkboxlist-item').each(function() {
			var el = $(this);
			var index = +el.attr('data-index');
			var checked = false;
			if (!value || !value.length)
				checked = false;
			else if (data[index])
				checked = data[index];
			checked && (checked = value.indexOf(checked.value) !== -1);
			el.tclass('ui-checkboxlist-checked', checked);
		});
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.find('.ui-checkboxlist').tclass('ui-checkboxlist-invalid', invalid);
	};
});

COMPONENT('dropdowncheckbox', 'checkicon:check;visible:0;alltext:null;limit:0;selectedtext:{0} selected', function(self, config) {

	var data = [], render = '';
	var container, values, content, datasource = null;
	var prepared = false;
	var W = window;

	self.nocompile();

	!W.$dropdowncheckboxtemplate && (W.$dropdowncheckboxtemplate = Tangular.compile('<div class="ui-dropdowncheckbox-item" data-index="{{ index }}"><div><i class="fa fa-{{ $.checkicon }}"></i></div><span>{{ text }}</span></div>'));
	var template = W.$dropdowncheckboxtemplate;

	self.validate = function(value) {
		return config.disabled || !config.required ? true : value && value.length > 0;
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {

			case 'type':
				self.type = value;
				break;

			case 'required':
				self.tclass('ui-dropdowncheckbox-required', config.required);
				break;

			case 'label':
				content = value;
				redraw = true;
				break;

			case 'disabled':
				self.tclass('ui-disabled', value);
				self.reset();
				break;

			case 'checkicon':
				self.find('i').rclass().aclass('fa fa-' + value);
				break;

			case 'icon':
				redraw = true;
				break;

			case 'datasource':
				self.datasource(value, self.bind);
				datasource && self.refresh();
				datasource = value;
				break;

			case 'items':

				if (value instanceof Array) {
					self.bind('', value);
					return;
				}

				var items = [];
				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var val = (item[1] == null ? item[0] : item[1]).trim();
					if (config.type === 'number')
						val = +val;
					items.push({ name: item[0].trim(), id: val });
				});

				self.bind('', items);
				self.refresh();
				break;
		}

		redraw && setTimeout2(self.id + '.redraw', self.redraw, 100);
	};

	self.redraw = function() {

		var html = '<div class="ui-dropdowncheckbox"><span class="fa fa-caret-down"></span><div class="ui-dropdowncheckbox-selected"></div></div><div class="ui-dropdowncheckbox-values hidden">{0}</div>'.format(render);
		if (content.length)
			self.html('<div class="ui-dropdowncheckbox-label">{0}{1}:</div>'.format(config.icon ? ('<i class="fa fa-' + config.icon + '"></i>') : '', content) + html);
		else
			self.html(html);

		container = self.find('.ui-dropdowncheckbox-values');
		values = self.find('.ui-dropdowncheckbox-selected');
		prepared && self.refresh();
		self.tclass('ui-disabled', config.disabled === true);
		self.tclass('ui-dropdowncheckbox-required', config.required === true);
	};

	self.make = function() {

		self.type = config.type;

		content = self.html();
		self.aclass('ui-dropdowncheckbox-container');
		self.redraw();

		if (config.items)
			self.reconfigure({ items: config.items });
		else if (config.datasource)
			self.reconfigure({ datasource: config.datasource });
		else
			self.bind('', null);

		self.event('click', '.ui-dropdowncheckbox', function(e) {

			if (config.disabled)
				return;

			container.tclass('hidden');

			if (W.$dropdowncheckboxelement) {
				W.$dropdowncheckboxelement.aclass('hidden');
				W.$dropdowncheckboxelement = null;
			}

			!container.hclass('hidden') && (W.$dropdowncheckboxelement = container);
			e.stopPropagation();
		});

		self.event('click', '.ui-dropdowncheckbox-item', function(e) {

			e.stopPropagation();

			if (config.disabled)
				return;

			var el = $(this);
			var is = !el.hclass('ui-dropdowncheckbox-checked');
			var index = +el.attrd('index');
			var value = data[index];

			if (value === undefined)
				return;

			value = value.value;

			var arr = self.get();

			if (!(arr instanceof Array))
				arr = [];

			var index = arr.indexOf(value);

			if (is) {
				if (config.limit && arr.length === config.limit)
					return;
				index === -1 && arr.push(value);
			} else {
				index !== -1 && arr.splice(index, 1);
			}

			self.set(arr);
			self.change(true);
		});
	};

	self.bind = function(path, value) {
		var clsempty = 'ui-dropdowncheckbox-values-empty';

		if (value !== undefined)
			prepared = true;

		if (!value || !value.length) {
			var h = config.empty || '&nbsp;';
			if (h === self.old)
				return;
			container.aclass(clsempty).html(h);
			self.old = h;
			return;
		}

		var kv = config.value || 'id';
		var kt = config.text || 'name';

		render = '';
		data = [];

		for (var i = 0, length = value.length; i < length; i++) {
			var isString = typeof(value[i]) === 'string';
			var item = { value: isString ? value[i] : value[i][kv], text: isString ? value[i] : value[i][kt], index: i };
			render += template(item, config);
			data.push(item);
		}

		var h = HASH(render);
		if (h === self.old)
			return;

		self.old = h;

		if (render)
			container.rclass(clsempty).html(render);
		else
			container.aclass(clsempty).html(config.empty);

		self.refresh();
	};

	self.setter = function(value) {

		if (!prepared)
			return;

		var label = '';
		var count = value == null || !value.length ? undefined : value.length;

		if (value && count) {
			var remove = [];
			for (var i = 0; i < count; i++) {
				var selected = value[i];
				var index = 0;
				var is = false;
				while (true) {
					var item = data[index++];
					if (item === undefined)
						break;
					if (item.value != selected)
						continue;
					label += (label ? ', ' : '') + item.text;
					is = true;
				}
				!is && remove.push(selected);
			}

			if (config.cleaner !== false && value) {
				var refresh = false;
				while (true) {
					var item = remove.shift();
					if (item === undefined)
						break;
					value.splice(value.indexOf(item), 1);
					refresh = true;
				}
				refresh && self.set(value);
			}
		}

		container.find('.ui-dropdowncheckbox-item').each(function() {
			var el = $(this);
			var index = +el.attrd('index');
			var checked = false;
			if (!value || !value.length)
				checked = false;
			else if (data[index])
				checked = data[index];
			checked && (checked = value.indexOf(checked.value) !== -1);
			el.tclass('ui-dropdowncheckbox-checked', checked);
		});

		if (!label && value && config.cleaner !== false) {
			// invalid data
			// it updates model without notification
			self.rewrite([]);
		}

		if (!label && config.placeholder) {
			values.rattr('title', '');
			values.html('<span>{0}</span>'.format(config.placeholder));
		} else {
			if (count == data.length && config.alltext !== 'null' && config.alltext)
				label = config.alltext;
			else if (config.visible && count > config.visible)
				label = config.selectedtext.format(count, data.length);
			values.attr('title', label);
			values.html(label);
		}
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.tclass('ui-dropdowncheckbox-invalid', invalid);
	};

	if (W.$dropdowncheckboxevent)
		return;

	W.$dropdowncheckboxevent = true;
	$(document).on('click', function() {
		if (W.$dropdowncheckboxelement) {
			W.$dropdowncheckboxelement.aclass('hidden');
			W.$dropdowncheckboxelement = null;
		}
	});
});

COMPONENT('dropdown', function(self, config) {

	var select, condition, content = null;
	var render = '';

	self.nocompile();

	self.validate = function(value) {

		if (!config.required || config.disabled)
			return true;

		var type = typeof(value);
		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'currency':
			case 'number':
				return value > 0;
		}

		return value.length > 0;
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'type':
				self.type = value;
				break;
			case 'items':

				if (value instanceof Array) {
					self.bind('', value);
					return;
				}

				var items = [];

				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var obj = { id: item[1] == null ? item[0] : item[1], name: item[0] };
					items.push(obj);
				});

				self.bind('', items);
				break;
			case 'if':
				condition = value ? FN(value) : null;
				break;
			case 'required':
				self.tclass('ui-dropdown-required', value === true);
				self.state(1, 1);
				break;
			case 'datasource':
				self.datasource(value, self.bind);
				break;
			case 'label':
				content = value;
				redraw = true;
				break;
			case 'icon':
				redraw = true;
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('select').prop('disabled', value);
				break;
		}

		redraw && setTimeout2(self.id + '.redraw', 100);
	};

	self.bind = function(path, arr) {

		if (!arr)
			arr = EMPTYARRAY;

		var builder = [];
		var value = self.get();
		var template = '<option value="{0}"{1}>{2}</option>';
		var propText = config.text || 'name';
		var propValue = config.value || 'id';

		config.empty !== undefined && builder.push('<option value="">{0}</option>'.format(config.empty));

		var type = typeof(arr[0]);
		var notObj = type === 'string' || type === 'number';

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (condition && !condition(item))
				continue;
			if (notObj)
				builder.push(template.format(item, value === item ? ' selected="selected"' : '', item));
			else
				builder.push(template.format(item[propValue], value === item[propValue] ? ' selected="selected"' : '', item[propText]));
		}

		render = builder.join('');
		select.html(render);
	};

	self.redraw = function() {
		var html = '<div class="ui-dropdown"><select data-jc-bind="">{0}</select></div>'.format(render);
		var builder = [];
		var label = content || config.label;
		if (label) {
			builder.push('<div class="ui-dropdown-label">{0}{1}:</div>'.format(config.icon ? '<span class="fa fa-{0}"></span> '.format(config.icon) : '', label));
			builder.push('<div class="ui-dropdown-values">{0}</div>'.format(html));
			self.html(builder.join(''));
		} else
			self.html(html).aclass('ui-dropdown-values');
		select = self.find('select');
		render && self.refresh();
		config.disabled && self.reconfigure('disabled:true');
		self.tclass('ui-dropdown-required', config.required === true);
	};

	self.make = function() {
		self.type = config.type;
		content = self.html();
		self.aclass('ui-dropdown-container');
		self.redraw();
		config.if && (condition = FN(config.if));
		config.items && self.reconfigure({ items: config.items });
		config.datasource && self.reconfigure('datasource:' + config.datasource);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.tclass('ui-dropdown-invalid', invalid);
	};
});

COMPONENT('selectbox', function(self, config) {

	var Eitems, Eselected, datasource = null;

	self.datasource = EMPTYARRAY;
	self.template = Tangular.compile('<li data-search="{{ search }}" data-index="{{ index }}">{{ text }}</li>');

	self.nocompile();

	self.validate = function(value) {
		return config.disabled || !config.required ? true : value && value.length > 0;
	};

	self.configure = function(key, value, init) {
		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'type':
				self.type = value;
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('input').prop('disabled', value);
				if (value)
					self.rclass('ui-selectbox-invalid');
				else if (config.required)
					self.state(1, 1);
				break;
			case 'required':
				!value && self.state(1, 1);
				break;
			case 'height':
			case 'search':
				redraw = true;
				break;
			case 'items':
				var arr = [];
				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var obj = {};
					obj.name = item[0].trim();
					obj.id = (item[1] == null ? item[0] : item[1]).trim();
					if (config.type === 'number')
						obj.id = +obj.id;
					arr.push(obj);
				});
				self.bind('', arr);
				break;
			case 'datasource':
				datasource && self.unwatch(datasource, self.bind);
				self.watch(value, self.bind, true);
				datasource = value;
				break;
		}

		redraw && self.redraw();
	};

	self.search = function() {
		var search = config.search ? self.find('input').val().toSearch() : '';
		Eitems.find('li').each(function() {
			var el = $(this);
			el.tclass('hidden', el.attrd('search').indexOf(search) === -1);
		});
		self.find('.ui-selectbox-search-icon').tclass('fa-search', search.length === 0).tclass('fa-times', search.length > 0);
	};

	self.redraw = function() {
		self.html((typeof(config.search) === 'string' ? '<div class="ui-selectbox-search"><span><i class="fa fa-search ui-selectbox-search-icon"></i></span><div><input type="text" placeholder="{0}" /></div></div><div>'.format(config.search) : '') + '<div style="height:{0}px"><ul></ul><ul style="height:{0}px"></ul></div>'.format(config.height || '200'));
		self.find('ul').each(function(index) {
			if (index)
				Eselected = $(this);
			else
				Eitems = $(this);
		});
	};

	self.bind = function(path, value) {

		var kt = config.text || 'name';
		var kv = config.value || 'id';
		var builder = [];

		self.datasource = [];
		value && value.forEach(function(item, index) {

			var text;
			var value;

			if (typeof(item) === 'string') {
				text = item;
				value = self.parser(item);
			} else {
				text = item[kt];
				value = item[kv];
			}

			var item = { text: text, value: value, index: index, search: text.toSearch() };
			self.datasource.push(item);
			builder.push(self.template(item));
		});

		self.search();
		Eitems.empty().append(builder.join(''));
	};

	self.make = function() {

		self.aclass('ui-selectbox');
		self.redraw();

		config.datasource && self.reconfigure('datasource:' + config.datasource);
		config.items && self.reconfigure('items:' + config.items);

		self.event('click', 'li', function() {
			if (config.disabled)
				return;
			var selected = self.get() || [];
			var index = +this.getAttribute('data-index');
			var value = self.datasource[index];

			if (selected.indexOf(value.value) === -1)
				selected.push(value.value);
			else
				selected = selected.remove(value.value);

			self.set(selected);
			self.change(true);
		});

		self.event('click', '.fa-times', function() {
			if (config.disabled)
				return;
			self.find('input').val('');
			self.search();
		});

		typeof(config.search) === 'string' && self.event('keydown', 'input', function() {
			if (config.disabled)
				return;
			setTimeout2(self.id, self.search, 500);
		});
	};

	self.setter = function(value) {

		var selected = {};
		var builder = [];

		var ds = self.datasource;
		var dsl = ds.length;

		if (value) {
			for (var i = 0, length = value.length; i < length; i++) {
				for (var j = 0; j < dsl; j++) {
					if (ds[j].value === value[i]) {
						selected[j] = true;
						builder.push(self.template(ds[j]));
					}
				}
			}
		}

		Eitems.find('li').each(function() {
			var el = $(this);
			var index = +el.attrd('index');
			el.tclass('ui-selectbox-selected', selected[index] !== undefined);
		});

		Eselected.empty().append(builder.join(''));
		self.search();
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.tclass('ui-selectbox-invalid', invalid);
	};
});

COMPONENT('textboxlist', 'maxlength:100;required:false;error:You reach the maximum limit', function (self, config) {

	var container, content;
	var empty = {};
	var skip = false;
	var cempty = 'empty';
	var helper = null;

	self.nocompile();
	self.setter = null;
	self.getter = null;

	self.template = Tangular.compile('<div class="ui-textboxlist-item"><div><i class="fa fa-times"></i></div><div><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder }}"{{ if disabled}} disabled="disabled"{{ fi }} value="{{ value }}" /></div></div>');

	self.configure = function (key, value, init, prev) {
		if (init)
			return;

		var redraw = false;
		switch (key) {
			case 'disabled':
				self.tclass('ui-textboxlist-required', value);
				self.find('input').prop('disabled', true);
				empty.disabled = value;
				break;
			case 'maxlength':
				empty.max = value;
				self.find('input').prop(key, value);
				break;
			case 'placeholder':
				empty.placeholder = value;
				self.find('input').prop(key, value);
				break;
			case 'label':
				redraw = true;
				break;
			case 'icon':
				if (value && prev)
					self.find('i').rclass().aclass(value);
				else
					redraw = true;
				break;
		}

		if (redraw) {
			skip = false;
			self.redraw();
			self.refresh();
		}
	};

	self.redraw = function () {

		var icon = '';
		var html = config.label || content;

		if (config.icon)
			icon = '<i class="fa fa-{0}"></i>'.format(config.icon);

		empty.value = '';
		self.html((html ? '<div class="ui-textboxlist-label{2}">{1}{0}:</div>'.format(html, icon, config.required ? ' ui-textboxlist-label-required' : '') : '') + '<div class="ui-textboxlist-items"></div>' + self.template(empty).replace('-item"', '-item ui-textboxlist-base"'));
		container = self.find('.ui-textboxlist-items');
	};

	self.make = function () {

		empty.max = config.max;
		empty.placeholder = config.placeholder;
		empty.value = '';
		empty.disabled = config.disabled;

		if (config.disabled)
			self.aclass('ui-disabled');

		content = self.html();
		self.aclass('ui-textboxlist');
		self.redraw();

		self.event('click', '.fa-times', function () {

			if (config.disabled)
				return;

			var el = $(this);
			var parent = el.closest('.ui-textboxlist-item');
			var value = parent.find('input').val();
			var arr = self.get();

			helper != null && helper.remove();
			helper = null;

			parent.remove();

			var index = arr.indexOf(value);
			if (index === -1)
				return;

			arr.splice(index, 1);

			self.tclass(cempty, arr.length === 0);

			skip = true;
			self.set(arr, 2);
			self.change(true);
		});

		// PMC: added blur event for base input auto submit
		self.event('change keypress blur', 'input', function (e) {

			if ((e.type === 'keypress' && e.which !== 13) || config.disabled)
				return;

			var el = $(this);

			var value = this.value.trim();
			if (!value)
				return;

			var arr = [];
			var base = el.closest('.ui-textboxlist-base');
			var len = base.length > 0;

			if (len && e.type === 'change')
				return;

			var raw = self.get();

			if (config.limit && raw.length >= config.limit) {
				if (helper) {
					base.after('<div class="ui-textboxlist-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
					helper = container.closest('.ui-textboxlist').find('.ui-textboxlist-helper');
				}
				return;
			}

			if (len) {

				if (!raw || raw.indexOf(value) === -1)
					self.push(value, 2);

				this.value = '';
				self.change(true);
				return;
			}

			container.find('input').each(function () {
				arr.push(this.value.trim());
			});

			skip = true;
			self.set(arr, 2);
			self.change(true);
		});
	};

	self.setter = function (value) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value || !value.length) {
			self.aclass(cempty);
			container.empty();
			return;
		}

		self.rclass(cempty);
		var builder = [];

		value.forEach(function (item) {
			empty.value = item;
			builder.push(self.template(empty));
		});

		container.empty().append(builder.join(''));
	};

	self.validate = function(value, init) {

		if (init)
			return true;

		var valid = !config.required;
		var items = container.children();

		if (!value || !value.length)
			return valid;

		value.forEach(function (item, i) {
			!item && (item = '');
			switch (config.type) {
				case 'email':
					valid = item.isEmail();
					break;
				case 'url':
					valid = item.isURL();
					break;
				case 'currency':
				case 'number':
					valid = item > 0;
					break;
				case 'date':
					valid = item instanceof Date && !isNaN(item.getTime());
					// TODO: date string format validation
					break;
				default:
					valid = item.length > 0;
					break;
			}
			items.eq(i).tclass('ui-textboxlist-item-invalid', !valid);
		});

		return valid;
	};

});

COMPONENT('autocomplete', 'height:200', function(self, config) {

	var container, old, onSearch, searchtimeout, searchvalue, blurtimeout, onCallback, datasource, offsetter, scroller;
	var is = false;
	var margin = {};
	var prev;
	var skipmouse = false;

	self.template = Tangular.compile('<li{{ if index === 0 }} class="selected"{{ fi }} data-index="{{ index }}"><span>{{ name }}</span><span>{{ type }}</span></li>');
	self.readonly();
	self.singleton();
	self.nocompile();

	self.make = function() {
		self.aclass('ui-autocomplete-container hidden');
		self.html('<div class="ui-autocomplete"><ul></ul></div>');

		scroller = self.find('.ui-autocomplete');
		container = self.find('ul');

		self.event('click', 'li', function(e) {
			e.preventDefault();
			e.stopPropagation();
			if (onCallback) {
				var val = datasource[+$(this).attrd('index')];
				if (typeof(onCallback) === 'string')
					SET(onCallback, val.value === undefined ? val.name : val.value);
				else
					onCallback(val, old);
			}
			self.visible(false);
		});

		self.event('mouseenter mouseleave', 'li', function(e) {
			if (!skipmouse) {
				prev && prev.rclass('selected');
				prev = $(this).tclass('selected', e.type === 'mouseenter');
			}
		});

		$(document).on('click', function() {
			is && self.visible(false);
		});

		$(window).on('resize', function() {
			self.resize();
		});
	};

	self.prerender = function(value) {
		self.render(value);
	};

	self.configure = function(name, value) {
		switch (name) {
			case 'height':
				value && scroller.css('max-height', value);
				break;
		}
	};

	function keydown(e) {
		var c = e.which;
		var input = this;

		if (c !== 38 && c !== 40 && c !== 13) {
			if (c !== 8 && c < 32)
				return;
			clearTimeout(searchtimeout);
			searchtimeout = setTimeout(function() {
				var val = input.value;
				if (!val)
					return self.render(EMPTYARRAY);
				if (searchvalue === val)
					return;
				searchvalue = val;
				self.resize();
				onSearch(val, self.prerender);
			}, 200);
			return;
		}

		if (!datasource || !datasource.length)
			return;

		var current = container.find('.selected');
		if (c === 13) {
			if (prev) {
				prev = null;
				self.visible(false);
				if (current.length) {
					if (onCallback) {
						var val = datasource[+current.attrd('index')];
						if (typeof(onCallback) === 'string')
							SET(onCallback, val.value === undefined ? val.name : val.value);
						else
							onCallback(val, old);
					}
					e.preventDefault();
					e.stopPropagation();
				}
			}
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		if (current.length) {
			current.rclass('selected');
			current = c === 40 ? current.next() : current.prev();
		}

		skipmouse = true;
		!current.length && (current = self.find('li:{0}-child'.format(c === 40 ? 'first' : 'last')));
		prev && prev.rclass('selected');
		prev = current.aclass('selected');
		var index = +current.attrd('index');
		var h = current.innerHeight();
		var offset = ((index + 1) * h) + (h * 2);
		scroller.prop('scrollTop', offset > config.height ? offset - config.height : 0);
		setTimeout2(self.ID + 'skipmouse', function() {
			skipmouse = false;
		}, 100);
	}

	function blur() {
		clearTimeout(blurtimeout);
		blurtimeout = setTimeout(function() {
			self.visible(false);
		}, 300);
	}

	self.visible = function(visible) {
		clearTimeout(blurtimeout);
		self.tclass('hidden', !visible);
		is = visible;
	};

	self.resize = function() {

		if (!offsetter || !old)
			return;

		var offset = offsetter.offset();
		offset.top += offsetter.height();
		offset.width = offsetter.width();

		if (margin.left)
			offset.left += margin.left;
		if (margin.top)
			offset.top += margin.top;
		if (margin.width)
			offset.width += margin.width;

		self.css(offset);
	};

	self.attach = function(input, search, callback, left, top, width) {
		self.attachelement(input, input, search, callback, left, top, width);
	};

	self.attachelement = function(element, input, search, callback, left, top, width) {

		if (typeof(callback) === 'number') {
			width = left;
			left = top;
			top = callback;
			callback = null;
		}

		clearTimeout(searchtimeout);

		if (input.setter)
			input = input.find('input');
		else
			input = $(input);

		if (input[0].tagName !== 'INPUT') {
			input = input.find('input');
		}

		if (element.setter) {
			if (!callback)
				callback = element.path;
			element = element.element;
		}

		if (old) {
			old.removeAttr('autocomplete');
			old.off('blur', blur);
			old.off('keydown', keydown);
		}

		input.on('keydown', keydown);
		input.on('blur', blur);
		input.attr({ 'autocomplete': 'off' });

		old = input;
		margin.left = left;
		margin.top = top;
		margin.width = width;

		offsetter = $(element);
		self.resize();
		self.refresh();
		searchvalue = '';
		onSearch = search;
		onCallback = callback;
		self.visible(false);
	};

	self.render = function(arr) {

		datasource = arr;

		if (!arr || !arr.length) {
			self.visible(false);
			return;
		}

		var builder = [];
		for (var i = 0, length = arr.length; i < length; i++) {
			var obj = arr[i];
			obj.index = i;
			if (!obj.name)
				obj.name = obj.text;
			builder.push(self.template(obj));
		}

		container.empty().append(builder.join(''));
		skipmouse = true;

		setTimeout(function() {
			scroller.prop('scrollTop', 0);
			skipmouse = false;
		}, 100);

		prev = container.find('.selected');
		self.visible(true);
	};
});

COMPONENT('calendar', 'today:Set today;firstday:0;close:Close;yearselect:true;monthselect:true;yearfrom:-70 years;yearto:5 years', function(self, config) {

	var skip = false;
	var skipDay = false;
	var visible = false;

	self.days = EMPTYARRAY;
	self.months = EMPTYARRAY;
	self.months_short = EMPTYARRAY;
	self.years_from;
	self.years_to;
	self.nocompile();

	self.configure = function(key, value) {
		switch (key) {
			case 'days':
				if (value instanceof Array)
					self.days = value;
				else
					self.days = value.split(',').trim();

				for (var i = 0; i < DAYS.length; i++) {
					DAYS[i] = self.days[i];
					self.days[i] = DAYS[i].substring(0, 2).toUpperCase();
				}

				break;

			case 'months':
				if (value instanceof Array)
					self.months = value;
				else
					self.months = value.split(',').trim();

				self.months_short = [];

				for (var i = 0, length = self.months.length; i < length; i++) {
					var m = self.months[i];
					MONTHS[i] = m;
					if (m.length > 4)
						m = m.substring(0, 3) + '.';
					self.months_short.push(m);
				}
				break;

			case 'yearfrom':
				if (value.indexOf('current') !== -1)
					self.years_from = parseInt(new Date().format('yyyy'));
				else
					self.years_from = parseInt(new Date().add(value).format('yyyy'));
				break;

			case 'yearto':
				if (value.indexOf('current') !== -1)
					self.years_to = parseInt(new Date().format('yyyy'));
				else
					self.years_to = parseInt(new Date().add(value).format('yyyy'));
				break;
		}
	};

	self.readonly();
	self.click = function() {};

	function getMonthDays(dt) {

		var m = dt.getMonth();
		var y = dt.getFullYear();

		if (m === -1) {
			m = 11;
			y--;
		}

		return (32 - new Date(y, m, 32).getDate());
	}

	self.calculate = function(year, month, selected) {

		var d = new Date(year, month, 1, 12, 0);
		var output = { header: [], days: [], month: month, year: year };
		var firstDay = config.firstday;
		var firstCount = 0;
		var frm = d.getDay() - firstDay;
		var today = new Date();
		var ty = today.getFullYear();
		var tm = today.getMonth();
		var td = today.getDate();
		var sy = selected ? selected.getFullYear() : -1;
		var sm = selected ? selected.getMonth() : -1;
		var sd = selected ? selected.getDate() : -1;
		var days = getMonthDays(d);

		if (frm < 0)
			frm = 7 + frm;

		while (firstCount++ < 7) {
			output.header.push({ index: firstDay, name: self.days[firstDay] });
			firstDay++;
			if (firstDay > 6)
				firstDay = 0;
		}

		var index = 0;
		var indexEmpty = 0;
		var count = 0;
		var prev = getMonthDays(new Date(year, month - 1, 1, 12, 0)) - frm;
		var cur;

		for (var i = 0; i < days + frm; i++) {

			var obj = { isToday: false, isSelected: false, isEmpty: false, isFuture: false, number: 0, index: ++count };

			if (i >= frm) {
				obj.number = ++index;
				obj.isSelected = sy === year && sm === month && sd === index;
				obj.isToday = ty === year && tm === month && td === index;
				obj.isFuture = ty < year;
				if (!obj.isFuture && year === ty) {
					if (tm < month)
						obj.isFuture = true;
					else if (tm === month)
						obj.isFuture = td < index;
				}

			} else {
				indexEmpty++;
				obj.number = prev + indexEmpty;
				obj.isEmpty = true;
				cur = d.add('-' + indexEmpty + ' days');
			}

			if (!obj.isEmpty)
				cur = d.add(i + ' days');

			obj.month = i >= frm && obj.number <= days ? d.getMonth() : cur.getMonth();
			obj.year = i >= frm && obj.number <= days ? d.getFullYear() : cur.getFullYear();
			obj.date = cur;
			output.days.push(obj);
		}

		indexEmpty = 0;

		for (var i = count; i < 42; i++) {
			var cur = d.add(i + ' days');
			var obj = { isToday: false, isSelected: false, isEmpty: true, isFuture: true, number: ++indexEmpty, index: ++count };
			obj.month = cur.getMonth();
			obj.year = cur.getFullYear();
			obj.date = cur;
			output.days.push(obj);
		}

		return output;
	};

	self.hide = function() {
		if (visible) {
			self.older = null;
			self.aclass('hidden');
			self.rclass('ui-calendar-visible');
			visible = false;
		}
		return self;
	};

	self.toggle = function(el, value, callback, offset) {
		if (self.older === el[0]) {
			!self.hclass('hidden') && self.hide();
		} else {
			self.older = el[0];
			self.show(el, value, callback, offset);
		}
		return self;
	};

	self.show = function(el, value, callback, offset) {

		setTimeout(function() {
			clearTimeout2('calendarhide');
		}, 5);

		if (!el)
			return self.hide();

		var off = el.offset();
		var h = el.innerHeight();
		var l = off.left + (offset || 0);
		var t = off.top + h + 12;
		var s = 250;

		if (l + s > WW) {
			var w = el.innerWidth();
			l = (l + w) - s;
		}

		self.css({ left: l, top: t });
		self.rclass('hidden');
		self.click = callback;
		self.date(value);
		visible = true;
		self.aclass('ui-calendar-visible', 50);
		return self;
	};

	self.make = function() {

		self.aclass('ui-calendar hidden');

		var conf = {};

		if (!config.days) {
			conf.days = [];
			for (var i = 0; i < DAYS.length; i++)
				conf.days.push(DAYS[i].substring(0, 2).toUpperCase());
		}

		!config.months && (conf.months = MONTHS);
		self.reconfigure(conf);

		self.event('click', '.ui-calendar-today-a', function() {
			var dt = new Date();
			self.hide();
			if (self.click) {
				if (typeof(self.click) === 'string') {
					SET(self.click, dt);
					CHANGE(self.click, true);
				} else
					self.click(dt);
			}
		});

		self.event('click', '.ui-calendar-day', function() {
			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[2]), 12, 0);
			self.find('.ui-calendar-selected').rclass('ui-calendar-selected');
			var el = $(this).aclass('ui-calendar-selected');
			skip = !el.hclass('ui-calendar-disabled');
			self.hide();
			if (self.click) {
				if (typeof(self.click) === 'string') {
					SET(self.click, dt);
					CHANGE(self.click, true);
				} else
					self.click(dt);
			}
		});

		self.event('click', '.ui-calendar-header', function(e) {
			e.stopPropagation();
		});

		self.event('change', '.ui-calendar-year', function(e) {

			clearTimeout2('calendarhide');
			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1, 12, 0);
			dt.setFullYear(this.value);
			skipDay = true;
			self.date(dt);
		});

		self.event('change', '.ui-calendar-month', function(e){

			clearTimeout2('calendarhide');
			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1, 12, 0);
			dt.setMonth(this.value);
			skipDay = true;
			self.date(dt);
		});

		self.event('click', 'button', function(e) {

			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1, 12, 0);
			switch (this.name) {
				case 'prev':
					dt.setMonth(dt.getMonth() - 1);
					break;
				case 'next':
					dt.setMonth(dt.getMonth() + 1);
					break;
			}

			var current_year = dt.getFullYear();
			if (current_year < self.years_from || current_year > self.years_to)
				return;

			skipDay = true;
			self.date(dt);
		});

		$(window).on('scroll click', function() {
			visible && setTimeout2('calendarhide', function() {
				EXEC('$calendar.hide');
			}, 20);
		});

		window.$calendar = self;

		self.on('reflow', function() {
			visible && EXEC('$calendar.hide');
		});
	};

	self.date = function(value) {

		var clssel = 'ui-calendar-selected';

		if (typeof(value) === 'string')
			value = value.parseDate();

		if (!value || isNaN(value.getTime())) {
			self.find('.' + clssel).rclass(clssel);
			value = NOW;
		}

		var empty = !value;

		if (skipDay) {
			skipDay = false;
			empty = true;
		}

		if (skip) {
			skip = false;
			return;
		}

		if (!value)
			value = NOW = new Date();

		var output = self.calculate(value.getFullYear(), value.getMonth(), value);
		var builder = [];

		for (var i = 0; i < 42; i++) {

			var item = output.days[i];

			if (i % 7 === 0) {
				builder.length && builder.push('</tr>');
				builder.push('<tr>');
			}

			var cls = [];

			item.isEmpty && cls.push('ui-calendar-disabled');
			cls.push('ui-calendar-day');

			!empty && item.isSelected && cls.push(clssel);
			item.isToday && cls.push('ui-calendar-day-today');
			builder.push('<td class="{0}" data-date="{1}-{2}-{3}"><div>{3}</div></td>'.format(cls.join(' '), item.year, item.month, item.number));
		}

		builder.push('</tr>');

		var header = [];
		for (var i = 0; i < 7; i++)
			header.push('<th>{0}</th>'.format(output.header[i].name));

		var years = value.getFullYear();
		if (config.yearselect) {
			years = '';
			var current_year = value.getFullYear();
			for (var i = self.years_from; i <= self.years_to; i++)
				years += '<option value="{0}" {1}>{0}</option>'.format(i, i === current_year ? 'selected' : '');
			years = '<select data-date="{0}-{1}" class="ui-calendar-year">{2}</select>'.format(output.year, output.month, years);
		}

		var months = self.months[value.getMonth()];
		if (config.monthselect) {
			months = '';
			var current_month = value.getMonth();
			for (var i = 0, l = self.months.length; i < l; i++)
				months += '<option value="{0}" {2}>{1}</option>'.format(i, self.months[i], i === current_month ? 'selected' : '');
			months = '<select data-date="{0}-{1}" class="ui-calendar-month">{2}</select>'.format(output.year, output.month, months);
		}

		self.html('<div class="ui-calendar-header"><button class="ui-calendar-header-prev" name="prev" data-date="{0}-{1}"><span class="fa fa-arrow-left"></span></button><div class="ui-calendar-header-info">{2} {3}</div><button class="ui-calendar-header-next" name="next" data-date="{0}-{1}"><span class="fa fa-arrow-right"></span></button></div><div class="ui-calendar-table"><table cellpadding="0" cellspacing="0" border="0"><thead>{4}</thead><tbody>{5}</tbody></table></div>'.format(output.year, output.month, months, years, header.join(''), builder.join('')) + (config.today ? '<div class="ui-calendar-today"><a href="javascript:void(0)">{0}</a><a href="javascript:void(0)" class="ui-calendar-today-a"><i class="fa fa-calendar"></i>{1}</a></div>'.format(config.close, config.today) : ''));
	};
});

COMPONENT('keyvalue', 'maxlength:100', function(self, config) {

	var container, content = null;
	var cempty = 'empty';
	var skip = false;
	var empty = {};

	self.template = Tangular.compile('<div class="ui-keyvalue-item"><div class="ui-keyvalue-item-remove"><i class="fa fa-times"></i></div><div class="ui-keyvalue-item-key"><input type="text" name="key" maxlength="{{ max }}"{{ if disabled }} disabled="disabled"{{ fi }} placeholder="{{ placeholder_key }}" value="{{ key }}" /></div><div class="ui-keyvalue-item-value"><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder_value }}" value="{{ value }}" /></div></div>');
	self.nocompile();

	self.binder = function(type, value) {
		return value;
	};

	self.configure = function(key, value, init, prev) {
		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('input').prop('disabled', value);
				empty.disabled = value;
				break;
			case 'maxlength':
				self.find('input').prop('maxlength', value);
				break;
			case 'placeholderkey':
				self.find('input[name="key"]').prop('placeholder', value);
				break;
			case 'placeholdervalue':
				self.find('input[name="value"]').prop('placeholder', value);
				break;
			case 'icon':
				if (value && prev)
					self.find('i').rclass('fa').aclass('fa fa-' + value);
				else
					redraw = true;
				break;

			case 'label':
				redraw = true;
				break;
		}

		if (redraw) {
			self.redraw();
			self.refresh();
		}
	};

	self.redraw = function() {

		var icon = config.icon;
		var label = config.label || content;

		if (icon)
			icon = '<i class="fa fa-{0}"></i>'.format(icon);

		empty.value = '';

		self.html((label ? '<div class="ui-keyvalue-label">{1}{0}:</div>'.format(label, icon) : '') + '<div class="ui-keyvalue-items"></div>' + self.template(empty).replace('-item"', '-item ui-keyvalue-base"'));
		container = self.find('.ui-keyvalue-items');
	};

	self.make = function() {

		empty.max = config.maxlength;
		empty.placeholder_key = config.placeholderkey;
		empty.placeholder_value = config.placeholdervalue;
		empty.value = '';
		empty.disabled = config.disabled;

		content = self.html();

		self.aclass('ui-keyvalue');
		self.disabled && self.aclass('ui-disabled');
		self.redraw();

		self.event('click', '.fa-times', function() {

			if (config.disabled)
				return;

			var el = $(this);
			var parent = el.closest('.ui-keyvalue-item');
			var inputs = parent.find('input');
			var obj = self.get();
			!obj && (obj = {});
			var key = inputs[0].value;
			parent.remove();
			delete obj[key];

			self.set(obj, 2);
			self.change(true);
		});

		self.event('change keypress', 'input', function(e) {

			if (config.disabled || (e.type !== 'change' && e.which !== 13))
				return;

			var el = $(this);
			var inputs = el.closest('.ui-keyvalue-item').find('input');
			var key = self.binder('key', inputs[0].value);
			var value = self.binder('value', inputs.get(1).value);

			if (!key || !value)
				return;

			var base = el.closest('.ui-keyvalue-base').length > 0;
			if (base && e.type === 'change')
				return;

			if (base) {
				var tmp = self.get();
				!tmp && (tmp = {});
				tmp[key] = value;
				self.set(tmp);
				self.change(true);
				inputs.val('');
				inputs.eq(0).focus();
				return;
			}

			var keyvalue = {};
			var k;

			container.find('input').each(function() {
				if (this.name === 'key') {
					k = this.value.trim();
				} else if (k) {
					keyvalue[k] = this.value.trim();
					k = '';
				}
			});

			skip = true;
			self.set(keyvalue, 2);
			self.change(true);
		});
	};

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value) {
			container.empty();
			self.aclass(cempty);
			return;
		}

		var builder = [];

		Object.keys(value).forEach(function(key) {
			empty.key = key;
			empty.value = value[key];
			builder.push(self.template(empty));
		});

		self.tclass(cempty, builder.length === 0);
		container.empty().append(builder.join(''));
	};
});

COMPONENT('codemirror', 'linenumbers:true;required:false;trim:false;tabs:true', function(self, config, cls) {

	var editor, container;
	var cls2 = '.' + cls;
	var HSM = { annotateScrollbar: true, delay: 100 };

	self.getter = null;
	self.bindvisible();
	self.nocompile();

	self.reload = function() {
		editor.refresh();
		editor.display.scrollbars.update(true);
	};

	self.validate = function(value) {
		return (config.disabled || !config.required ? true : value && value.length > 0) === true;
	};

	self.insert = function(value) {
		editor.replaceSelection(value);
		self.change(true);
	};

	self.resize = function() {
		setTimeout2(self.ID, self.resizeforce, 300);
	};

	self.resizeforce = function() {
		if (config.parent) {
			var parent = self.parent(config.parent);
			var h = parent.height();

			if (h < config.minheight)
				h = config.minheight;
			editor.setSize('100%', (h - config.margin) - 24);
			self.css('height', h - config.margin);
		} else
			editor.setSize('100%', config.height);
	};

	self.configure = function(key, value, init) {
		if (init)
			return;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				editor.readOnly = value;
				editor.refresh();
				break;
			case 'required':
				self.find(cls2 + '-label').tclass(cls + '-label-required', value);
				self.state(1, 1);
				break;
			case 'icon':
				self.find('i').rclass().aclass(value.indexOf(' ') === -1 ? ('fa fa-' + value) : value);
				break;
		}

	};

	self.make = function() {

		var findmatch = function() {

			if (config.mode === 'todo') {
				self.todo_done();
				return;
			}

			var sel = editor.getSelections()[0];
			var cur = editor.getCursor();
			var count = editor.lineCount();
			var before = editor.getLine(cur.line).substring(cur.ch, cur.ch + sel.length) === sel;
			var beg = cur.ch + (before ? sel.length : 0);
			for (var i = cur.line; i < count; i++) {
				var ch = editor.getLine(i).indexOf(sel, beg);
				if (ch !== -1) {
					editor.doc.addSelection({ line: i, ch: ch }, { line: i, ch: ch + sel.length });
					break;
				}
				beg = 0;
			}
		};

		var content = config.label || self.html();
		self.html(((content ? '<div class="{0}-label' + (config.required ? ' {0}-label-required' : '') + '">' + (config.icon ? '<i class="fa fa-' + config.icon + '"></i> ' : '') + content + ':</div>' : '') + '<div class="{0}"></div>').format(cls));
		container = self.find(cls2);

		var options = {};
		options.lineNumbers = config.linenumbers;
		options.mode = config.type || 'htmlmixed';
		options.indentUnit = 4;
		// options.autoRefresh = true;
		options.scrollbarStyle = 'simple';
		options.scrollPastEnd = true;
		options.extraKeys = { 'Cmd-D': findmatch, 'Ctrl-D': findmatch };
		options.matchBrackets = true;
		// options.rulers = [{ column: 130, lineStyle: 'dashed' }];
		options.viewportMargin = 1000;
		options.foldGutter = true;
		options.highlightSelectionMatches = HSM;
		options.matchTags = { bothTags: true };
		options.autoCloseTags = true;
		options.doubleIndentSwitch = false;
		options.showCursorWhenSelecting = true;
		options.blastCode = true;
		options.autoCloseBrackets = true;

		if (config.tabs)
			options.indentWithTabs = true;

		if (config.type === 'markdown') {
			options.styleActiveLine = true;
			options.lineWrapping = true;
		}

		options.showTrailingSpace = false;

		editor = CodeMirror(container[0], options);
		self.editor = editor;

		editor.on('keydown', function(editor, e) {

			if (e.shiftKey && e.ctrlKey && (e.keyCode === 40 || e.keyCode === 38)) {
				var tmp = editor.getCursor();
				editor.doc.addSelection({ line: tmp.line + (e.keyCode === 40 ? 1 : -1), ch: tmp.ch });
				e.stopPropagation();
				e.preventDefault();
			}

			if (e.keyCode === 13) {
				var tmp = editor.getCursor();
				var line = editor.lineInfo(tmp.line);
				if ((/^\t+$/).test(line.text))
					editor.replaceRange('', { line: tmp.line, ch: 0 }, { line: tmp.line, ch: line.text.length });
				return;
			}

			if (e.keyCode === 27)
				e.stopPropagation();

		});

		if (config.height !== 'auto') {
			var is = typeof(config.height) === 'number';
			editor.setSize('100%', is ? config.height : (config.height || 200));
			!is && self.css('height', config.height);
		}

		if (config.disabled) {
			self.aclass('ui-disabled');
			editor.readOnly = true;
			editor.refresh();
		}

		var can = {};
		can['+input'] = can['+delete'] = can.undo = can.redo = can.paste = can.cut = can.clear = true;

		editor.on('change', function(a, b) {

			if (config.disabled || !can[b.origin])
				return;

			setTimeout2(self.id, function() {
				var val = editor.getValue();

				if (config.trim) {
					var lines = val.split('\n');
					for (var i = 0, length = lines.length; i < length; i++)
						lines[i] = lines[i].replace(/\s+$/, '');
					val = lines.join('\n').trim();
				}

				self.getter2 && self.getter2(val);
				self.change(true);
				self.rewrite(val, 2);
				config.required && self.validate2();
			}, 200);

		});

		self.resize();
		self.on('resize + resize2', self.resize);
	};

	self.refreshcode = function() {
		var el = self.element[0];
		var is = el.parentNode && el.parentNode.tagName === 'body' ? false : W.isIE ? (!el.offsetWidth && !el.offsetHeight) : !el.offsetParent;
		if (is)
			setTimeout(self.refreshcode, 500);
		else
			editor.refresh();
	};

	self.setter = function(value, path, type) {

		self.refreshcode();

		editor.setValue(value || '');
		editor.refresh();

		setTimeout(function() {
			editor.refresh();
			editor.scrollTo(0, 0);
			type && editor.setCursor(0);
		}, 200);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.tclass(cls + '-invalid', invalid);
	};
}, [function(next) {

	(function(mod) {
		mod(CodeMirror);
	})(function(CodeMirror) {

		var defaults = {
			style: 'matchhighlight',
			minChars: 2,
			delay: 100,
			wordsOnly: false,
			annotateScrollbar: false,
			showToken: false,
			trim: true
		};

		var countel = null;

		function refreshcount() {
			if (!countel)
				countel = $('.search').find('.count');
			setTimeout2(defaults.style, function() {
				if (countel) {
					var tmp = document.querySelectorAll('.cm-matchhighlight').length;
					countel.text(tmp + 'x').tclass('hidden', !tmp);
				}
			}, 100);
		}

		function State(options) {
			this.options = {};
			for (var name in defaults)
				this.options[name] = (options && options.hasOwnProperty(name) ? options : defaults)[name];
			this.overlay = this.timeout = null;
			this.matchesonscroll = null;
			this.active = false;
		}

		CodeMirror.defineOption('highlightSelectionMatches', false, function(cm, val, old) {
			if (old && old != CodeMirror.Init) {
				removeOverlay(cm);
				clearTimeout(cm.state.matchHighlighter.timeout);
				cm.state.matchHighlighter = null;
				cm.off('cursorActivity', cursorActivity);
				cm.off('focus', onFocus);
			}

			if (val) {
				var state = cm.state.matchHighlighter = new State(val);
				if (cm.hasFocus()) {
					state.active = true;
					highlightMatches(cm);
				} else {
					cm.on('focus', onFocus);
				}
				cm.on('cursorActivity', cursorActivity);
			}
		});

		function cursorActivity(cm) {
			var state = cm.state.matchHighlighter;
			if (state.active || cm.hasFocus())
				scheduleHighlight(cm, state);
		}

		function onFocus(cm) {
			var state = cm.state.matchHighlighter;
			if (!state.active) {
				state.active = true;
				scheduleHighlight(cm, state);
			}
		}

		function scheduleHighlight(cm, state) {
			clearTimeout(state.timeout);
			state.timeout = setTimeout(highlightMatches, 300, cm);
			// }, state.options.delay);
		}

		function addOverlay(cm, query, hasBoundary, style) {
			var state = cm.state.matchHighlighter;
			cm.addOverlay(state.overlay = makeOverlay(query, hasBoundary, style));
			if (state.options.annotateScrollbar && cm.showMatchesOnScrollbar) {
				var searchFor = hasBoundary ? new RegExp('\\b' + query.replace(/[\\[.+*?(){|^$]/g, '\\$&') + '\\b') : query;
				state.matchesonscroll = cm.showMatchesOnScrollbar(searchFor, false, { className: 'CodeMirror-selection-highlight-scrollbar' });
			}
		}

		function removeOverlay(cm) {
			var state = cm.state.matchHighlighter;
			if (state.overlay) {
				cm.removeOverlay(state.overlay);
				state.overlay = null;
				if (state.matchesonscroll) {
					state.matchesonscroll.clear();
					state.matchesonscroll = null;
				}
				refreshcount();
			}
		}

		function checkstr(str) {
			for (var i = 0; i < str.length; i++) {
				var c = str.charCodeAt(i);
				if (!((c > 47 && c < 58) || (c > 64 && c < 123) || (c > 128)))
					return false;
			}
			return true;
		}

		function highlightMatches(cm) {

			cm.operation(function() {

				var state = cm.state.matchHighlighter;
				removeOverlay(cm);

				if (!cm.somethingSelected() && state.options.showToken) {
					var re = state.options.showToken === true ? /[^\W\s$]/ : state.options.showToken;
					var cur = cm.getCursor(), line = cm.getLine(cur.line), start = cur.ch, end = start;
					while (start && re.test(line.charAt(start - 1))) --start;
					while (end < line.length && re.test(line.charAt(end))) ++end;
					if (start < end)
						addOverlay(cm, line.slice(start, end), re, state.options.style);
					return;
				}

				var from = cm.getCursor('from'), to = cm.getCursor('to');
				var diff = Math.abs(from.ch - to.ch);

				if (from.line != to.line || diff < 2)
					return;

				if (state.options.wordsOnly && !isWord(cm, from, to))
					return;

				var selection = cm.getRange(from, to);

				if (!checkstr(selection))
					return;

				if (state.options.trim) selection = selection.replace(/^\s+|\s+$/g, '');
				if (selection.length >= state.options.minChars) {
					addOverlay(cm, selection, false, state.options.style);
				}
			});
			refreshcount();
		}

		function isWord(cm, from, to) {
			var str = cm.getRange(from, to);
			if (str.match(/^\w+$/) !== null) {
				if (from.ch > 0) {
					var pos = {line: from.line, ch: from.ch - 1};
					var chr = cm.getRange(pos, from);
					if (chr.match(/\W/) === null)
						return false;
				}
				if (to.ch < cm.getLine(from.line).length) {
					var pos = {line: to.line, ch: to.ch + 1};
					var chr = cm.getRange(to, pos);
					if (chr.match(/\W/) === null)
						return false;
				}
				return true;
			} else
				return false;
		}

		function boundariesAround(stream, re) {
			return (!stream.start || !re.test(stream.string.charAt(stream.start - 1))) && (stream.pos == stream.string.length || !re.test(stream.string.charAt(stream.pos)));
		}

		function makeOverlay(query, hasBoundary, style) {
			return { token: function(stream) {
				if (stream.match(query) && (!hasBoundary || boundariesAround(stream, hasBoundary)))
					return style;
				stream.next();
				stream.skipTo(query.charAt(0)) || stream.skipToEnd();
			}};
		}

		CodeMirror.commands.countMatches = function() { refreshcount(); };
		CodeMirror.commands.clearMatches = function(cm) { removeOverlay(cm); };
	});

	// CodeMirror, copyright (c) by Marijn Haverbeke and others
	// Distributed under an MIT license: https://codemirror.net/LICENSE
	(function(mod) {
		mod(CodeMirror);
	})(function(CodeMirror) {

		CodeMirror.defineOption('rulers', false, function(cm, val) {

			cm.state.redrawrulers = drawRulers;

			if (cm.state.rulerDiv) {
				cm.state.rulerDiv.parentElement.removeChild(cm.state.rulerDiv);
				cm.state.rulerDiv = null;
				cm.off('refresh', drawRulers);
			}

			if (val && val.length) {
				cm.state.rulerDiv = cm.display.lineSpace.parentElement.insertBefore(document.createElement('div'), cm.display.lineSpace);
				cm.state.rulerDiv.className = 'CodeMirror-rulers';
				drawRulers(cm);
				cm.on('refresh', drawRulers);
			}
		});

		function drawRulers(cm) {
			cm.state.rulerDiv.textContent = '';
			var val = cm.getOption('rulers');
			var cw = cm.defaultCharWidth();
			var left = cm.charCoords(CodeMirror.Pos(cm.firstLine(), 0), 'div').left;
			cm.state.rulerDiv.style.minHeight = (cm.display.scroller.offsetHeight + 30) + 'px';
			for (var i = 0; i < val.length; i++) {
				var elt = document.createElement('div');
				elt.className = 'CodeMirror-ruler';
				var col, conf = val[i];
				if (typeof(conf) == 'number') {
					col = conf;
				} else {
					col = conf.column;
					if (conf.className) elt.className += ' ' + conf.className;
					if (conf.color) elt.style.borderColor = conf.color;
					if (conf.lineStyle) elt.style.borderLeftStyle = conf.lineStyle;
					if (conf.width) elt.style.borderLeftWidth = conf.width;
				}
				elt.style.left = (left + col * cw) + 'px';
				cm.state.rulerDiv.appendChild(elt);
			}
		}
	});

	// CodeMirror, copyright (c) by Marijn Haverbeke and others
	// Distributed under an MIT license: https://codemirror.net/LICENSE
	(function(mod) {
		mod(CodeMirror);
	})(function(CodeMirror) {

		var reg_skip = (/[a-zA-Z'"`0-9/$\-{@]/);
		var delay;
		var defaults = {
			pairs: '()[]{}\'\'""',
			triples: '',
			explode: '[]{}'
		};

		var Pos = CodeMirror.Pos;

		CodeMirror.defineOption('autoCloseBrackets', false, function(cm, val, old) {

			cm.on('keydown', function() {
				if (delay) {
					clearTimeout(delay);
					delay = 0;
				}
			});

			if (old && old != CodeMirror.Init) {
				cm.removeKeyMap(keyMap);
				cm.state.closeBrackets = null;
			}

			if (val) {
				ensureBound(getOption(val, 'pairs'));
				cm.state.closeBrackets = val;
				cm.addKeyMap(keyMap);
			}
		});

		function getOption(conf, name) {
			if (name == 'pairs' && typeof conf == 'string')
				return conf;
			if (typeof(conf) == 'object' && conf[name] != null)
				return conf[name];
			return defaults[name];
		}

		var keyMap = { Backspace: handleBackspace, Enter: handleEnter };

		function ensureBound(chars) {
			for (var i = 0; i < chars.length; i++) {
				var ch = chars.charAt(i), key = '\'' + ch + '\'';
				!keyMap[key] && (keyMap[key] = handler(ch));
			}
		}

		ensureBound(defaults.pairs + '`');

		function handler(ch) {
			return function(cm) {
				return handleChar(cm, ch);
			};
		}

		function getConfig(cm) {
			var deflt = cm.state.closeBrackets;
			if (!deflt || deflt.override)
				return deflt;
			return cm.getModeAt(cm.getCursor()).closeBrackets || deflt;
		}

		function handleBackspace() {
			return CodeMirror.Pass;
		}

		function handleEnter(cm) {
			var conf = getConfig(cm);
			var explode = conf && getOption(conf, 'explode');
			if (!explode || cm.getOption('disableInput'))
				return CodeMirror.Pass;

			var ranges = cm.listSelections();
			for (var i = 0; i < ranges.length; i++) {
				if (!ranges[i].empty())
					return CodeMirror.Pass;
				var around = charsAround(cm, ranges[i].head);
				if (!around || explode.indexOf(around) % 2 != 0)
					return CodeMirror.Pass;
			}

			cm.operation(function() {
				var linesep = cm.lineSeparator() || '\n';
				cm.replaceSelection(linesep + linesep, null);
				cm.execCommand('goCharLeft');
				ranges = cm.listSelections();
				for (var i = 0; i < ranges.length; i++) {
					var line = ranges[i].head.line;
					cm.indentLine(line, null, true);
					cm.indentLine(line + 1, null, true);
				}
			});
		}

		function handleChar(cm, ch) {

			delay && clearTimeout(delay);

			var conf = getConfig(cm);
			if (!conf || cm.getOption('disableInput'))
				return CodeMirror.Pass;

			var pairs = getOption(conf, 'pairs');
			var pos = pairs.indexOf(ch);
			if (pos == -1)
				return CodeMirror.Pass;

			var triples = getOption(conf, 'triples');
			var identical = pairs.charAt(pos + 1) == ch;
			var ranges = cm.listSelections();
			var opening = pos % 2 == 0;
			var type;
			var left = pos % 2 ? pairs.charAt(pos - 1) : ch;

			for (var i = 0; i < ranges.length; i++) {
				var range = ranges[i], cur = range.head, curType;
				var next = cm.getRange(cur, Pos(cur.line, cur.ch + 1));
				if (opening && !range.empty()) {
					curType = 'surround';
				} else if ((identical || !opening) && next == ch) {
					cm.replaceSelection(next, null);
					return CodeMirror.pass;
				} else if (identical && cur.ch > 1 && triples.indexOf(ch) >= 0 && cm.getRange(Pos(cur.line, cur.ch - 2), cur) == ch + ch) {
					if (cur.ch > 2 && /\bstring/.test(cm.getTokenTypeAt(Pos(cur.line, cur.ch - 2))))
						return CodeMirror.Pass;
					curType = 'addFour';
				} else if (identical) {
					var prev = cur.ch == 0 ? ' ' : cm.getRange(Pos(cur.line, cur.ch - 1), cur);
					if (reg_skip.test(next) || reg_skip.test(prev))
						return CodeMirror.Pass;
					if (!CodeMirror.isWordChar(next) && prev != ch && !CodeMirror.isWordChar(prev))
						curType = 'both';
					else
						return CodeMirror.Pass;
				} else if (opening) {
					if (reg_skip.test(next))
						return CodeMirror.Pass;
					curType = 'both';
				} else
					return CodeMirror.Pass;
				if (!type)
					type = curType;
				else if (type != curType)
					return CodeMirror.Pass;
			}

			var right = pos % 2 ? ch : pairs.charAt(pos + 1);

			if (type == 'both') {
				cm.operation(function() {
					cm.replaceSelection(left, null);
					delay && clearTimeout(delay);
					delay = setTimeout(function() {
						cm.operation(function() {
							var pos = cm.getCursor();
							var cur = cm.getModeAt(pos);
							var t = cur.helperType || cur.name;
							if (right === '}' && t === 'javascript' && FUNC.wrapbracket(cm, pos))
								return;
							cm.replaceSelection(right, 'before');
							cm.triggerElectric(right);
						});
					}, 350);
				});
			}
		}

		function charsAround(cm, pos) {
			var str = cm.getRange(Pos(pos.line, pos.ch - 1),
				Pos(pos.line, pos.ch + 1));
			return str.length == 2 ? str : null;
		}
	});

	(function(mod) {
		mod(CodeMirror);
	})(function(CodeMirror) {

		CodeMirror.defineOption('autoCloseTags', false, function(cm, val, old) {
			if (old != CodeMirror.Init && old)
				cm.removeKeyMap('autoCloseTags');
			if (!val)
				return;
			var map = { name: 'autoCloseTags' };
			if (typeof val != 'object' || val.whenClosing)
				map['\'/\''] = function(cm) {
					return autoCloseSlash(cm);
				};

			if (typeof val != 'object' || val.whenOpening)
				map['\'>\''] = function(cm) {
					return autoCloseGT(cm);
				};
			cm.addKeyMap(map);
		});

		var htmlDontClose = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
		var htmlIndent = ['applet', 'blockquote', 'body', 'button', 'div', 'dl', 'fieldset', 'form', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'html', 'iframe', 'layer', 'legend', 'object', 'ol', 'p', 'select', 'table', 'ul'];

		function autoCloseGT(cm) {

			if (cm.getOption('disableInput'))
				return CodeMirror.Pass;

			var ranges = cm.listSelections();
			var replacements = [];
			var opt = cm.getOption('autoCloseTags');

			for (var i = 0; i < ranges.length; i++) {
				if (!ranges[i].empty())
					return CodeMirror.Pass;

				var pos = ranges[i].head, tok = cm.getTokenAt(pos);
				var inner = CodeMirror.innerMode(cm.getMode(), tok.state), state = inner.state;
				if (inner.mode.name != 'xml' || !state.tagName)
					return CodeMirror.Pass;

				var anchor = ranges[i].anchor;
				var n = cm.getRange({ line: anchor.line, ch: anchor.ch }, { line: anchor.line, ch: anchor.ch + 1 });
				if (!(!n || n === ' ' || n === '\t' || n === '\n'))
					return CodeMirror.Pass;

				var html = inner.mode.configuration == 'html';
				var dontCloseTags = (typeof(opt) == 'object' && opt.dontCloseTags) || (html && htmlDontClose);
				var indentTags = (typeof opt == 'object' && opt.indentTags) || (html && htmlIndent);

				var tagName = state.tagName;
				if (tok.end > pos.ch)
					tagName = tagName.slice(0, tagName.length - tok.end + pos.ch);

				var lowerTagName = tagName.toLowerCase();
				// Don't process the '>' at the end of an end-tag or self-closing tag
				if (!tagName || tok.type == 'string' && (tok.end != pos.ch || !/["']/.test(tok.string.charAt(tok.string.length - 1)) || tok.string.length == 1) || tok.type == 'tag' && state.type == 'closeTag' || tok.string.indexOf('/') == (tok.string.length - 1) || dontCloseTags && indexOf(dontCloseTags, lowerTagName) > -1 || closingTagExists(cm, tagName, pos, state, true))
					return CodeMirror.Pass;

				var indent = indentTags && indexOf(indentTags, lowerTagName) > -1;
				replacements[i] = { indent: indent, text: '></' + tagName + '>', newPos: CodeMirror.Pos(pos.line, pos.ch + 1) };
			}

			var dontIndentOnAutoClose = (typeof(opt) == 'object' && opt.dontIndentOnAutoClose);
			for (var i = ranges.length - 1; i >= 0; i--) {
				var info = replacements[i];
				cm.replaceRange(info.text, ranges[i].head, ranges[i].anchor, '+insert');
				var sel = cm.listSelections().slice(0);
				sel[i] = { head: info.newPos, anchor: info.newPos };
				cm.setSelections(sel);
				if (!dontIndentOnAutoClose && info.indent) {
					cm.indentLine(info.newPos.line, null, true);
					cm.indentLine(info.newPos.line + 1, null, true);
				}
			}
		}

		function autoCloseCurrent(cm, typingSlash) {
			var ranges = cm.listSelections();
			var replacements = [];
			var head = typingSlash ? '/' : '</';
			var opt = cm.getOption('autoCloseTags');
			var dontIndentOnAutoClose = (typeof(opt) == 'object' && opt.dontIndentOnSlash);
			for (var i = 0; i < ranges.length; i++) {
				if (!ranges[i].empty())
					return CodeMirror.Pass;
				var pos = ranges[i].head;
				var tok = cm.getTokenAt(pos);
				var inner = CodeMirror.innerMode(cm.getMode(), tok.state);
				var state = inner.state;
				if (typingSlash && (tok.type == 'string' || tok.string.charAt(0) != '<' || tok.start != pos.ch - 1))
					return CodeMirror.Pass;

				// Kludge to get around the fact that we are not in XML mode
				// when completing in JS/CSS snippet in htmlmixed mode. Does not
				// work for other XML embedded languages (there is no general
				// way to go from a mixed mode to its current XML state).
				var replacement;

				if (inner.mode.name != 'xml') {
					if (cm.getMode().name == 'htmlmixed' && inner.mode.name == 'javascript')
						replacement = head + 'script';
					else if (cm.getMode().name == 'htmlmixed' && inner.mode.name == 'css')
						replacement = head + 'style';
					else
						return CodeMirror.Pass;
				} else {
					if (!state.context || !state.context.tagName || closingTagExists(cm, state.context.tagName, pos, state))
						return CodeMirror.Pass;
					replacement = head + state.context.tagName;
				}
				if (cm.getLine(pos.line).charAt(tok.end) != '>')
					replacement += '>';
				replacements[i] = replacement;
			}

			cm.replaceSelections(replacements);
			ranges = cm.listSelections();

			if (!dontIndentOnAutoClose) {
				for (var i = 0; i < ranges.length; i++)
					if (i == ranges.length - 1 || ranges[i].head.line < ranges[i + 1].head.line)
						cm.indentLine(ranges[i].head.line);
			}
		}

		function autoCloseSlash(cm) {
			return cm.getOption('disableInput') ? CodeMirror.Pass : autoCloseCurrent(cm, true);
		}

		CodeMirror.commands.closeTag = function(cm) {
			return autoCloseCurrent(cm);
		};

		function indexOf(collection, elt) {
			if (collection.indexOf)
				return collection.indexOf(elt);
			for (var i = 0, e = collection.length; i < e; ++i)
				if (collection[i] == elt)
					return i;
			return -1;
		}

		// If xml-fold is loaded, we use its functionality to try and verify
		// whether a given tag is actually unclosed.
		function closingTagExists(cm, tagName, pos, state, newTag) {
			if (!CodeMirror.scanForClosingTag)
				return false;
			var end = Math.min(cm.lastLine() + 1, pos.line + 500);
			var nextClose = CodeMirror.scanForClosingTag(cm, pos, null, end);
			if (!nextClose || nextClose.tag != tagName)
				return false;

			var cx = state.context;
			// If the immediate wrapping context contains onCx instances of
			// the same tag, a closing tag only exists if there are at least
			// that many closing tags of that type following.
			for (var onCx = newTag ? 1 : 0; cx && cx.tagName == tagName; cx = cx.prev)
				++onCx;

			pos = nextClose.to;
			for (var i = 1; i < onCx; i++) {
				var next = CodeMirror.scanForClosingTag(cm, pos, null, end);
				if (!next || next.tag != tagName)
					return false;
				pos = next.to;
			}
			return true;
		}
	});

	(function(mod) {
		mod(CodeMirror);
	})(function(CodeMirror) {

		var defaults = {
			style: 'matchhighlight',
			minChars: 2,
			delay: 100,
			wordsOnly: false,
			annotateScrollbar: false,
			showToken: false,
			trim: true
		};

		var countel = null;

		function refreshcount() {
			if (!countel)
				countel = $('.search').find('.count');
			setTimeout2(defaults.style, function() {
				if (countel) {
					var tmp = document.querySelectorAll('.cm-matchhighlight').length;
					countel.text(tmp + 'x').tclass('hidden', !tmp);
				}
			}, 100);
		}

		function State(options) {
			this.options = {};
			for (var name in defaults)
				this.options[name] = (options && options.hasOwnProperty(name) ? options : defaults)[name];
			this.overlay = this.timeout = null;
			this.matchesonscroll = null;
			this.active = false;
		}

		CodeMirror.defineOption('highlightSelectionMatches', false, function(cm, val, old) {
			if (old && old != CodeMirror.Init) {
				removeOverlay(cm);
				clearTimeout(cm.state.matchHighlighter.timeout);
				cm.state.matchHighlighter = null;
				cm.off('cursorActivity', cursorActivity);
				cm.off('focus', onFocus);
			}

			if (val) {
				var state = cm.state.matchHighlighter = new State(val);
				if (cm.hasFocus()) {
					state.active = true;
					highlightMatches(cm);
				} else {
					cm.on('focus', onFocus);
				}
				cm.on('cursorActivity', cursorActivity);
			}
		});

		function cursorActivity(cm) {
			var state = cm.state.matchHighlighter;
			if (state.active || cm.hasFocus())
				scheduleHighlight(cm, state);
		}

		function onFocus(cm) {
			var state = cm.state.matchHighlighter;
			if (!state.active) {
				state.active = true;
				scheduleHighlight(cm, state);
			}
		}

		function scheduleHighlight(cm, state) {
			clearTimeout(state.timeout);
			state.timeout = setTimeout(highlightMatches, 300, cm);
			// }, state.options.delay);
		}

		function addOverlay(cm, query, hasBoundary, style) {
			var state = cm.state.matchHighlighter;
			cm.addOverlay(state.overlay = makeOverlay(query, hasBoundary, style));
			if (state.options.annotateScrollbar && cm.showMatchesOnScrollbar) {
				var searchFor = hasBoundary ? new RegExp('\\b' + query.replace(/[\\[.+*?(){|^$]/g, '\\$&') + '\\b') : query;
				state.matchesonscroll = cm.showMatchesOnScrollbar(searchFor, false, { className: 'CodeMirror-selection-highlight-scrollbar' });
			}
		}

		function removeOverlay(cm) {
			var state = cm.state.matchHighlighter;
			if (state.overlay) {
				cm.removeOverlay(state.overlay);
				state.overlay = null;
				if (state.matchesonscroll) {
					state.matchesonscroll.clear();
					state.matchesonscroll = null;
				}
				refreshcount();
			}
		}

		function checkstr(str) {
			for (var i = 0; i < str.length; i++) {
				var c = str.charCodeAt(i);
				if (!((c > 47 && c < 58) || (c > 64 && c < 123) || (c > 128)))
					return false;
			}
			return true;
		}

		function highlightMatches(cm) {

			cm.operation(function() {

				var state = cm.state.matchHighlighter;
				removeOverlay(cm);

				if (!cm.somethingSelected() && state.options.showToken) {
					var re = state.options.showToken === true ? /[^\W\s$]/ : state.options.showToken;
					var cur = cm.getCursor(), line = cm.getLine(cur.line), start = cur.ch, end = start;
					while (start && re.test(line.charAt(start - 1))) --start;
					while (end < line.length && re.test(line.charAt(end))) ++end;
					if (start < end)
						addOverlay(cm, line.slice(start, end), re, state.options.style);
					return;
				}

				var from = cm.getCursor('from'), to = cm.getCursor('to');
				var diff = Math.abs(from.ch - to.ch);

				if (from.line != to.line || diff < 2)
					return;

				if (state.options.wordsOnly && !isWord(cm, from, to))
					return;

				var selection = cm.getRange(from, to);

				if (!checkstr(selection))
					return;

				if (state.options.trim) selection = selection.replace(/^\s+|\s+$/g, '');
				if (selection.length >= state.options.minChars) {
					addOverlay(cm, selection, false, state.options.style);
				}
			});
			refreshcount();
		}

		function isWord(cm, from, to) {
			var str = cm.getRange(from, to);
			if (str.match(/^\w+$/) !== null) {
				if (from.ch > 0) {
					var pos = {line: from.line, ch: from.ch - 1};
					var chr = cm.getRange(pos, from);
					if (chr.match(/\W/) === null)
						return false;
				}
				if (to.ch < cm.getLine(from.line).length) {
					var pos = {line: to.line, ch: to.ch + 1};
					var chr = cm.getRange(to, pos);
					if (chr.match(/\W/) === null)
						return false;
				}
				return true;
			} else
				return false;
		}

		function boundariesAround(stream, re) {
			return (!stream.start || !re.test(stream.string.charAt(stream.start - 1))) && (stream.pos == stream.string.length || !re.test(stream.string.charAt(stream.pos)));
		}

		function makeOverlay(query, hasBoundary, style) {
			return { token: function(stream) {
				if (stream.match(query) && (!hasBoundary || boundariesAround(stream, hasBoundary)))
					return style;
				stream.next();
				stream.skipTo(query.charAt(0)) || stream.skipToEnd();
			}};
		}

		CodeMirror.commands.countMatches = function() { refreshcount(); };
		CodeMirror.commands.clearMatches = function(cm) { removeOverlay(cm); };
	});

	(function(mod) {
		mod(CodeMirror);
	})(function(CodeMirror) {
		CodeMirror.defineOption('showTrailingSpace', false, function(cm, val, prev) {
			if (prev == CodeMirror.Init)
				prev = false;
			if (prev && !val)
				cm.removeOverlay('trailingspace');
			else if (!prev && val) {
				cm.addOverlay({ token: function(stream) {
					for (var l = stream.string.length, i = l; i; --i) {
						if (stream.string.charCodeAt(i - 1) !== 32)
							break;
					}
					if (i > stream.pos) {
						stream.pos = i;
						return null;
					}
					stream.pos = l;
					return 'trailingspace';
				}, name: 'trailingspace' });
			}
		});
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

	(function(mod) {
		mod(CodeMirror);
	})(function(CodeMirror) {

		function Bar(cls, orientation, scroll) {
			var self = this;
			self.orientation = orientation;
			self.scroll = scroll;
			self.screen = self.total = self.size = 1;
			self.pos = 0;
			self.node = document.createElement('div');
			self.node.className = cls + '-' + orientation;
			self.inner = self.node.appendChild(document.createElement('div'));

			CodeMirror.on(self.inner, 'mousedown', function(e) {

				if (e.which != 1)
					return;

				CodeMirror.e_preventDefault(e);
				var axis = self.orientation == 'horizontal' ? 'pageX' : 'pageY';
				var start = e[axis], startpos = self.pos;

				function done() {
					CodeMirror.off(document, 'mousemove', move);
					CodeMirror.off(document, 'mouseup', done);
				}

				function move(e) {
					if (e.which != 1)
						return done();
					self.moveTo(startpos + (e[axis] - start) * (self.total / self.size));
				}

				CodeMirror.on(document, 'mousemove', move);
				CodeMirror.on(document, 'mouseup', done);
			});

			CodeMirror.on(self.node, 'click', function(e) {
				CodeMirror.e_preventDefault(e);
				var innerBox = self.inner.getBoundingClientRect(), where;
				if (self.orientation == 'horizontal')
					where = e.clientX < innerBox.left ? -1 : e.clientX > innerBox.right ? 1 : 0;
				else
					where = e.clientY < innerBox.top ? -1 : e.clientY > innerBox.bottom ? 1 : 0;
				self.moveTo(self.pos + where * self.screen);
			});

			function onWheel(e) {
				var moved = CodeMirror.wheelEventPixels(e)[self.orientation == 'horizontal' ? 'x' : 'y'];
				var oldPos = self.pos;
				self.moveTo(self.pos + moved);
				if (self.pos != oldPos) CodeMirror.e_preventDefault(e);
			}
			CodeMirror.on(self.node, 'mousewheel', onWheel);
			CodeMirror.on(self.node, 'DOMMouseScroll', onWheel);
		}

		Bar.prototype.setPos = function(pos, force) {
			var t = this;
			if (pos < 0)
				pos = 0;
			if (pos > t.total - t.screen)
				pos = t.total - t.screen;
			if (!force && pos == t.pos)
				return false;
			t.pos = pos;
			t.inner.style[t.orientation == 'horizontal' ? 'left' : 'top'] = (pos * (t.size / t.total)) + 'px';
			return true;
		};

		Bar.prototype.moveTo = function(pos) {
			var t = this;
			t.setPos(pos) && t.scroll(pos, t.orientation);
		};

		var minButtonSize = 10;

		Bar.prototype.update = function(scrollSize, clientSize, barSize) {
			var t = this;
			var sizeChanged = t.screen != clientSize || t.total != scrollSize || t.size != barSize;

			if (sizeChanged) {
				t.screen = clientSize;
				t.total = scrollSize;
				t.size = barSize;
			}

			var buttonSize = t.screen * (t.size / t.total);
			if (buttonSize < minButtonSize) {
				t.size -= minButtonSize - buttonSize;
				buttonSize = minButtonSize;
			}

			t.inner.style[t.orientation == 'horizontal' ? 'width' : 'height'] = buttonSize + 'px';
			t.setPos(t.pos, sizeChanged);
		};

		function SimpleScrollbars(cls, place, scroll) {
			var t = this;
			t.addClass = cls;
			t.horiz = new Bar(cls, 'horizontal', scroll);
			place(t.horiz.node);
			t.vert = new Bar(cls, 'vertical', scroll);
			place(t.vert.node);
			t.width = null;
		}

		SimpleScrollbars.prototype.update = function(measure) {
			var t = this;
			if (t.width == null) {
				var style = window.getComputedStyle ? window.getComputedStyle(t.horiz.node) : t.horiz.node.currentStyle;
				if (style)
					t.width = parseInt(style.height);
			}

			var width = t.width || 0;
			var needsH = measure.scrollWidth > measure.clientWidth + 1;
			var needsV = measure.scrollHeight > measure.clientHeight + 1;

			t.vert.inner.style.display = needsV ? 'block' : 'none';
			t.horiz.inner.style.display = needsH ? 'block' : 'none';

			if (needsV) {
				t.vert.update(measure.scrollHeight, measure.clientHeight, measure.viewHeight - (needsH ? width : 0));
				t.vert.node.style.bottom = needsH ? width + 'px' : '0';
			}

			if (needsH) {
				var l = 0; // measure.barLeft;
				t.horiz.update(measure.scrollWidth, measure.clientWidth, measure.viewWidth - (needsV ? width : 0) - l);
				t.horiz.node.style.right = needsV ? width + 'px' : '0';
				t.horiz.node.style.left = l + 'px';
			}

			return { right: needsV ? width : 0, bottom: needsH ? width : 0 };
		};

		SimpleScrollbars.prototype.setScrollTop = function(pos) {
			this.vert.setPos(pos);
		};

		SimpleScrollbars.prototype.setScrollLeft = function(pos) {
			this.horiz.setPos(pos);
		};

		SimpleScrollbars.prototype.clear = function() {
			var parent = this.horiz.node.parentNode;
			parent.removeChild(this.horiz.node);
			parent.removeChild(this.vert.node);
		};

		CodeMirror.scrollbarModel.simple = function(place, scroll) {
			return new SimpleScrollbars('CodeMirror-simplescroll', place, scroll);
		};

		CodeMirror.scrollbarModel.overlay = function(place, scroll) {
			return new SimpleScrollbars('CodeMirror-overlayscroll', place, scroll);
		};
	});

	(function(mod) {
		mod(CodeMirror);
	})(function(CodeMirror) {
		CodeMirror.defineOption('showTrailingSpace', false, function(cm, val, prev) {
			if (prev == CodeMirror.Init)
				prev = false;
			if (prev && !val)
				cm.removeOverlay('trailingspace');
			else if (!prev && val) {
				cm.addOverlay({ token: function(stream) {
					for (var l = stream.string.length, i = l; i; --i) {
						if (stream.string.charCodeAt(i - 1) !== 32)
							break;
					}
					if (i > stream.pos) {
						stream.pos = i;
						return null;
					}
					stream.pos = l;
					return 'trailingspace';
				}, name: 'trailingspace' });
			}
		});
	});

	(function(mod) {
		mod(CodeMirror);
	})(function(CodeMirror) {

		CodeMirror.defineOption('scrollPastEnd', false, function(cm, val, old) {
			if (old && old != CodeMirror.Init) {
				cm.off('change', onChange);
				cm.off('refresh', updateBottomMargin);
				cm.display.lineSpace.parentNode.style.paddingBottom = '';
				cm.state.scrollPastEndPadding = null;
			}
			if (val) {
				cm.on('change', onChange);
				cm.on('refresh', updateBottomMargin);
				updateBottomMargin(cm);
			}
		});

		function onChange(cm, change) {
			if (CodeMirror.changeEnd(change).line == cm.lastLine())
				updateBottomMargin(cm);
		}

		function updateBottomMargin(cm) {
			var padding = '';

			if (cm.lineCount() > 1) {
				var totalH = cm.display.scroller.clientHeight - 30;
				var lastLineH = cm.getLineHandle(cm.lastLine()).height;
				padding = (totalH - lastLineH) + 'px';
			}

			if (cm.state.scrollPastEndPadding != padding) {
				cm.state.scrollPastEndPadding = padding;
				cm.display.lineSpace.parentNode.style.paddingBottom = padding;
				cm.off('refresh', updateBottomMargin);
				cm.setSize();
				cm.on('refresh', updateBottomMargin);
			}

		}
	});

	next();
}]);

COMPONENT('contextmenu', function() {
	var self = this;
	var is = false;
	var timeout;
	var container;
	var arrow;

	self.template = Tangular.compile('<div class="item{{ if selected }} selected{{ fi }}" data-value="{{ value }}"><i class="fa {{ icon }}"></i><span>{{ name | raw }}</span></div>');
	self.singleton();
	self.readonly();
	self.nocompile();
	self.callback = null;

	self.make = function() {

		self.classes('ui-contextmenu');
		self.append('<span class="ui-contextmenu-arrow fa fa-caret-up"></span><div class="ui-contextmenu-items"></div>');
		container = self.find('.ui-contextmenu-items');
		arrow = self.find('.ui-contextmenu-arrow');

		self.event('touchstart mousedown', 'div[data-value]', function(e) {
			self.callback && self.callback($(this).attrd('value'), $(self.target));
			self.hide();
			e.preventDefault();
			e.stopPropagation();
		});

		$(document).on('touchstart mousedown', function() {
			SETTER('contextmenu', 'hide', 100);
		});
	};

	self.show = function(orientation, target, items, callback, offsetX) {

		if (is) {
			clearTimeout(timeout);
			var obj = target instanceof jQuery ? target.get(0) : target;
			if (self.target === obj) {
				self.hide(0);
				return;
			}
		}

		target = $(target);
		var type = typeof(items);
		var item;

		if (type === 'string')
			items = self.get(items);
		else if (type === 'function') {
			callback = items;
			items = (target.attrd('options') || '').split(';');
			for (var i = 0, length = items.length; i < length; i++) {
				item = items[i];
				if (!item)
					continue;
				var val = item.split('|');
				items[i] = { name: val[0], icon: val[1], value: val[2] || val[0] };
			}
		}

		if (!items) {
			self.hide(0);
			return;
		}

		self.callback = callback;

		var builder = [];
		for (var i = 0, length = items.length; i < length; i++) {
			item = items[i];

			if (typeof(item) === 'string') {
				builder.push('<div class="divider">{0}</div>'.format(item));
				continue;
			}

			item.index = i;
			if (!item.value)
				item.value = item.name;
			if (!item.icon)
				item.icon = 'fa-caret-right';

			var tmp = self.template(item);
			if (item.url)
				tmp = tmp.replace('<div', '<a href="{0}" target="_blank"'.format(item.url)).replace(/div>$/g, 'a>');

			builder.push(tmp);
		}

		self.target = target.get(0);
		var offset = target.offset();

		container.html(builder);

		switch (orientation) {
			case 'left':
				arrow.css({ left: '15px' });
				break;
			case 'right':
				arrow.css({ left: '210px' });
				break;
			case 'center':
				arrow.css({ left: '107px' });
				break;
		}


		var options = { left: (orientation === 'center' ? Math.ceil((offset.left - self.element.width() / 2) + (target.innerWidth() / 2)) : orientation === 'left' ? offset.left - 8 : (offset.left - self.element.width()) + target.innerWidth()) + (offsetX || 0), top: offset.top + target.innerHeight() + 10 };
		self.css(options);

		if (is)
			return;

		self.element.show();
		setTimeout(function() {
			self.classes('ui-contextmenu-visible');
			self.emit('contextmenu', true, self, self.target);
		}, 100);

		is = true;
	};

	self.hide = function(sleep) {
		if (!is)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.element.hide().rclass('ui-contextmenu-visible');
			self.emit('contextmenu', false, self, self.target);
			self.callback = null;
			self.target = null;
			is = false;
		}, sleep ? sleep : 100);
	};
});

COMPONENT('disable', function(self, config) {

	var validate = null;
	self.readonly();

	self.configure = function(key, value) {
		if (key === 'validate')
			validate = value.split(',').trim();
	};

	self.setter = function(value) {
		var is = true;

		if (config.if)
			is = EVALUATE(self.path, config.if);
		else
			is = value ? false : true;

		self.find(config.selector || '[data-jc]').each(function() {
			var com = $(this).component();
			com && com.reconfigure('disabled:' + is);
		});

		validate && validate.forEach(FN('n => RESET({0}n)'.format(self.pathscope ? '\'' + self.pathscope + '.\'+' : '')));
	};

	self.state = function() {
		self.update();
	};
});

COMPONENT('textarea', function(self, config) {

	var input, content = null;

	self.nocompile();

	self.validate = function(value) {
		if (config.disabled || !config.required || config.readonly)
			return true;
		if (value == null)
			value = '';
		else
			value = value.toString();
		return value.length > 0;
	};

	self.configure = function(key, value, init) {
		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'readonly':
				self.find('textarea').prop('readonly', value);
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('textarea').prop('disabled', value);
				self.reset();
				break;
			case 'required':
				self.noValid(!value);
				!value && self.state(1, 1);
				self.tclass('ui-textarea-required', value);
				break;
			case 'placeholder':
				input.prop('placeholder', value || '');
				break;
			case 'maxlength':
				input.prop('maxlength', value || 1000);
				break;
			case 'label':
				redraw = true;
				break;
			case 'autofocus':
				input.focus();
				break;
			case 'monospace':
				self.tclass('ui-textarea-monospace', value);
				break;
			case 'icon':
				redraw = true;
				break;
			case 'format':
				self.format = value;
				self.refresh();
				break;
			case 'height':
				self.find('textarea').css('height', (value > 0 ? value + 'px' : value));
				break;
		}

		redraw && setTimeout2('redraw' + self.id, function() {
			self.redraw();
			self.refresh();
		}, 100);
	};

	self.redraw = function() {

		var attrs = [];
		var builder = [];

		self.tclass('ui-disabled', config.disabled === true);
		self.tclass('ui-textarea-monospace', config.monospace === true);
		self.tclass('ui-textarea-required', config.required === true);

		config.placeholder && attrs.attr('placeholder', config.placeholder);
		config.maxlength && attrs.attr('maxlength', config.maxlength);
		config.error && attrs.attr('error');
		attrs.attr('data-jc-bind', '');
		config.height && attrs.attr('style', 'height:{0}px'.format(config.height));
		config.autofocus === 'true' && attrs.attr('autofocus');
		config.disabled && attrs.attr('disabled');
		config.readonly && attrs.attr('readonly');
		builder.push('<textarea {0}></textarea>'.format(attrs.join(' ')));

		var label = config.label || content;

		if (!label.length) {
			config.error && builder.push('<div class="ui-textarea-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
			self.aclass('ui-textarea ui-textarea-container');
			self.html(builder.join(''));
			input = self.find('textarea');
			return;
		}

		var html = builder.join('');

		builder = [];
		builder.push('<div class="ui-textarea-label">');
		config.icon && builder.push('<i class="fa fa-{0}"></i>'.format(config.icon));
		builder.push(label);
		builder.push(':</div><div class="ui-textarea">{0}</div>'.format(html));
		config.error && builder.push('<div class="ui-textarea-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));

		self.html(builder.join(''));
		self.rclass('ui-textarea');
		self.aclass('ui-textarea-container');
		input = self.find('textarea');
	};

	self.make = function() {
		content = self.html();
		self.type = config.type;
		self.format = config.format;
		self.redraw();
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.tclass('ui-textarea-invalid', invalid);
		config.error && self.find('.ui-textarea-helper').tclass('ui-textarea-helper-show', invalid);
	};
});

COMPONENT('filereader2', function(self) {

	var input;

	self.readonly();
	self.nocompile && self.nocompile();

	self.make = function() {
		self.aclass('hidden');
		self.append('<input type="file" />');
		input = self.find('input');
		input.on('change', function(e) {
			self.process(e.target.files);
		});
	};

	self.open = function(accept, callback, multiple) {

		if (typeof(accept) === 'function') {
			callback = accept;
			accept = undefined;
		}

		self.callback = callback;

		if (multiple)
			input.attr('multiple', multiple);
		else
			input.removeAttr('multiple');

		if (accept)
			input.attr('accept', accept);
		else
			input.removeAttr('accept');

		input.trigger('click');
	};

	self.process = function(files) {
		var el = this;
		SETTER('loading', 'show');

		var arr = [];
		for (var i = 0; i < files.length; i++)
			arr.push(i);
		arr.wait(function(index, next) {
			var file = files[index];
			var reader = new FileReader();
			reader.onload = function() {
				var data = { body: reader.result, filename: file.name, type: file.type, size: file.size };
				if (self.callback)
					self.callback(data);
				else
					self.set(data);
				reader = null;
				setTimeout(next, 500);
			};
			reader.readAsText(file);
		}, function() {
			SETTER('loading', 'hide', 1000);
			el.value = '';
		});
	};
});

COMPONENT('filereader', function(self, config) {
	self.readonly();
	self.nocompile();
	self.make = function() {

		var element = self.element;
		var content = self.html();
		var html = '<span class="far fa-folder"></span><input type="file"' + (config.accept ? ' accept="' + config.accept + '"' : '') + ' class="ui-filereader-input" /><input type="text" placeholder="' + (config.placeholder || '') + '" readonly="readonly" />';

		if (content.length) {
			self.html('<div class="ui-filereader-label' + (config.required ? ' ui-filereader-label-required' : '') + '">' + (config.icon ? '<span class="fa fa-' + config.icon + '"></span> ' : '') + content + ':</div><div class="ui-filereader">' + html + '</div>');
		} else {
			self.aclass('ui-filereader');
			self.html(html);
		}

		element.find('.ui-filereader-input').bind('change', function(evt) {
			self.process.call(this, evt.target.files);
		});
	};

	self.process = function(files) {
		var el = this;
		SETTER('loading', 'show');
		(files.length - 1).async(function(index, next) {
			var file = files[index];
			var reader = new FileReader();
			reader.onload = function() {
				self.set({ body: reader.result, filename: file.name, type: file.type, size: file.size });
				reader = null;
				setTimeout(next, 500);
				el.value = '';
			};
			reader.readAsText(file);
		}, function() {
			SETTER('loading', 'hide', 1000);
			el.value = '';
		});
	};
});

COMPONENT('nosqlcounter', 'count:0;height:80', function(self, config, cls) {

	var cls2 = '.' + cls;
	var months = MONTHS;
	var container, labels;

	self.bindvisible();
	self.readonly();
	self.nocompile && self.nocompile();

	self.make = function() {
		self.aclass(cls);
		self.append('<div class="{1}-table"{0}><div class="{1}-cell"></div></div><div class="ui-nosqlcounter-labels"></div>'.format(config.height ? ' style="height:{0}px"'.format(config.height) : '', cls));
		container = self.find(cls2 + '-cell');
		labels = self.find(cls2 + '-labels');
	};

	self.configure = function(key, value) {
		switch (key) {
			case 'months':
				if (value instanceof Array)
					months = value;
				else
					months = value.split(',').trim();
				break;
		}
	};

	self.redraw = function(maxbars) {

		var value = self.get();
		if (!value)
			value = [];

		var dt = new Date();
		dt.setDate(1);
		var current = dt.format('yyyyMM');
		var stats = null;

		if (config.lastvalues) {
			var max = value.length - maxbars;
			if (max < 0)
				max = 0;
			stats = value.slice(max, value.length);
		} else {
			stats = [];
			for (var i = 0; i < maxbars; i++) {
				var id = dt.format('yyyyMM');
				var item = value.findItem('id', id);
				stats.push(item ? item : { id: id, month: dt.getMonth() + 1, year: dt.getFullYear(), value: 0 });
				dt = dt.add('-1 month');
			}
			stats.reverse();
		}

		var max = null;
		for (var i = 0; i < stats.length; i++) {
			if (max == null)
				max = stats[i].value;
			else
				max = Math.max(stats[i].value, max);
		}

		var bar = 100 / maxbars;
		var builder = [];
		var dates = [];
		var cls = '';
		var min = ((20 / config.height) * 100) >> 0;
		var sum = '';

		for (var i = 0, length = stats.length; i < length; i++) {
			var item = stats[i];
			var val = item.value;

			if (val > 999)
				val = (val / 1000).format(1, 2) + 'K';

			sum += val + ',';

			var h = max === 0 ? 0 : ((item.value / max) * (100 - min));
			h += min;

			cls = item.value ? '' : 'empty';

			if (item.id === current)
				cls += (cls ? ' ' : '') + 'current';

			if (i === maxbars - 1)
				cls += (cls ? ' ' : '') + 'last';

			var w = bar.format(2, '');

			builder.push('<div style="width:{0}%" title="{3}" class="{4}"><div style="height:{1}%"><span>{2}</span></div></div>'.format(w, h.format(0, ''), val, months[item.month - 1] + ' ' + item.year, cls));
			dates.push('<div style="width:{0}%">{1}</div>'.format(w, months[item.month - 1].substring(0, 3)));
		}

		if (self.old !== sum) {
			self.old = sum;
			labels.html(dates.join(''));
			container.html(builder.join(''));
		}
	};

	self.setter = function(value) {
		if (config.count === 0) {
			self.width(function(width) {
				self.redraw(width / 30 >> 0);
			});
		} else
			self.redraw(WIDTH() === 'xs' ? config.count / 2 : config.count, value);
	};
});

Array.prototype.flowConnection = function(index, id) {
	for (var i = 0; i < this.length; i++)
		if (this[i].index === index && this[i].id === id)
			return this[i];
};

COMPONENT('multioptions', function(self) {

	var Tinput = Tangular.compile('<input class="ui-moi-save ui-moi-value-inputtext" data-name="{{ name }}" type="text" value="{{ value }}"{{ if def }} placeholder="{{ def }}"{{ fi }}{{ if max }} maxlength="{{ max }}"{{ fi }} data-type="text" />');
	var Tselect = Tangular.compile('<div class="ui-moi-value-select"><i class="fa fa-chevron-down"></i><select data-name="{{ name }}" class="ui-moi-save ui-multioptions-select">{{ foreach m in values }}<option value="{{ $index }}"{{ if value === m.value }} selected="selected"{{ fi }}>{{ m.text }}</option>{{ end }}</select></div>');
	var Tnumber = Tangular.compile('<div class="ui-moi-value-inputnumber-buttons"><span class="multioptions-operation" data-type="number" data-step="{{ step }}" data-name="plus" data-max="{{ max }}" data-min="{{ min }}"><i class="fa fa-plus"></i></span><span class="multioptions-operation" data-type="number" data-name="minus" data-step="{{ step }}" data-max="{{ max }}" data-min="{{ min }}"><i class="fa fa-minus"></i></span></div><div class="ui-moi-value-inputnumber"><input data-name="{{ name }}" class="ui-moi-save ui-moi-value-numbertext" type="text" value="{{ value }}"{{ if def }} placeholder="{{ def }}"{{ fi }} data-max="{{ max }}" data-min="{{ max }}" data-type="number" /></div>');
	var Tboolean = Tangular.compile('<div data-name="{{ name }}" data-type="boolean" class="ui-moi-save multioptions-operation ui-moi-value-boolean{{ if value }} checked{{ fi }}"><i class="fa fa-check"></i></div>');
	var Tdate = Tangular.compile('<div class="ui-moi-value-inputdate-buttons"><span class="multioptions-operation" data-type="date" data-name="date"><i class="fa fa-calendar"></i></span></div><div class="ui-moi-value-inputdate"><input class="ui-moi-save ui-moi-date" data-name="{{ name }}" type="text" value="{{ value | format(\'yyyy-MM-dd\') }}" placeholder="dd.mm.yyyy" maxlength="10" data-type="date" /></div>');
	var Tcolor = null;
	var skip = false;
	var mapping = null;

	self.getter = null;
	self.novalidate();
	self.nocompile();

	self.init = function() {
		window.Tmultioptionscolor = Tangular.compile('<div class="ui-moi-value-colors ui-moi-save" data-name="{{ name }}" data-value="{{ value }}">{0}</div>'.format(['#ED5565', '#DA4453', '#FC6E51', '#E9573F', '#FFCE54', '#F6BB42', '#A0D468', '#8CC152', '#48CFAD', '#37BC9B', '#4FC1E9', '#3BAFDA', '#5D9CEC', '#4A89DC', '#AC92EC', '#967ADC', '#EC87C0', '#D770AD', '#F5F7FA', '#E6E9ED', '#CCD1D9', '#AAB2BD', '#656D78', '#434A54', '#000000'].map(function(n) { return '<span data-value="{0}" data-type="color" class="multioptions-operation" style="background-color:{0}"><i class="fa fa-check-circle"></i></span>'.format(n); }).join('')));
	};

	self.form = function() {};

	self.make = function() {

		Tcolor = window.Tmultioptionscolor;
		self.aclass('ui-multioptions');

		var el = self.find('script');

		if (el.length) {
			self.remap(el.html());
			el.remove();
		}

		self.event('click', '.multioptions-operation', function(e) {
			var el = $(this);
			var name = el.attrd('name');
			var type = el.attrd('type');

			e.stopPropagation();

			if (type === 'date') {
				el = el.parent().parent().find('input');
				SETTER('calendar', 'show', el, el.val().parseDate(), function(date) {
					el.val(date.format('yyyy-MM-dd'));
					self.$save();
				});
				return;
			}

			if (type === 'color') {
				el.parent().find('.selected').rclass('selected');
				el.aclass('selected');
				self.$save();
				return;
			}

			if (type === 'boolean') {
				el.tclass('checked');
				self.$save();
				return;
			}

			if (type === 'number') {
				var input = el.parent().parent().find('input');
				var step = (el.attrd('step') || '0').parseInt();
				var min = el.attrd('min');
				var max = el.attrd('max');

				if (!step)
					step = 1;

				if (min)
					min = min.parseInt();

				if (max)
					max = max.parseInt();

				var value;

				if (name === 'plus') {
					value = input.val().parseInt() + step;
					if (max !== 0 && max && value > max)
						value = max;
					input.val(value);
				} else {
					value = input.val().parseInt() - step;
					if (min !== 0 && min && value < min)
						value = min;
					input.val(value);
				}
				self.$save();
				return;
			}

			self.form(type, el.parent().parent().find('input'), name);
			return;
		});

		self.event('change', 'select', self.$save);
		self.event('input', 'input', self.$save);

		self.event('click', '.ui-moi-date', function(e) {
			e.stopPropagation();
		});

		self.event('focus', '.ui-moi-date', function() {
			var el = $(this);
			SETTER('calendar', 'toggle', el, el.val().parseDate(), function(date) {
				el.val(date.format('yyyy-MM-dd'));
				self.$save();
			});
		});
	};

	self.remap = function(js) {
		var fn = new Function('option', js);
		mapping = {};
		fn(self.mapping);
		self.refresh();
		self.change(false);
	};

	self.remap2 = function(callback) {
		mapping = {};
		callback(self.mapping);
		self.refresh();
		self.change(false);
	};

	self.mapping = function(key, label, def, type, max, min, step, validator) {
		if (typeof(type) === 'number') {
			validator = step;
			step = min;
			min = max;
			max = type;
			type = 'number';
		} else if (!type)
			type = def instanceof Date ? 'date' : typeof(def);

		var values;

		if (type instanceof Array) {

			values = [];

			type.forEach(function(val) {
				values.push({ text: val.text === undefined ? val : val.text, value: val.value === undefined ? val : val.value });
			});

			type = 'array';
		}

		if (validator && typeof(validator) !== 'function')
			validator = null;

		mapping[key] = { name: key, label: label, type: type.toLowerCase(), def: def, max: max, min: min, step: step, value: def, values: values, validator: validator };
	};

	self.$save = function() {
		setTimeout2('multioptions.' + self._id, self.save, 150);
	};

	self.save = function() {
		var obj = self.get();
		var values = self.find('.ui-moi-save');

		Object.keys(mapping).forEach(function(key) {

			var opt = mapping[key];
			var el = values.filter('[data-name="{0}"]'.format(opt.name));

			if (el.hclass('ui-moi-value-colors')) {
				obj[key] = el.find('.selected').attrd('value');
				return;
			}

			if (el.hclass('ui-moi-value-boolean')) {
				obj[key] = el.hclass('checked');
				return;
			}

			if (el.hclass('ui-moi-date')) {
				obj[key] = el.val().parseDate();
				return;
			}

			if (el.hclass('ui-moi-value-inputtext')) {
				obj[key] = el.val();
				return;
			}

			if (el.hclass('ui-moi-value-numbertext')) {
				obj[key] = el.val().parseInt();
				return;
			}

			if (el.hclass('ui-moi-value-numbertext')) {
				obj[key] = el.val().parseInt();
				return;
			}

			if (el.hclass('ui-multioptions-select')) {
				var index = el.val().parseInt();
				var val = opt.values[index];
				obj[key] = val ? val.value : null;
				if (obj[key] && obj[key].value)
					obj[key] = obj[key].value;
				return;
			}
		});

		skip = true;
		self.set(obj);
		self.change(true);
	};

	self.setter = function(options) {

		if (!options || skip || !mapping) {
			skip = false;
			return;
		}

		var builder = [];
		Object.keys(mapping).forEach(function(key) {

			var option = mapping[key];

			// option.name
			// option.label
			// option.type (lowercase)
			// option.def
			// option.value
			// option.max
			// option.min
			// option.step

			option.value = options[key] || option.def;

			var value = '';

			switch (option.type) {
				case 'string':
					value = Tinput(option);
					break;
				case 'number':
					value = Tnumber(option);
					break;
				case 'boolean':
					value = Tboolean(option);
					break;
				case 'color':
					value = Tcolor(option);
					break;
				case 'array':
					value = Tselect(option);
					break;
				case 'date':
					value = Tdate(option);
					break;
			}

			builder.push('<div class="ui-multioptions-item"><div class="ui-moi-name">{0}</div><div class="ui-moi-value">{1}</div></div>'.format(option.label, value));
		});

		self.empty().html(builder);

		self.find('.ui-moi-value-colors').each(function() {
			var el = $(this);
			var value = el.attrd('value');
			el.find('[data-value="{0}"]'.format(value)).aclass('selected');
		});
	};
});

COMPONENT('dragdropfiles', function(self, config) {

	var has = false;

	self.readonly();

	self.mirror = function(cls) {
		var arr = cls.split(' ');
		for (var i = 0, length = arr.length; i < length; i++) {
			arr[i] = arr[i].replace(/^(\+|-)/g, function(c) {
				return c === '+' ? '-' : '+';
			});
		}
		return arr.join(' ');
	};

	self.dragdropclasses = function() {
		config.class && has && self.classes(self.mirror(config.class));
		has = false;
	};

	self.make = function() {

		self.event('dragenter dragover dragexit drop dragleave', function (e) {

			e.stopPropagation();
			e.preventDefault();

			switch (e.type) {
				case 'drop':
					config.class && has && self.classes(self.mirror(config.class));
					break;
				case 'dragenter':
				case 'dragover':
					config.class && !has && self.classes(config.class);
					has = true;
					return;
				case 'dragleave':
					setTimeout2(self.id, self.dragdropclasses, 500);
					return;
				case 'dragexit':
				default:
					return;
			}

			EXEC(config.exec, e.originalEvent.dataTransfer.files, e);
		});
	};
});

COMPONENT('features', 'height:37', function(self, config) {

	var container, timeout, input, search, scroller = null;
	var is = false, results = false, selectedindex = 0, resultscount = 0;

	self.oldsearch = '';
	self.items = null;
	self.template = Tangular.compile('<li data-search="{{ $.search }}" data-index="{{ $.index }}"{{ if selected }} class="selected"{{ fi }}>{{ if icon }}<i class="fa fa-{{ icon }}"></i>{{ fi }}{{ name | raw }}</li>');
	self.callback = null;
	self.readonly();
	self.singleton();
	self.nocompile();

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'placeholder':
				self.find('input').prop('placeholder', value);
				break;
		}
	};

	self.make = function() {

		self.aclass('ui-features-layer hidden');
		self.append('<div class="ui-features"><div class="ui-features-search"><span><i class="fa fa-search"></i></span><div><input type="text" placeholder="{0}" class="ui-features-search-input" /></div></div><div class="ui-features-container"><ul></ul></div></div>'.format(config.placeholder));

		container = self.find('ul');
		input = self.find('input');
		search = self.find('.ui-features');
		scroller = self.find('.ui-features-container');

		self.event('touchstart mousedown', 'li[data-index]', function(e) {
			self.callback && self.callback(self.items[+this.getAttribute('data-index')]);
			self.hide();
			e.preventDefault();
			e.stopPropagation();
		});

		$(document).on('touchstart mousedown', function(e) {
			is && !$(e.target).hclass('ui-features-search-input') && self.hide(0);
		});

		$(window).on('resize', function() {
			is && self.hide(0);
		});

		self.event('keydown', 'input', function(e) {
			var o = false;
			switch (e.which) {
				case 27:
					o = true;
					self.hide();
					break;
				case 13:
					o = true;
					var sel = self.find('li.selected');
					if (sel.length && self.callback)
						self.callback(self.items[+sel.attrd('index')]);
					self.hide();
					break;
				case 38: // up
					o = true;
					selectedindex--;
					if (selectedindex < 0)
						selectedindex = 0;
					else
						self.move();
					break;
				case 40: // down
					o = true;
					selectedindex++ ;
					if (selectedindex >= resultscount)
						selectedindex = resultscount;
					else
						self.move();
					break;
			}

			if (o && results) {
				e.preventDefault();
				e.stopPropagation();
			}
		});

		self.event('keyup', 'input', function() {
			setTimeout2(self.id, self.search, 100, null, this.value);
		});
	};

	self.search = function(value) {

		if (!value) {
			if (self.oldsearch === value)
				return;
			self.oldsearch = value;
			selectedindex = 0;
			results = true;
			resultscount = self.items.length;
			container.find('li').rclass('hidden selected');
			self.move();
			return;
		}

		if (self.oldsearch === value)
			return;

		self.oldsearch = value;
		value = value.toSearch().split(' ');
		results = false;
		resultscount = 0;
		selectedindex = 0;

		container.find('li').each(function() {
			var el = $(this);
			var val = el.attrd('search');
			var h = false;

			for (var i = 0; i < value.length; i++) {
				if (val.indexOf(value[i]) === -1) {
					h = true;
					break;
				}
			}

			if (!h) {
				results = true;
				resultscount++;
			}

			el.tclass('hidden', h);
			el.rclass('selected');
		});
		self.move();
	};

	self.move = function() {
		var counter = 0;
		var h = scroller.css('max-height').parseInt();

		container.find('li').each(function() {
			var el = $(this);
			if (el.hclass('hidden'))
				return;
			var is = selectedindex === counter;
			el.tclass('selected', is);
			if (is) {
				var t = (config.height * counter) - config.height;
				if ((t + config.height * 5) > h)
					scroller.scrollTop(t);
				else
					scroller.scrollTop(0);
			}
			counter++;
		});
	};

	self.show = function(items, callback) {

		if (is) {
			clearTimeout(timeout);
			self.hide(0);
			return;
		}

		var type = typeof(items);
		var item;

		if (type === 'string')
			items = self.get(items);

		if (!items) {
			self.hide(0);
			return;
		}

		self.items = items;
		self.callback = callback;
		results = true;
		resultscount = self.items.length;

		input.val('');

		var builder = [];
		var indexer = {};

		for (var i = 0, length = items.length; i < length; i++) {
			item = items[i];
			indexer.index = i;
			indexer.search = (item.name + ' ' + (item.keywords || '')).trim().toSearch();
			!item.value && (item.value = item.name);
			builder.push(self.template(item, indexer));
		}

		container.html(builder);

		var W = $(window);
		var top = ((W.height() / 2) - (search.height() / 2)) - scroller.css('max-height').parseInt();
		var options = { top: top, left: (W.width() / 2) - (search.width() / 2) };

		search.css(options);
		self.move();

		if (is)
			return;

		self.rclass('hidden');

		setTimeout(function() {
			self.aclass('ui-features-visible');
		}, 100);

		!isMOBILE && setTimeout(function() {
			input.focus();
		}, 500);

		is = true;
		$('html,body').aclass('ui-features-noscroll');
	};

	self.hide = function(sleep) {
		if (!is)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.aclass('hidden').rclass('ui-features-visible');
			self.callback = null;
			self.target = null;
			is = false;
			$('html,body').rclass('ui-features-noscroll');
		}, sleep ? sleep : 100);
	};
});

COMPONENT('shortcuts', function(self) {

	var items = [];
	var length = 0;

	self.singleton();
	self.readonly();
	self.blind();
	self.nocompile();

	self.make = function() {
		$(window).on('keydown', function(e) {
			if (length && !e.isPropagationStopped()) {
				for (var i = 0; i < length; i++) {
					var o = items[i];
					if (o.fn(e)) {
						if (o.prevent) {
							e.preventDefault();
							e.stopPropagation();
						}
						setTimeout(function(o, e) {
							o.callback(e);
						}, 100, o, e);
					}
				}
			}
		});
	};

	self.exec = function(shortcut) {
		var item = items.findItem('shortcut', shortcut.toLowerCase().replace(/\s/g, ''));
		item && item.callback(EMPTYOBJECT);
	};

	self.register = function(shortcut, callback, prevent) {
		shortcut.split(',').trim().forEach(function(shortcut) {
			var builder = [];
			var alias = [];
			shortcut.split('+').trim().forEach(function(item) {
				var lower = item.toLowerCase();
				alias.push(lower);
				switch (lower) {
					case 'ctrl':
					case 'alt':
					case 'shift':
						builder.push('e.{0}Key'.format(lower));
						return;
					case 'win':
					case 'meta':
					case 'cmd':
						builder.push('e.metaKey');
						return;
					case 'ins':
						builder.push('e.keyCode===45');
						return;
					case 'space':
						builder.push('e.keyCode===32');
						return;
					case 'tab':
						builder.push('e.keyCode===9');
						return;
					case 'esc':
						builder.push('e.keyCode===27');
						return;
					case 'enter':
						builder.push('e.keyCode===13');
						return;
					case 'backspace':
					case 'del':
					case 'delete':
						builder.push('(e.keyCode===8||e.keyCode===127)');
						return;
					case 'up':
						builder.push('e.keyCode===38');
						return;
					case 'down':
						builder.push('e.keyCode===40');
						return;
					case 'right':
						builder.push('e.keyCode===39');
						return;
					case 'left':
						builder.push('e.keyCode===37');
						return;
					case 'f1':
					case 'f2':
					case 'f3':
					case 'f4':
					case 'f5':
					case 'f6':
					case 'f7':
					case 'f8':
					case 'f9':
					case 'f10':
					case 'f11':
					case 'f12':
						var a = item.toUpperCase();
						builder.push('e.key===\'{0}\''.format(a));
						return;
					case 'capslock':
						builder.push('e.which===20');
						return;
				}

				var num = item.parseInt();
				if (num)
					builder.push('e.which===' + num);
				else
					builder.push('e.keyCode==={0}'.format(item.toUpperCase().charCodeAt(0)));
			});

			items.push({ shortcut: alias.join('+'), fn: new Function('e', 'return ' + builder.join('&&')), callback: callback, prevent: prevent });
			length = items.length;
		});
		return self;
	};
});

COMPONENT('snackbar', 'timeout:4000;button:OK', function(self, config, cls) {

	var cls2 = '.' + cls;
	var show = true;
	var callback;
	var delay;

	self.readonly();
	self.blind();
	self.nocompile && self.nocompile();

	self.make = function() {
		self.aclass(cls + ' hidden');
		self.append('<div><span class="{0}-dismiss"></span><span class="{0}-icon"></span><div class="{0}-body"></div></div>'.format(cls));
		self.event('click', cls2 + '-dismiss', function() {
			self.hide();
			callback && callback();
		});
	};

	self.hide = function() {
		clearTimeout2(self.ID);
		self.rclass(cls + '-visible');
		if (delay) {
			clearTimeout(delay);
			self.aclass('hidden');
			delay = null;
		} else {
			delay = setTimeout(function() {
				delay = null;
				self.aclass('hidden');
			}, 1000);
		}
		show = true;
	};

	self.waiting = function(message, button, close) {
		self.show(message, button, close, 'spinner fa-pulse');
	};

	self.success = function(message, button, close) {
		self.show(message, button, close, 'check-circle');
	};

	self.warning = function(message, button, close) {
		self.show(message, button, close, 'times-circle');
	};

	self.show = function(message, button, close, icon) {

		if (typeof(button) === 'function') {
			close = button;
			button = null;
		}

		callback = close;

		var ico = icon || 'info-circle';
		if (ico.indexOf(' ') === -1)
			ico = 'fa fa-' + ico;

		self.find(cls2 + '-icon').html('<i class="{0}"></i>'.format(ico));
		self.find(cls2 + '-body').html(message).attr('title', message);
		self.find(cls2 + '-dismiss').html(button || config.button);

		if (show) {
			self.rclass('hidden');
			setTimeout(function() {
				self.aclass(cls + '-visible');
			}, 50);
		}

		setTimeout2(self.ID, self.hide, config.timeout + 50);
		show = false;
	};

	self.response = function(message, callback, response) {

		var fn;

		if (typeof(message) === 'function') {
			response = callback;
			fn = message;
			message = null;
		} else if (typeof(callback) === 'function')
			fn = callback;
		else {
			response = callback;
			fn = null;
		}

		if (response instanceof Array) {
			var builder = [];
			for (var i = 0; i < response.length; i++) {
				var err = response[i].error;
				err && builder.push(err);
			}
			self.warning(builder.join('<br />'));
			SETTER('!loading/hide');
		} else if (typeof(response) === 'string') {
			self.warning(response);
			SETTER('!loading/hide');
		} else {

			if (message) {
				if (message.length < 40 && message.charAt(0) === '?')
					SET(message, response);
				else
					self.success(message);
			}

			if (typeof(fn) === 'string')
				SET(fn, response);
			else if (fn)
				fn(response);
		}
	};
});

COMPONENT('colorselector', 'colors:#DA4453,#E9573F,#F6BB42,#8CC152,#37BC9B,#3BAFDA,#4A89DC,#967ADC,#D770AD,#656D7D;empty:true', function(self, config) {

	var selected, list, content, colors = null;

	self.nocompile();

	self.validate = function(value) {
		return config.disabled || !config.required ? true : colors.indexOf(value) === -1;
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		var redraw = false;
		switch (key) {
			case 'required':
				self.find('.ui-colorselector-label').tclas('.ui-colorselector-required', value);
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				break;
			case 'colors':
				colors = value.split(',').trim();
				break;
			case 'label':
			case 'icon':
				redraw = true;
				break;
		}

		redraw && setTimeout2('redraw.' + self.id, function() {
			self.redraw();
			self.refresh();
		}, 100);
	};

	self.redraw = function() {
		var builder = [];
		var label = config.label || content;
		label && builder.push('<div class="ui-colorselector-label{1}">{2}{0}</div>'.format(label, config.required ? ' ui-colorselector-required' : '', config.icon ? '<i class="fa fa-{0}"></i>'.format(config.icon) : ''));
		builder.push('<ul class="ui-colorselector">');

		for (var i = 0, length = colors.length; i < length; i++) {
			var color = colors[i];
			color && builder.push('<li data-index="{0}" style="background-color:{1}"></li>'.format(i, color));
		}

		builder.push('</ul>');
		self.html(builder.join(''));
		self.tclass('ui-disabled', config.disabled);
		list = self.find('li');
	};

	self.make = function() {
		colors = config.colors.split(',').trim();
		self.redraw();
		self.event('click', 'li', function() {
			if (config.disabled)
				return;
			var color = colors[+this.getAttribute('data-index')];
			if (!config.required && color === self.get())
				color = '';
			self.change(true);
			self.set(color);
		});
	};

	self.setter = function(value) {
		var index = colors.indexOf(value);
		selected && selected.rclass('selected');
		if (index !== -1) {
			selected = list.eq(index);
			selected.aclass('selected');
		}
	};
});

COMPONENT('progress', 'animate:true', function(self, config) {

	var container, old = null;

	self.readonly();
	self.nocompile();

	self.make = function() {
		self.aclass('ui-progress');
		self.append('<div style="width:10%">0%</div>');
		container = self.find('div');
	};

	self.setter = function(value) {
		!value && (value = 0);
		if (old === value)
			return;

		if (value > 100)
			value = 100;
		else if (value < 0)
			value = 0;

		old = value >> 0;
		if (config.animate)
			container.stop().animate({ width: old + '%' }, 80).show();
		else
			container.css({ width: old + '%' });

		container.html(old + '%');
	};
});

COMPONENT('directory', 'minwidth:200', function(self, config, cls) {

	var cls2 = '.' + cls;
	var container, timeout, icon, plus, skipreset = false, skipclear = false, ready = false, input = null, issearch = false;
	var is = false, selectedindex = 0, resultscount = 0, skiphide = false;
	var templateE = '{{ name | encode | ui_directory_helper }}';
	var templateR = '{{ name | raw }}';
	var template = '<li data-index="{{ $.index }}" data-search="{{ $.search }}" {{ if selected }} class="current selected{{ if classname }} {{ classname }}{{ fi }}"{{ else if classname }} class="{{ classname }}"{{ fi }}>{{ if $.checkbox }}<span class="' + cls + '-checkbox"><i class="fa fa-check"></i></span>{{ fi }}{0}</li>';
	var templateraw = template.format(templateR);
	var regstrip = /(&nbsp;|<([^>]+)>)/ig;
	var parentclass;

	template = template.format(templateE);

	Thelpers.ui_directory_helper = function(val) {
		var t = this;
		return t.template ? (typeof(t.template) === 'string' ? t.template.indexOf('{{') === -1 ? t.template : Tangular.render(t.template, this) : t.render(this, val)) : self.opt.render ? self.opt.render(this, val) : val;
	};

	self.template = Tangular.compile(template);
	self.templateraw = Tangular.compile(templateraw);

	self.readonly();
	self.singleton();
	self.nocompile && self.nocompile();

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'placeholder':
				self.find('input').prop('placeholder', value);
				break;
		}
	};

	self.make = function() {

		self.aclass(cls + ' hidden');
		self.append('<div class="{1}-search"><span class="{1}-add hidden"><i class="fa fa-plus"></i></span><span class="{1}-button"><i class="fa fa-search"></i></span><div><input type="text" placeholder="{0}" class="{1}-search-input" name="dir{2}" autocomplete="new-password" /></div></div><div class="{1}-container"><ul></ul></div>'.format(config.placeholder, cls, Date.now()));
		container = self.find('ul');
		input = self.find('input');
		icon = self.find(cls2 + '-button').find('.fa');
		plus = self.find(cls2 + '-add');

		self.event('mouseenter mouseleave', 'li', function() {
			if (ready && !issearch) {
				container.find('li.current').rclass('current');
				$(this).aclass('current');
				var arr = container.find('li:visible');
				for (var i = 0; i < arr.length; i++) {
					if ($(arr[i]).hclass('current')) {
						selectedindex = i;
						break;
					}
				}
			}
		});

		self.event('focus', 'input', function() {
			if (self.opt.search === false)
				$(this).blur();
		});

		self.event('click', cls2 + '-button', function(e) {
			skipclear = false;
			input.val('');
			self.search();
			e.stopPropagation();
			e.preventDefault();
		});

		self.event('click', cls2 + '-add', function() {
			if (self.opt.custom && self.opt.callback) {
				self.opt.scope && M.scope(self.opt.scope);
				self.opt.callback(input.val(), self.opt.element, true);
				self.hide();
			}
		});

		self.event('click', 'li', function(e) {

			if (self.opt.callback) {
				self.opt.scope && M.scope(self.opt.scope);
				var item = self.opt.items[+this.getAttribute('data-index')];
				if (self.opt.checkbox) {
					item.selected = !item.selected;
					$(this).tclass('selected', item.selected);
					var response = [];
					for (var i = 0; i < self.opt.items.length; i++) {
						var m = self.opt.items[i];
						if (m.selected)
							response.push(m);
					}
					self.opt.callback(response, self.opt.element);
					skiphide = true;
				} else
					self.opt.callback(item, self.opt.element);
			}

			is = true;

			if (!self.opt.checkbox) {
				self.hide(0);
				e.preventDefault();
				e.stopPropagation();
			}

		});

		var e_click = function(e) {

			if (skiphide) {
				skiphide = false;
				return;
			}

			var node = e.target;
			var count = 0;

			if (is) {
				while (true) {
					var c = node.getAttribute('class') || '';
					if (c.indexOf(cls + '-search-input') !== -1)
						return;
					node = node.parentNode;
					if (!node || !node.tagName || node.tagName === 'BODY' || count > 3)
						break;
					count++;
				}
			} else {
				is = true;
				while (true) {
					var c = node.getAttribute('class') || '';
					if (c.indexOf(cls) !== -1) {
						is = false;
						break;
					}
					node = node.parentNode;
					if (!node || !node.tagName || node.tagName === 'BODY' || count > 4)
						break;
					count++;
				}
			}

			is && self.hide(0);
		};

		var e_resize = function() {
			is && self.hide(0);
		};

		self.bindedevents = false;

		self.bindevents = function() {
			if (!self.bindedevents) {
				$(document).on('click', e_click);
				$(W).on('resize', e_resize);
				self.bindedevents = true;
			}
		};

		self.unbindevents = function() {
			if (self.bindedevents) {
				self.bindedevents = false;
				$(document).off('click', e_click);
				$(W).off('resize', e_resize);
			}
		};

		self.event('keydown', 'input', function(e) {
			var o = false;
			switch (e.which) {
				case 8:
					skipclear = false;
					break;
				case 27:
					o = true;
					self.hide();
					break;
				case 13:
					o = true;
					var sel = self.find('li.current');
					if (self.opt.callback) {
						self.opt.scope && M.scope(self.opt.scope);
						if (sel.length)
							self.opt.callback(self.opt.items[+sel.attrd('index')], self.opt.element);
						else if (self.opt.custom)
							self.opt.callback(this.value, self.opt.element, true);
					}
					self.hide();
					break;
				case 38: // up
					o = true;
					selectedindex--;
					if (selectedindex < 0)
						selectedindex = 0;
					self.move();
					break;
				case 40: // down
					o = true;
					selectedindex++;
					if (selectedindex >= resultscount)
						selectedindex = resultscount;
					self.move();
					break;
			}

			if (o) {
				e.preventDefault();
				e.stopPropagation();
			}

		});

		self.event('input', 'input', function() {
			issearch = true;
			setTimeout2(self.ID, self.search, 100, null, this.value);
		});

		var fn = function() {
			is && self.hide(1);
		};

		self.on('reflow + scroll + resize + resize2', fn);
		$(W).on('scroll', fn);
	};

	self.move = function() {

		var counter = 0;
		var scroller = container.parent();
		var li = container.find('li');
		var hli = 0;
		var was = false;
		var last = -1;
		var lastselected = 0;
		var plus = 0;

		for (var i = 0; i < li.length; i++) {

			var el = $(li[i]);

			if (el.hclass('hidden')) {
				el.rclass('current');
				continue;
			}

			var is = selectedindex === counter;
			el.tclass('current', is);

			if (is) {
				hli = (el.innerHeight() || 30) + 1;
				plus = (hli * 2);
				was = true;
				var t = (hli * (counter || 1));
				scroller[0].scrollTop = t - plus;
			}

			counter++;
			last = i;
			lastselected++;
		}

		if (!was && last >= 0) {
			selectedindex = lastselected;
			li.eq(last).aclass('current');
		}
	};

	var nosearch = function() {
		issearch = false;
	};

	self.nosearch = function() {
		setTimeout2(self.ID + 'nosearch', nosearch, 500);
	};

	self.search = function(value) {

		if (!self.opt)
			return;

		icon.tclass('fa-times', !!value).tclass('fa-search', !value);
		self.opt.custom && plus.tclass('hidden', !value);

		if (!value && !self.opt.ajax) {
			if (!skipclear)
				container.find('li').rclass('hidden');
			if (!skipreset)
				selectedindex = 0;
			resultscount = self.opt.items ? self.opt.items.length : 0;
			self.move();
			self.nosearch();
			return;
		}

		resultscount = 0;
		selectedindex = 0;

		if (self.opt.ajax) {
			var val = value || '';
			if (self.ajaxold !== val) {
				self.ajaxold = val;
				setTimeout2(self.ID, function(val) {
					self.opt && self.opt.ajax(val, function(items) {
						var builder = [];
						var indexer = {};
						var item;
						var key = (self.opt.search == true ? self.opt.key : (self.opt.search || self.opt.key)) || 'name';

						for (var i = 0; i < items.length; i++) {
							item = items[i];
							if (self.opt.exclude && self.opt.exclude(item))
								continue;
							indexer.index = i;
							indexer.search = item[key] ? item[key].replace(regstrip, '') : '';
							indexer.checkbox = self.opt.checkbox === true;
							resultscount++;
							builder.push(self.opt.ta(item, indexer));
						}

						if (self.opt.empty) {
							item = {};
							var tmp = self.opt.raw ? '<b>{0}</b>'.format(self.opt.empty) : self.opt.empty;
							item[self.opt.key || 'name'] = tmp;
							if (!self.opt.raw)
								item.template = '<b>{0}</b>'.format(self.opt.empty);
							indexer.index = -1;
							builder.unshift(self.opt.ta(item, indexer));
						}

						skipclear = true;
						self.opt.items = items;
						container.html(builder);
						self.move();
						self.nosearch();
					});
				}, 300, null, val);
			}
		} else if (value) {
			value = value.toSearch().split(' ');
			var arr = container.find('li');
			for (var i = 0; i < arr.length; i++) {
				var el = $(arr[i]);
				var val = el.attrd('search').toSearch();
				var is = false;

				for (var j = 0; j < value.length; j++) {
					if (val.indexOf(value[j]) === -1) {
						is = true;
						break;
					}
				}

				el.tclass('hidden', is);

				if (!is)
					resultscount++;
			}
			skipclear = true;
			self.move();
			self.nosearch();
		}
	};

	self.show = function(opt) {

		// opt.element
		// opt.items
		// opt.callback(value, el)
		// opt.offsetX     --> offsetX
		// opt.offsetY     --> offsetY
		// opt.offsetWidth --> plusWidth
		// opt.placeholder
		// opt.render
		// opt.custom
		// opt.minwidth
		// opt.maxwidth
		// opt.key
		// opt.exclude    --> function(item) must return Boolean
		// opt.search
		// opt.selected   --> only for String Array "opt.items"
		// opt.classname

		var el = opt.element instanceof jQuery ? opt.element[0] : opt.element;

		if (opt.items == null)
			opt.items = EMPTYARRAY;

		self.tclass(cls + '-default', !opt.render);

		if (parentclass) {
			self.rclass(parentclass);
			parentclass = null;
		}

		if (opt.classname) {
			self.aclass(opt.classname);
			parentclass = opt.classname;
		}

		if (!opt.minwidth)
			opt.minwidth = 200;

		if (is) {
			clearTimeout(timeout);
			if (self.target === el) {
				self.hide(1);
				return;
			}
		}

		self.initializing = true;
		self.target = el;
		opt.ajax = null;
		self.ajaxold = null;

		var element = $(opt.element);
		var callback = opt.callback;
		var items = opt.items;
		var type = typeof(items);
		var item;

		if (type === 'string') {
			items = opt.items = GET(items);
			type = typeof(items);
		}

		if (type === 'function' && callback) {
			type = '';
			opt.ajax = items;
			items = null;
		}

		if (!items && !opt.ajax) {
			self.hide(0);
			return;
		}

		setTimeout(self.bindevents, 500);
		self.tclass(cls + '-search-hidden', opt.search === false);

		self.opt = opt;
		opt.class && self.aclass(opt.class);

		input.val('');

		var builder = [];
		var selected = null;

		opt.ta = opt.key ? Tangular.compile((opt.raw ? templateraw : template).replace(/\{\{\sname/g, '{{ ' + opt.key)) : opt.raw ? self.templateraw : self.template;

		if (!opt.ajax) {
			var indexer = {};
			var key = (opt.search == true ? opt.key : (opt.search || opt.key)) || 'name';
			for (var i = 0; i < items.length; i++) {

				item = items[i];

				if (typeof(item) === 'string')
					item = { name: item, id: item, selected: item === opt.selected };

				if (opt.exclude && opt.exclude(item))
					continue;

				if (item.selected || opt.selected === item) {
					selected = i;
					skipreset = true;
					item.selected = true;
				} else
					item.selected = false;

				indexer.checkbox = opt.checkbox === true;
				indexer.index = i;
				indexer.search = item[key] ? item[key].replace(regstrip, '') : '';
				builder.push(opt.ta(item, indexer));
			}

			if (opt.empty) {
				item = {};
				var tmp = opt.raw ? '<b>{0}</b>'.format(opt.empty) : opt.empty;
				item[opt.key || 'name'] = tmp;
				if (!opt.raw)
					item.template = '<b>{0}</b>'.format(opt.empty);
				indexer.index = -1;
				builder.unshift(opt.ta(item, indexer));
			}
		}

		self.target = element[0];

		var w = element.width();
		var offset = element.offset();
		var width = w + (opt.offsetWidth || 0);

		if (opt.minwidth && width < opt.minwidth)
			width = opt.minwidth;
		else if (opt.maxwidth && width > opt.maxwidth)
			width = opt.maxwidth;

		ready = false;

		opt.ajaxold = null;
		plus.aclass('hidden');
		self.find('input').prop('placeholder', opt.placeholder || config.placeholder);
		var scroller = self.find(cls2 + '-container').css('width', width + 30);
		container.html(builder);

		var options = { left: 0, top: 0, width: width };

		switch (opt.align) {
			case 'center':
				options.left = Math.ceil((offset.left - width / 2) + (opt.element.innerWidth() / 2));
				break;
			case 'right':
				options.left = (offset.left - width) + opt.element.innerWidth();
				break;
			default:
				options.left = offset.left;
				break;
		}

		options.top = opt.position === 'bottom' ? ((offset.top - self.height()) + element.height()) : offset.top;
		options.scope = M.scope ? M.scope() : '';

		if (opt.offsetX)
			options.left += opt.offsetX;

		if (opt.offsetY)
			options.top += opt.offsetY;

		var mw = width;
		var mh = self.height();

		if (options.left < 0)
			options.left = 10;
		else if ((mw + options.left) > WW)
			options.left = (WW - mw) - 10;

		if (options.top < 0)
			options.top = 10;
		else if ((mh + options.top) > WH)
			options.top = (WH - mh) - 10;

		self.css(options);

		!isMOBILE && setTimeout(function() {
			ready = true;
			if (opt.search !== false)
				input.focus();
		}, 200);

		setTimeout(function() {
			self.initializing = false;
			is = true;
			if (selected == null)
				scroller[0].scrollTop = 0;
			else {
				var h = container.find('li:first-child').innerHeight() + 1;
				var y = (container.find('li.selected').index() * h) - (h * 2);
				scroller[0].scrollTop = y < 0 ? 0 : y;
			}
		}, 100);

		if (is) {
			self.search();
			return;
		}

		selectedindex = selected || 0;
		resultscount = items ? items.length : 0;
		skipclear = true;

		self.search();
		self.rclass('hidden');

		setTimeout(function() {
			if (self.opt && self.target && self.target.offsetParent)
				self.aclass(cls + '-visible');
			else
				self.hide(1);
		}, 100);

		skipreset = false;
	};

	self.hide = function(sleep) {
		if (!is || self.initializing)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.unbindevents();
			self.rclass(cls + '-visible').aclass('hidden');
			if (self.opt) {
				self.opt.close && self.opt.close();
				self.opt.class && self.rclass(self.opt.class);
				self.opt = null;
			}
			is = false;
		}, sleep ? sleep : 100);
	};
});

COMPONENT('radiobutton', function(self, config) {

	self.nocompile && self.nocompile();

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				break;
			case 'required':
				self.find('.ui-radiobutton-label').tclass('ui-radiobutton-label-required', value);
				break;
			case 'type':
				self.type = config.type;
				break;
			case 'label':
				self.find('.ui-radiobutton-label').html(value);
				break;
			case 'items':
				self.find('div[data-value]').remove();
				var builder = [];
				value.split(',').forEach(function(item) {
					item = item.split('|');
					builder.push('<div data-value="{0}"><i></i><span>{1}</span></div>'.format(item[0] || item[1], item[1] || item[0]));
				});
				self.append(builder.join(''));
				self.refresh();
				break;
		}
	};

	self.make = function() {
		var builder = [];
		var label = config.label || self.html();
		label && builder.push('<div class="ui-radiobutton-label{1}">{0}</div>'.format(label, config.required ? ' ui-radiobutton-label-required' : ''));
		self.aclass('ui-radiobutton{0}'.format(config.inline === false ? ' ui-radiobutton-block' : ''));
		self.event('click', 'div', function() {
			if (config.disabled)
				return;
			var value = self.parser($(this).attrd('value'));
			self.set(value);
			self.change(true);
		});
		self.html(builder.join(''));
		config.items && self.reconfigure('items:' + config.items);
		config.type && (self.type = config.type);
	};

	self.validate = function(value) {
		return config.disabled || !config.required ? true : !!value;
	};

	self.setter = function(value) {
		self.find('div').each(function() {
			var el = $(this);
			var is = el.attrd('value') === (value == null ? null : value.toString());
			el.tclass('ui-radiobutton-selected', is);
			el.find('.fa').tclass('fa-circle-o', !is).tclass('fa-circle', is);
		});
	};
});

COMPONENT('input', 'maxlength:200;dirkey:name;dirvalue:id;increment:1;autovalue:name;direxclude:false;forcevalidation:1;searchalign:1;after:\\:', function(self, config, cls) {

	var cls2 = '.' + cls;
	var input, placeholder, dirsource, binded, customvalidator, mask, rawvalue, isdirvisible = false, nobindcamouflage = false, focused = false;

	self.nocompile();
	self.bindvisible(20);

	self.init = function() {
		Thelpers.ui_input_icon = function(val) {
			return val.charAt(0) === '!' || val.indexOf(' ') !== -1 ? ('<span class="ui-input-icon-custom"><i class="' + (val.charAt(0) === '!' ? val.substring(1) : val) + '"></i></span>') : ('<i class="fa fa-' + val + '"></i>');
		};
		W.ui_input_template = Tangular.compile(('{{ if label }}<div class="{0}-label">{{ if icon }}<i class="{{ icon }}"></i>{{ fi }}{{ label | raw }}{{ after | raw }}</div>{{ fi }}<div class="{0}-control{{ if licon }} {0}-licon{{ fi }}{{ if ricon || (type === \'number\' && increment) }} {0}-ricon{{ fi }}">{{ if ricon || (type === \'number\' && increment) }}<div class="{0}-icon-right{{ if type === \'number\' && increment && !ricon }} {0}-increment{{ else if riconclick || type === \'date\' || type === \'time\' || (type === \'search\' && searchalign === 1) || type === \'password\' }} {0}-click{{ fi }}">{{ if type === \'number\' && !ricon }}<i class="fa fa-caret-up"></i><i class="fa fa-caret-down"></i>{{ else }}{{ ricon | ui_input_icon }}{{ fi }}</div>{{ fi }}{{ if licon }}<div class="{0}-icon-left{{ if liconclick || (type === \'search\' && searchalign !== 1) }} {0}-click{{ fi }}">{{ licon | ui_input_icon }}</div>{{ fi }}<div class="{0}-input{{ if align === 1 || align === \'center\' }} center{{ else if align === 2 || align === \'right\' }} right{{ fi }}">{{ if placeholder && !innerlabel }}<div class="{0}-placeholder">{{ placeholder }}</div>{{ fi }}{{ if dirsource || type === \'icon\' || type === \'emoji\' || type === \'color\' }}<div class="{0}-value" tabindex="0"></div>{{ else }}<input type="{{ if type === \'password\' }}password{{ else }}text{{ fi }}"{{ if autofill }} autocomplete="on" name="{{ PATH }}"{{ else }} name="input' + Date.now() + '" autocomplete="new-password"{{ fi }} data-jc-bind=""{{ if maxlength > 0}} maxlength="{{ maxlength }}"{{ fi }}{{ if autofocus }} autofocus{{ fi }} />{{ fi }}</div></div>{{ if error }}<div class="{0}-error hidden"><i class="fa fa-warning"></i> {{ error }}</div>{{ fi }}').format(cls));
	};

	self.make = function() {

		if (!config.label)
			config.label = self.html();

		if (isMOBILE && config.autofocus)
			config.autofocus = false;

		config.PATH = self.path.replace(/\./g, '_');

		self.aclass(cls + ' invisible');
		self.rclass('invisible', 100);
		self.redraw();

		self.event('input change', function() {
			if (nobindcamouflage)
				nobindcamouflage = false;
			else
				self.check();
		});

		self.event('focus', 'input,' + cls2 + '-value', function() {

			if (config.disabled)
				return $(this).blur();

			focused = true;
			self.camouflage(false);
			self.aclass(cls + '-focused');
			config.autocomplete && EXEC(self.makepath(config.autocomplete), self, input.parent());
			if (config.autosource) {
				var opt = {};
				opt.element = self.element;
				opt.search = GET(self.makepath(config.autosource));
				opt.callback = function(value) {
					var val = typeof(value) === 'string' ? value : value[config.autovalue];
					if (config.autoexec) {
						EXEC(self.makepath(config.autoexec), value, function(val) {
							self.set(val, 2);
							self.change();
							self.bindvalue();
						});
					} else {
						self.set(val, 2);
						self.change();
						self.bindvalue();
					}
				};
				SETTER('autocomplete', 'show', opt);
			} else if (config.mask) {
				setTimeout(function(input) {
					input.selectionStart = input.selectionEnd = 0;
				}, 50, this);
			} else if (config.dirsource && (config.autofocus != false && config.autofocus != 0)) {
				if (!isdirvisible)
					self.find(cls2 + '-control').trigger('click');
			}
		});

		self.event('paste', 'input', function(e) {
			if (config.mask) {
				var val = (e.originalEvent.clipboardData || window.clipboardData).getData('text');
				self.set(val.replace(/\s|\t/g, ''));
				e.preventDefault();
			}
		});

		self.event('keydown', 'input', function(e) {

			var t = this;
			var code = e.which;

			if (t.readOnly || config.disabled) {
				// TAB
				if (e.keyCode !== 9) {
					if (config.dirsource) {
						self.find(cls2 + '-control').trigger('click');
						return;
					}
					e.preventDefault();
					e.stopPropagation();
				}
				return;
			}

			if (!config.disabled && config.dirsource && (code === 13 || code > 30)) {
				self.find(cls2 + '-control').trigger('click');
				return;
			}

			if (config.mask) {

				if (e.metaKey) {
					if (code === 8 || code === 127) {
						e.preventDefault();
						e.stopPropagation();
					}
					return;
				}

				if (code === 32) {
					e.preventDefault();
					e.stopPropagation();
					return;
				}

				var beg = e.target.selectionStart;
				var end = e.target.selectionEnd;
				var val = t.value;
				var c;

				if (code === 8 || code === 127) {

					if (beg === end) {
						c = config.mask.substring(beg - 1, beg);
						t.value = val.substring(0, beg - 1) + c + val.substring(beg);
						self.curpos(beg - 1);
					} else {
						for (var i = beg; i <= end; i++) {
							c = config.mask.substring(i - 1, i);
							val = val.substring(0, i - 1) + c + val.substring(i);
						}
						t.value = val;
						self.curpos(beg);
					}

					e.preventDefault();
					return;
				}

				if (code > 40) {

					var cur = String.fromCharCode(code);

					if (mask && mask[beg]) {
						if (!mask[beg].test(cur)) {
							e.preventDefault();
							return;
						}
					}

					c = config.mask.charCodeAt(beg);
					if (c !== 95) {
						beg++;
						while (true) {
							c = config.mask.charCodeAt(beg);
							if (c === 95 || isNaN(c))
								break;
							else
								beg++;
						}
					}

					if (c === 95) {

						val = val.substring(0, beg) + cur + val.substring(beg + 1);
						t.value = val;
						beg++;

						while (beg < config.mask.length) {
							c = config.mask.charCodeAt(beg);
							if (c === 95)
								break;
							else
								beg++;
						}

						self.curpos(beg);
					} else
						self.curpos(beg + 1);

					e.preventDefault();
					e.stopPropagation();
				}
			}

		});

		self.event('blur', 'input', function() {
			focused = false;
			self.camouflage(true);
			self.rclass(cls + '-focused');
		});

		self.event('click', cls2 + '-control', function() {

			if (config.disabled || isdirvisible)
				return;

			if (config.type === 'icon') {
				opt = {};
				opt.element = self.element;
				opt.value = self.get();
				opt.empty = true;
				opt.callback = function(val) {
					self.change(true);
					self.set(val);
					self.check();
					rawvalue.focus();
				};
				SETTER('faicons', 'show', opt);
				return;
			} else if (config.type === 'color') {
				opt = {};
				opt.element = self.element;
				opt.value = self.get();
				opt.empty = true;
				opt.callback = function(al) {
					self.change(true);
					self.set(al);
					self.check();
					rawvalue.focus();
				};
				SETTER('colorpicker', 'show', opt);
				return;
			} else if (config.type === 'emoji') {
				opt = {};
				opt.element = self.element;
				opt.value = self.get();
				opt.empty = true;
				opt.callback = function(al) {
					self.change(true);
					self.set(al);
					self.check();
					rawvalue.focus();
				};
				SETTER('emoji', 'show', opt);
				return;
			}

			if (!config.dirsource)
				return;

			isdirvisible = true;
			setTimeout(function() {
				isdirvisible = false;
			}, 500);

			var opt = {};
			opt.element = self.find(cls2 + '-control');
			opt.items = dirsource || GET(self.makepath(config.dirsource));
			opt.offsetY = -1 + (config.diroffsety || 0);
			opt.offsetX = 0 + (config.diroffsetx || 0);
			opt.placeholder = config.dirplaceholder;
			opt.render = config.dirrender ? GET(self.makepath(config.dirrender)) : null;
			opt.custom = !!config.dircustom;
			opt.offsetWidth = 2;
			opt.minwidth = config.dirminwidth || 200;
			opt.maxwidth = config.dirmaxwidth;
			opt.key = config.dirkey || config.key;
			opt.empty = config.dirempty;

			if (config.dirraw)
				opt.raw = true;

			if (config.dirsearch != null)
				opt.search = config.dirsearch;

			var val = self.get();
			opt.selected = val;

			if (dirsource && config.direxclude == false) {
				for (var i = 0; i < dirsource.length; i++) {
					var item = dirsource[i];
					if (item)
						item.selected = typeof(item) === 'object' && item[config.dirvalue] === val;
				}
			} else if (config.direxclude) {
				opt.exclude = function(item) {
					return item ? item[config.dirvalue] === val : false;
				};
			}

			opt.callback = function(item, el, custom) {

				// empty
				if (item == null) {
					rawvalue.html('');
					self.set(null, 2);
					self.change();
					self.check();
					return;
				}

				var val = custom || typeof(item) === 'string' ? item : item[config.dirvalue || config.value];
				if (custom && typeof(config.dircustom) === 'string') {
					var fn = GET(config.dircustom);
					fn(val, function(val) {
						self.set(val, 2);
						self.change();
						self.bindvalue();
					});
				} else if (custom) {
					if (val) {
						self.set(val, 2);
						self.change();
						if (dirsource)
							self.bindvalue();
						else
							input.val(val);
					}
				} else {
					self.set(val, 2);
					self.change();
					if (dirsource)
						self.bindvalue();
					else
						input.val(val);
				}

				rawvalue.focus();
			};

			SETTER('directory', 'show', opt);
		});

		self.event('click', cls2 + '-placeholder,' + cls2 + '-label', function(e) {
			if (!config.disabled) {
				if (config.dirsource) {
					e.preventDefault();
					e.stopPropagation();
					self.find(cls2 + '-control').trigger('click');
				} else if (!config.camouflage || $(e.target).hclass(cls + '-placeholder')) {
					if (input.length)
						input.focus();
					else
						rawvalue.focus();
				}
			}
		});

		self.event('click', cls2 + '-icon-left,' + cls2 + '-icon-right', function(e) {

			if (config.disabled)
				return;

			var el = $(this);
			var left = el.hclass(cls + '-icon-left');
			var opt;

			if (config.dirsource && left && config.liconclick) {
				e.preventDefault();
				e.stopPropagation();
			}

			if (!left && !config.riconclick) {
				if (config.type === 'date') {
					opt = {};
					opt.element = self.element;
					opt.value = self.get();
					opt.callback = function(val) {
						self.change(true);
						self.set(val);
						input.focus();
					};
					SETTER('datepicker', 'show', opt);
				} else if (config.type === 'time') {
					opt = {};
					opt.element = self.element;
					opt.value = self.get();
					opt.callback = function(val) {
						self.change(true);
						self.set(val);
						input.focus();
					};
					SETTER('timepicker', 'show', opt);
				} else if (config.type === 'search')
					self.set('');
				else if (config.type === 'password')
					self.password();
				else if (config.type === 'number') {
					var tmp = $(e.target);
					if (tmp.attr('class').indexOf('fa-') !== -1) {
						var n = tmp.hclass('fa-caret-up') ? 1 : -1;
						self.change(true);
						var val = self.preparevalue((self.get() || 0) + (config.increment * n));
						self.set(val, 2);
					}
				}
				return;
			}

			if (left && config.liconclick)
				EXEC(self.makepath(config.liconclick), self, el);
			else if (config.riconclick)
				EXEC(self.makepath(config.riconclick), self, el);
			else if (left && config.type === 'search')
				self.set('');

		});
	};

	self.camouflage = function(is) {
		if (config.camouflage) {
			if (is) {
				var t = input[0];
				var arr = t.value.split('');
				for (var i = 0; i < arr.length; i++)
					arr[i] = typeof(config.camouflage) === 'string' ? config.camouflage : '*';
				nobindcamouflage = true;
				t.value = arr.join('');
			} else {
				nobindcamouflage = true;
				var val = self.get();
				input[0].value = val == null ? '' : val;
			}
			self.tclass(cls + '-camouflaged', is);
		}
	};

	self.curpos = function(pos) {
		var el = input[0];
		if (el.createTextRange) {
			var range = el.createTextRange();
			range.move('character', pos);
			range.select();
		} else if (el.selectionStart) {
			el.focus();
			el.setSelectionRange(pos, pos);
		}
	};

	self.validate = function(value) {

		if ((!config.required || config.disabled) && !self.forcedvalidation())
			return true;

		if (config.dirsource)
			return !!value;

		if (customvalidator)
			return customvalidator(value);

		if (self.type === 'date')
			return value instanceof Date && !isNaN(value.getTime());

		if (value == null)
			value = '';
		else
			value = value.toString();

		if (config.mask && typeof(value) === 'string' && value.indexOf('_') !== -1)
			return false;

		if (config.minlength && value.length < config.minlength)
			return false;

		switch (self.type) {
			case 'email':
				return value.isEmail();
			case 'phone':
				return value.isPhone();
			case 'url':
				return value.isURL();
			case 'zip':
				return (/^\d{5}(?:[-\s]\d{4})?$/).test(value);
			case 'currency':
			case 'number':
				value = value.parseFloat();
				if ((config.minvalue != null && value < config.minvalue) || (config.maxvalue != null && value > config.maxvalue))
					return false;
				return config.minvalue == null ? value > 0 : true;
		}

		return value.length > 0;
	};

	self.offset = function() {
		var offset = self.element.offset();
		var control = self.find(cls2 + '-control');
		var width = control.width() + 2;
		return { left: offset.left, top: control.offset().top + control.height(), width: width };
	};

	self.password = function(show) {
		var visible = show == null ? input.attr('type') === 'text' : show;
		input.attr('type', visible ? 'password' : 'text');
		self.find(cls2 + '-icon-right').find('i').tclass(config.ricon, visible).tclass('fa-eye-slash', !visible);
	};

	self.preparevalue = function(value) {

		if (self.type === 'number' && (config.minvalue != null || config.maxvalue != null)) {
			var tmp = typeof(value) === 'string' ? +value.replace(',', '.') : value;
			if (config.minvalue > tmp)
				value = config.minvalue;
			if (config.maxvalue < tmp)
				value = config.maxvalue;
		}

		return value;
	};

	self.getterin = self.getter;
	self.getter = function(value, realtime, nobind) {

		if (nobindcamouflage)
			return;

		if (config.mask && config.masktidy) {
			var val = [];
			for (var i = 0; i < value.length; i++) {
				if (config.mask.charAt(i) === '_')
					val.push(value.charAt(i));
			}
			value = val.join('');
		}

		self.getterin(self.preparevalue(value), realtime, nobind);
	};

	self.setterin = self.setter;

	self.setter = function(value, path, type) {

		if (config.mask) {
			if (value) {
				if (config.masktidy) {
					var index = 0;
					var val = [];
					for (var i = 0; i < config.mask.length; i++) {
						var c = config.mask.charAt(i);
						val.push(c === '_' ? (value.charAt(index++) || '_') : c);
					}
					value = val.join('');
				}

				// check values
				if (mask) {
					var arr = [];
					for (var i = 0; i < mask.length; i++) {
						var c = value.charAt(i);
						if (mask[i] && mask[i].test(c))
							arr.push(c);
						else
							arr.push(config.mask.charAt(i));
					}
					value = arr.join('');
				}
			} else
				value = config.mask;
		}

		self.setterin(value, path, type);
		self.bindvalue();

		config.camouflage && !focused && setTimeout(self.camouflage, type === 1 ? 1000 : 1, true);

		if (config.type === 'password')
			self.password(true);
	};

	self.check = function() {

		var is = input.length ? !!input[0].value : !!self.get();

		if (binded === is)
			return;

		binded = is;
		placeholder && placeholder.tclass('hidden', is);
		self.tclass(cls + '-binded', is);

		if (config.type === 'search')
			self.find(cls2 + '-icon-' + (config.searchalign === 1 ? 'right' : 'left')).find('i').tclass(config.searchalign === 1 ? config.ricon : config.licon, !is).tclass('fa-times', is);
	};

	self.bindvalue = function() {

		var value = self.get();

		if (dirsource) {

			var item;

			for (var i = 0; i < dirsource.length; i++) {
				item = dirsource[i];
				if (typeof(item) === 'string') {
					if (item === value)
						break;
					item = null;
				} else if (item[config.dirvalue || config.value] === value) {
					item = item[config.dirkey || config.key];
					break;
				} else
					item = null;
			}

			if (value && item == null && config.dircustom)
				item = value;

			if (config.dirraw)
				rawvalue.html(item || '');
			else
				rawvalue.text(item || '');

		} else if (config.dirsource)
			if (config.dirraw)
				rawvalue.html(value || '');
			else
				rawvalue.text(value || '');
		else {
			switch (config.type) {
				case 'color':
					rawvalue.css('background-color', value || '');
					break;
				case 'icon':
					rawvalue.html('<i class="{0}"></i>'.format(value || ''));
					break;
				case 'emoji':
					rawvalue.html(value);
					break;
			}
		}

		self.check();
	};

	self.redraw = function() {

		if (!config.ricon) {
			if (config.dirsource)
				config.ricon = 'angle-down';
			else if (config.type === 'date') {
				config.ricon = 'calendar';
				if (!config.align && !config.innerlabel)
					config.align = 1;
			} else if (config.type === 'icon' || config.type === 'color' || config.type === 'emoji') {
				config.ricon = 'angle-down';
				if (!config.align && !config.innerlabel)
					config.align = 1;
			} else if (config.type === 'time') {
				config.ricon = 'clock-o';
				if (!config.align && !config.innerlabel)
					config.align = 1;
			} else if (config.type === 'search')
				if (config.searchalign === 1)
					config.ricon = 'search';
				else
					config.licon = 'search';
			else if (config.type === 'password')
				config.ricon = 'eye';
			else if (config.type === 'number') {
				if (!config.align && !config.innerlabel)
					config.align = 1;
			}
		}

		self.tclass(cls + '-masked', !!config.mask);
		self.rclass2(cls + '-type-');

		if (config.type)
			self.aclass(cls + '-type-' + config.type);

		self.html(W.ui_input_template(config));
		input = self.find('input');
		rawvalue = self.find(cls2 + '-value');
		placeholder = self.find(cls2 + '-placeholder');
	};

	self.configure = function(key, value) {
		switch (key) {
			case 'icon':
				if (value && value.indexOf(' ') === -1)
					config.icon = 'fa fa-' + value;
				break;
			case 'dirsource':
				if (config.dirajax || value.indexOf('/') !== -1) {
					dirsource = null;
					self.bindvalue();
				} else {
					if (value.indexOf(',') !== -1) {
						dirsource = self.parsesource(value);
						self.bindvalue();
					} else {
						self.datasource(value, function(path, value) {
							dirsource = value;
							self.bindvalue();
						});
					}
				}
				self.tclass(cls + '-dropdown', !!value);
				input.prop('readonly', !!config.disabled || !!config.dirsource);
				break;
			case 'disabled':
				self.tclass('ui-disabled', !!value);
				input.prop('readonly', !!value || !!config.dirsource);
				self.reset();
				break;
			case 'required':
				self.tclass(cls + '-required', !!value);
				self.reset();
				break;
			case 'type':
				self.type = value;
				break;
			case 'validate':
				customvalidator = value ? (/\(|=|>|<|\+|-|\)/).test(value) ? FN('value=>' + value) : (function(path) { path = self.makepath(path); return function(value) { return GET(path)(value); }; })(value) : null;
				break;
			case 'innerlabel':
				self.tclass(cls + '-inner', !!value);
				break;
			case 'monospace':
				self.tclass(cls + '-monospace', !!value);
				break;
			case 'maskregexp':
				if (value) {
					mask = value.toLowerCase().split(',');
					for (var i = 0; i < mask.length; i++) {
						var m = mask[i];
						if (!m || m === 'null')
							mask[i] = '';
						else
							mask[i] = new RegExp(m);
					}
				} else
					mask = null;
				break;
			case 'mask':
				config.mask = value.replace(/#/g, '_');
				break;
		}
	};

	self.formatter(function(path, value) {
		if (value) {
			switch (config.type) {
				case 'lower':
					return (value + '').toLowerCase();
				case 'upper':
					return (value + '').toUpperCase();
				case 'phone':
					return (value + '').replace(/\s/g, '');
				case 'email':
					return (value + '').toLowerCase();
				case 'date':
					return value.format(config.format || 'yyyy-MM-dd');
				case 'time':
					return value.format(config.format || 'HH:mm');
				case 'number':
					return config.format ? value.format(config.format) : value;
			}
		}

		return value;
	});

	self.parser(function(path, value) {
		if (value) {
			var tmp;
			switch (config.type) {
				case 'date':
					tmp = self.get();
					if (tmp)
						tmp = tmp.format('HH:mm');
					else
						tmp = '';
					return value + (tmp ? (' ' + tmp) : '');
				case 'lower':
				case 'email':
					value = value.toLowerCase();
					break;
				case 'upper':
					value = value.toUpperCase();
					break;
				case 'phone':
					value = value.replace(/\s/g, '');
					break;
				case 'time':
					tmp = value.split(':');
					var dt = self.get();
					if (dt == null)
						dt = new Date();
					dt.setHours(+(tmp[0] || '0'));
					dt.setMinutes(+(tmp[1] || '0'));
					dt.setSeconds(+(tmp[2] || '0'));
					value = dt;
					break;
			}
		}
		return value ? config.spaces === false ? value.replace(/\s/g, '') : value : value;
	});

	self.state = function(type) {
		if (type) {
			var invalid = config.required ? self.isInvalid() : self.forcedvalidation() ? self.isInvalid() : false;
			if (invalid !== self.$oldstate) {
				self.$oldstate = invalid;
				self.tclass(cls + '-invalid', invalid);
				self.tclass(cls + '-ok', !invalid);
				config.error && self.find(cls2 + '-error').tclass('hidden', !invalid);
			}
		}
	};

	self.forcedvalidation = function() {

		if (!config.forcevalidation)
			return false;

		if (self.type === 'number')
			return false;

		var val = self.get();
		return (self.type === 'phone' || self.type === 'email') && (val != null && (typeof(val) === 'string' && val.length !== 0));
	};

});

COMPONENT('datepicker', 'today:Set today;firstday:0', function(self, config, cls) {

	var cls2 = '.' + cls;
	var skip = false;
	var visible = false;
	var current;
	var elyears, elmonths, elbody;

	self.days = EMPTYARRAY;
	self.days_short = EMPTYARRAY;
	self.months = EMPTYARRAY;
	self.months_short = EMPTYARRAY;
	self.years_from;
	self.years_to;

	self.singleton();
	self.readonly();
	self.nocompile();

	self.configure = function(key, value) {
		switch (key) {
			case 'days':

				if (value instanceof Array)
					self.days = value;
				else
					self.days = value.split(',').trim();

				self.days_short = [];

				for (var i = 0; i < DAYS.length; i++) {
					DAYS[i] = self.days[i];
					self.days_short[i] = DAYS[i].substring(0, 2).toUpperCase();
				}

				break;

			case 'months':
				if (value instanceof Array)
					self.months = value;
				else
					self.months = value.split(',').trim();

				self.months_short = [];

				for (var i = 0, length = self.months.length; i < length; i++) {
					var m = self.months[i];
					MONTHS[i] = m;
					if (m.length > 4)
						m = m.substring(0, 3) + '.';
					self.months_short.push(m);
				}
				break;

			case 'yearfrom':
				if (value.indexOf('current') !== -1)
					self.years_from = +(NOW.format('yyyy'));
				else
					self.years_from = +(NOW.add(value).format('yyyy'));
				break;

			case 'yearto':
				if (value.indexOf('current') !== -1)
					self.years_to = +(NOW.format('yyyy'));
				else
					self.years_to = +(NOW.add(value).format('yyyy'));
				break;
		}
	};

	function getMonthDays(dt) {

		var m = dt.getMonth();
		var y = dt.getFullYear();

		if (m === -1) {
			m = 11;
			y--;
		}

		return (32 - new Date(y, m, 32).getDate());
	}

	self.calculate = function(year, month, selected) {

		var d = new Date(year, month, 1, 12, 0);
		var output = { header: [], days: [], month: month, year: year };
		var firstday = config.firstday;
		var firstcount = 0;
		var frm = d.getDay() - firstday;
		var today = NOW;
		var ty = today.getFullYear();
		var tm = today.getMonth();
		var td = today.getDate();
		var sy = selected ? selected.getFullYear() : -1;
		var sm = selected ? selected.getMonth() : -1;
		var sd = selected ? selected.getDate() : -1;
		var days = getMonthDays(d);

		if (frm < 0)
			frm = 7 + frm;

		while (firstcount++ < 7) {
			output.header.push({ index: firstday, name: self.days_short[firstday] });
			firstday++;
			if (firstday > 6)
				firstday = 0;
		}

		var index = 0;
		var indexEmpty = 0;
		var count = 0;
		var prev = getMonthDays(new Date(year, month - 1, 1, 12, 0)) - frm;
		var cur;

		for (var i = 0; i < days + frm; i++) {

			var obj = { today: false, selected: false, empty: false, future: false, number: 0, index: ++count };

			if (i >= frm) {
				obj.number = ++index;
				obj.selected = sy === year && sm === month && sd === index;
				obj.today = ty === year && tm === month && td === index;
				obj.future = ty < year;
				if (!obj.future && year === ty) {
					if (tm < month)
						obj.future = true;
					else if (tm === month)
						obj.future = td < index;
				}

			} else {
				indexEmpty++;
				obj.number = prev + indexEmpty;
				obj.empty = true;
				cur = d.add('-' + indexEmpty + ' days');
			}

			if (!obj.empty)
				cur = d.add(i + ' days');

			obj.month = i >= frm && obj.number <= days ? d.getMonth() : cur.getMonth();
			obj.year = i >= frm && obj.number <= days ? d.getFullYear() : cur.getFullYear();
			obj.date = cur;
			output.days.push(obj);
		}

		indexEmpty = 0;

		for (var i = count; i < 42; i++) {
			var cur = d.add(i + ' days');
			var obj = { today: false, selected: false, empty: true, future: true, number: ++indexEmpty, index: ++count };
			obj.month = cur.getMonth();
			obj.year = cur.getFullYear();
			obj.date = cur;
			output.days.push(obj);
		}

		return output;
	};

	self.hide = function() {
		if (visible) {
			self.unbindevents();
			self.opt.close && self.opt.close();
			self.opt = null;
			self.older = null;
			self.target = null;
			self.aclass('hidden');
			self.rclass(cls + '-visible');
			visible = false;
		}
		return self;
	};

	self.show = function(opt) {

		setTimeout(function() {
			clearTimeout2('datepickerhide');
		}, 5);

		var el = $(opt.element);
		var dom = el[0];

		if (self.target === dom) {
			self.hide();
			return;
		}

		if (self.opt && self.opt.close)
			self.opt.close();

		var off = el.offset();
		var w = el.innerWidth();
		var h = el.innerHeight();
		var l = 0;
		var t = 0;
		var height = 305 + (opt.cancel ? 25 : 0);
		var s = 250;

		if (opt.element) {
			switch (opt.align) {
				case 'center':
					l = Math.ceil((off.left - s / 2) + (w / 2));
					break;
				case 'right':
					l = (off.left + w) - s;
					break;
				default:
					l = off.left;
					break;
			}

			t = opt.position === 'bottom' ? (off.top - height) : (off.top + h + 12);
		}

		if (opt.offsetX)
			l += opt.offsetX;

		if (opt.offsetY)
			t += opt.offsetY;

		if (l + s > WW)
			l = (l + w) - s;

		if (t + height > WH)
			t = (t + h) - height;

		var dt = typeof(opt.value) === 'string' ? GET(opt.value) : opt.value;
		if ((!(dt instanceof Date)) || isNaN(dt.getTime()))
			dt = NOW;

		opt.scope = M.scope ? M.scope() : '';
		self.opt = opt;
		self.time = dt.format('HH:mm:ss');
		self.css({ left: l, top: t });
		self.rclass('hidden');
		self.date(dt);
		self.aclass(cls + '-visible', 50);
		self.bindevents();
		self.target = dom;
		visible = true;
	};

	self.setdate = function(dt) {

		var time = self.time.split(':');

		if (time.length > 1) {
			dt.setHours(+(time[0] || '0'));
			dt.setMinutes(+(time[1] || '0'));
			dt.setSeconds(+(time[2] || '0'));
		}

		self.opt.scope && M.scope(self.opt.scope);

		if (typeof(self.opt.value) === 'string')
			SET2(self.opt.value, dt);
		else
			self.opt.callback(dt);
	};

	self.make = function() {

		self.aclass(cls + ' hidden');

		var conf = {};
		var reconfigure = false;

		if (!config.days) {
			conf.days = [];
			for (var i = 0; i < DAYS.length; i++)
				conf.days.push(DAYS[i]);
			reconfigure = true;
		}

		if (!config.months) {
			conf.months = MONTHS;
			reconfigure = true;
		}

		reconfigure && self.reconfigure(conf);
		W.$datepicker = self;

		self.event('click', function(e) {
			e.stopPropagation();
		});

		var hide = function() {
			visible && W.$datepicker && W.$datepicker.hide();
		};

		var hide2 = function() {
			visible && setTimeout2('datepickerhide', function() {
				W.$datepicker && W.$datepicker.hide();
			}, 20);
		};

		self.bindevents = function() {
			if (!visible)
				$(W).on('scroll click', hide2);
		};

		self.unbindevents = function() {
			if (visible)
				$(W).off('scroll click', hide2);
		};

		self.on('reflow + scroll + resize + resize2', hide);
	};

	self.makehtml = function() {
		var builder = [];
		builder.push('<div class="{0}-header"><span class="{0}-next"><i class="fa fa-angle-right"></i></span><span class="{0}-prev"><i class="fa fa-angle-left"></i></span><div class="{0}-info"><span class="{0}-month">---</span><span class="{0}-year">---</span></div></div><div class="{0}-years hidden"></div><div class="{0}-months"></div><div class="{0}-body hidden"><div class="{0}-week">'.format(cls));
		for (var i = 0; i < 7; i++)
			builder.push('<div></div>');
		builder.push('</div><div class="{0}-days">'.format(cls));

		for (var i = 0; i < 42; i++)
			builder.push('<div class="{0}-date"><div></div></div>'.format(cls, i));
		builder.push('</div></div><div class="{0}-footer"><span class="{0}-now">{2}</span></div>'.format(cls, config.close, config.today));
		self.html(builder.join(''));

		builder = [];
		elbody = self.find(cls2 + '-body');
		elmonths = self.find(cls2 + '-months');
		for (var i = 0; i < 12; i++)
			builder.push('<div class="{0}-month" data-index="{1}"><div></div></div>'.format(cls, i));
		elmonths.html(builder.join(''));

		builder = [];
		elyears = self.find(cls2 + '-years');
		for (var i = 0; i < 25; i++)
			builder.push('<div class="{0}-year"><div></div></div>'.format(cls));
		elyears.html(builder.join(''));

		self.makehtml = null;

		self.find(cls2 + '-month').on('click', function(e) {

			var el = $(this);
			var index = el.attrd('index');
			var h = 'hidden';

			if (index) {
				current.setMonth(+index);
				self.date(current, true);
			} else if (!elmonths.hclass(h))
				index = 1;

			elyears.aclass(h);

			if (index)
				elmonths.aclass(h);
			else {
				elmonths.find(cls2 + '-today').rclass(cls + '-today');
				elmonths.find(cls2 + '-month').eq(current.getMonth()).aclass(cls + '-today');
				elmonths.rclass(h);
			}

			elbody.tclass(h, !elmonths.hclass(h));
			e.preventDefault();
			e.stopPropagation();

		});

		self.find(cls2 + '-year').on('click', function(e) {
			var el = $(this);
			var year = el.attrd('year');
			var h = 'hidden';

			if (year) {
				current.setFullYear(+year);
				self.date(current, true);
			} else if (!elyears.hclass(h))
				year = 1;

			elmonths.aclass(h);

			if (year)
				elyears.aclass(h);
			else {
				self.years();
				elyears.rclass(h);
			}

			elbody.tclass(h, !elyears.hclass(h));
			e.preventDefault();
			e.stopPropagation();
		});

		self.years = function() {
			dom = self.find(cls2 + '-years').find(cls2 + '-year');
			var year = current.getFullYear();
			var index = 12;
			for (var i = 0; i < 25; i++) {
				var val = year - (index--);
				$(dom[i]).tclass(cls + '-today', val === year).attrd('year', val).find('div')[0].innerHTML = val;
			}
		};

		self.find(cls2 + '-date').on('click', function() {
			var dt = $(this).attrd('date').split('-');
			self.setdate(new Date(+dt[0], +dt[1], +dt[2], 12, 0, 0));
			self.hide();
		});

		self.find(cls2 + '-now').on('click', function() {
			self.setdate(new Date());
			self.hide();
		});

		self.find(cls2 + '-next').on('click', function(e) {

			if (elyears.hclass('hidden')) {
				current.setMonth(current.getMonth() + 1);
				self.date(current, true);
			} else {
				current.setFullYear(current.getFullYear() + 25);
				self.years();
			}

			e.preventDefault();
			e.stopPropagation();
		});

		self.find(cls2 + '-prev').on('click', function(e) {

			if (elyears.hclass('hidden')) {
				current.setMonth(current.getMonth() - 1);
				self.date(current, true);
			} else {
				current.setFullYear(current.getFullYear() - 25);
				self.years();
			}

			e.preventDefault();
			e.stopPropagation();
		});
	};

	self.date = function(value, skipday) {

		var clssel = cls + '-selected';

		self.makehtml && self.makehtml();

		if (typeof(value) === 'string')
			value = value.parseDate();

		var year = value == null ? null : value.getFullYear();
		if (year && (year < self.years_from || year > self.years_to))
			return;

		if (!value || isNaN(value.getTime())) {
			self.find('.' + clssel).rclass(clssel);
			value = NOW;
		}

		var empty = !value;

		if (skipday) {
			skipday = false;
			empty = true;
		}

		if (skip) {
			skip = false;
			return;
		}

		value = new Date((value || NOW).getTime());

		var output = self.calculate(value.getFullYear(), value.getMonth(), value);
		var dom = self.find(cls2 + '-date');

		self.find(cls2 + '-body').rclass('hidden');
		self.find(cls2 + '-months,' + cls2 + '-years').aclass('hidden');

		current = value;

		for (var i = 0; i < 42; i++) {

			var item = output.days[i];
			var classes = [cls + '-date'];

			if (item.empty)
				classes.push(cls + '-disabled');

			if (!empty && item.selected)
				classes.push(cls + '-selected');

			if (item.today)
				classes.push(cls + '-day-today');

			var el = $(dom[i]);
			el.attrd('date', item.year + '-' + item.month + '-' + item.number);
			el.find('div').html(item.number);
			el.find('i').remove();
			el.rclass().aclass(classes.join(' '));
		}

		if (!skipday) {

			dom = self.find(cls2 + '-week').find('div');
			for (var i = 0; i < 7; i++)
				dom[i].innerHTML = output.header[i].name;

			dom = self.find(cls2 + '-months').find(cls2 + '-month');
			for (var i = 0; i < 12; i++)
				$(dom[i]).find('div').attrd('index', i)[0].innerHTML = self.months_short[i];
		}

		self.opt.badges && self.opt.badges(current, function(date) {

			if (!(date instanceof Array))
				date = [date];

			for (var i = 0; i < date.length; i++) {
				var dt = date[i].getFullYear() + '-' + date[i].getMonth() + '-' + date[i].getDate();
				var el = self.find(cls2 + '-date[data-date="{0}"]'.format(dt));
				if (el.length && !el.find('i').length)
					el.append('<i class="fa fa-circle"></i>');
			}

		});

		var info = self.find(cls2 + '-info');
		info.find(cls2 + '-month').html(self.months[current.getMonth()]);
		info.find(cls2 + '-year').html(current.getFullYear());

	};
});

COMPONENT('menu', function(self, config, cls) {

	self.singleton();
	self.readonly();
	self.nocompile && self.nocompile();

	var cls2 = '.' + cls;

	var is = false;
	var issubmenu = false;
	var isopen = false;
	var events = {};
	var ul, children, prevsub, parentclass;

	self.make = function() {
		self.aclass(cls + ' hidden ' + cls + '-style-' + (config.style || 1));
		self.append('<div class="{0}-items"><ul></ul></div><div class="{0}-submenu hidden"><ul></ul></div>'.format(cls));
		ul = self.find(cls2 + '-items').find('ul');
		children = self.find(cls2 + '-submenu');

		self.event('click', 'li', function(e) {

			clearTimeout2(self.ID);

			var el = $(this);
			if (!el.hclass(cls + '-divider') && !el.hclass(cls + '-disabled')) {
				self.opt.scope && M.scope(self.opt.scope);
				var index = el.attrd('index').split('-');
				if (index.length > 1) {
					// submenu
					self.opt.callback(self.opt.items[+index[0]].children[+index[1]]);
					self.hide();
				} else if (!issubmenu) {
					self.opt.callback(self.opt.items[+index[0]]);
					self.hide();
				}
			}

			e.preventDefault();
			e.stopPropagation();
		});

		events.hide = function() {
			is && self.hide();
		};

		self.event('scroll', events.hide);
		self.on('reflow + scroll + resize + resize2', events.hide);

		events.click = function(e) {
			if (is && !isopen && (!self.target || (self.target !== e.target && !self.target.contains(e.target))))
				setTimeout2(self.ID, self.hide, isMOBILE ? 700 : 300);
		};

		events.hidechildren = function() {
			if ($(this.parentNode.parentNode).hclass(cls + '-items')) {
				if (prevsub && prevsub[0] !== this) {
					prevsub.rclass(cls + '-selected');
					prevsub = null;
					children.aclass('hidden');
					issubmenu = false;
				}
			}
		};

		events.children = function() {

			if (prevsub && prevsub[0] !== this) {
				prevsub.rclass(cls + '-selected');
				prevsub = null;
			}

			issubmenu = true;
			isopen = true;

			setTimeout(function() {
				isopen = false;
			}, 500);

			var el = prevsub = $(this);
			var index = +el.attrd('index');
			var item = self.opt.items[index];

			el.aclass(cls + '-selected');

			var html = self.makehtml(item.children, index);
			children.find('ul').html(html);
			children.rclass('hidden');

			var css = {};
			var offset = el.position();

			css.left = ul.width() - 5;
			css.top = offset.top - 5;

			var offsetX = offset.left;

			offset = self.element.offset();

			var w = children.width();
			var left = offset.left + css.left + w;
			if (left > WW + 30)
				css.left = (offsetX - w) + 5;

			children.css(css);
		};
	};

	self.bindevents = function() {
		events.is = true;
		$(document).on('touchstart mouseenter mousedown', cls2 + '-children', events.children).on('touchstart mousedown', events.click);
		$(W).on('scroll', events.hide);
		self.element.on('mouseenter', 'li', events.hidechildren);
	};

	self.unbindevents = function() {
		events.is = false;
		$(document).off('touchstart mouseenter mousedown', cls2 + '-children', events.children).off('touchstart mousedown', events.click);
		$(W).off('scroll', events.hide);
		self.element.off('mouseenter', 'li', events.hidechildren);
	};

	self.showxy = function(x, y, items, callback) {
		var opt = {};
		opt.x = x;
		opt.y = y;
		opt.items = items;
		opt.callback = callback;
		self.show(opt);
	};

	self.makehtml = function(items, index) {
		var builder = [];
		var tmp;

		for (var i = 0; i < items.length; i++) {
			var item = items[i];

			if (typeof(item) === 'string') {
				// caption or divider
				if (item === '-')
					tmp = '<hr />';
				else
					tmp = '<span>{0}</span>'.format(item);
				builder.push('<li class="{0}-divider">{1}</li>'.format(cls, tmp));
				continue;
			}

			var cn = item.classname || '';
			var icon = '';

			if (item.icon)
				icon = '<i class="{0}"></i>'.format(item.icon.charAt(0) === '!' ? item.icon.substring(1) : item.icon.indexOf('fa-') === -1 ? ('fa fa-' + item.icon) : item.icon);
			else
				cn = (cn ? (cn + ' ') : '') + cls + '-nofa';

			tmp = '';

			if (index == null && item.children && item.children.length) {
				cn += (cn ? ' ' : '') + cls + '-children';
				tmp += '<i class="fa fa-play pull-right"></i>';
			}

			if (item.selected)
				cn += (cn ? ' ' : '') + cls + '-selected';

			if (item.disabled)
				cn += (cn ? ' ' : '') + cls + '-disabled';

			tmp += '<div class="{0}-name">{1}{2}{3}</div>'.format(cls, icon, item.name, item.shortcut ? '<b>{0}</b>'.format(item.shortcut) : '');

			if (item.note)
				tmp += '<div class="ui-menu-note">{0}</div>'.format(item.note);

			builder.push('<li class="{0}" data-index="{2}">{1}</li>'.format(cn, tmp, (index != null ? (index + '-') : '') + i));
		}

		return builder.join('');
	};

	self.show = function(opt) {

		if (typeof(opt) === 'string') {
			// old version
			opt = { align: opt };
			opt.element = arguments[1];
			opt.items = arguments[2];
			opt.callback = arguments[3];
			opt.offsetX = arguments[4];
			opt.offsetY = arguments[5];
		}

		var tmp = opt.element ? opt.element instanceof jQuery ? opt.element[0] : opt.element.element ? opt.element.dom : opt.element : null;

		if (is && tmp && self.target === tmp) {
			self.hide();
			return;
		}

		var tmp;

		self.target = tmp;
		self.opt = opt;
		opt.scope = M.scope();

		if (parentclass && opt.classname !== parentclass) {
			self.rclass(parentclass);
			parentclass = null;
		}

		if (opt.large)
			self.aclass('ui-large');
		else
			self.rclass('ui-large');

		isopen = false;
		issubmenu = false;
		prevsub = null;

		var css = {};
		children.aclass('hidden');
		children.find('ul').empty();
		clearTimeout2(self.ID);

		ul.html(self.makehtml(opt.items));

		if (!parentclass && opt.classname) {
			self.aclass(opt.classname);
			parentclass = opt.classname;
		}

		if (is) {
			css.left = 0;
			css.top = 0;
			self.element.css(css);
		} else {
			self.rclass('hidden');
			self.aclass(cls + '-visible', 100);
			is = true;
			if (!events.is)
				self.bindevents();
		}

		var target = $(opt.element);
		var w = self.width();
		var offset = target.offset();

		if (opt.element) {
			switch (opt.align) {
				case 'center':
					css.left = Math.ceil((offset.left - w / 2) + (target.innerWidth() / 2));
					break;
				case 'right':
					css.left = (offset.left - w) + target.innerWidth();
					break;
				default:
					css.left = offset.left;
					break;
			}

			css.top = opt.position === 'bottom' ? (offset.top - self.element.height() - 10) : (offset.top + target.innerHeight() + 10);

		} else {
			css.left = opt.x;
			css.top = opt.y;
		}

		if (opt.offsetX)
			css.left += opt.offsetX;

		if (opt.offsetY)
			css.top += opt.offsetY;

		var mw = w;
		var mh = self.height();

		if (css.left < 0)
			css.left = 10;
		else if ((mw + css.left) > WW)
			css.left = (WW - mw) - 10;

		if (css.top < 0)
			css.top = 10;
		else if ((mh + css.top) > WH)
			css.top = (WH - mh) - 10;

		self.element.css(css);
	};

	self.hide = function() {
		events.is && self.unbindevents();
		is = false;
		self.opt && self.opt.hide && self.opt.hide();
		self.target = null;
		self.opt = null;
		self.aclass('hidden');
		self.rclass(cls + '-visible');
	};

});

COMPONENT('intro', function(self, config) {

	var cls = 'ui-intro';
	var cls2 = '.' + cls;
	var container = 'intro' + GUID(4);
	var content, figures, buttons, button = null;
	var index = 0;
	var visible = false;

	self.readonly();

	self.make = function() {
		$(document.body).append('<div id="{0}" class="hidden {1}"><div class="{1}-body"></div></div>'.format(container, cls));
		content = self.element;
		container = $('#' + container);
		content.rclass('hidden');
		var body = container.find(cls2 + '-body');
		body[0].appendChild(self.element[0]);
		self.replace(container);
		content.aclass('ui-intro-figures');
		figures = content.find('figure');
		var items = [];

		figures.each(function(index) {
			items.push('<i class="fa fa-circle {0}-button" data-index="{1}"></i>'.format(cls, index));
		});

		body.append('<div class="{0}-pagination"><button name="next"></button>{1}</div>'.format(cls, items.join('')));
		buttons = self.find(cls2 + '-button');
		button = self.find(cls2 + '-pagination').find('button');

		self.event('click', 'button[name="next"]', function() {
			index++;
			if (index >= figures.length) {
				self.set('');
				config.exec && EXEC(config.exec);
				config.remove && self.remove();
			} else {
				self.move(index);
				config.page && EXEC(config.page, index);
			}
		});

		self.event('click', 'button[name="close"]', function() {
			self.set('');
			config.exec && EXEC(config.exec, true);
			config.remove && self.remove();
		});

		self.event('click', cls2 + '-button', function() {
			self.move(+this.getAttribute('data-index'));
		});
	};

	self.move = function(indexer) {
		figures.filter('.visible').rclass('visible');
		buttons.filter('.selected').rclass('selected');
		figures.eq(indexer).aclass('visible');
		buttons.eq(indexer).aclass('selected');
		button.html(indexer < buttons.length - 1 ? ((config.next || 'Next') + '<i class="fa fa-chevron-right"></i>') : (config.close || 'Done'));
		index = indexer;
		return self;
	};

	self.setter = function(value) {
		var is = value == config.if;
		if (is === visible)
			return;
		index = 0;
		self.move(0);
		visible = is;
		self.tclass('hidden', !is);
		setTimeout(function() {
			self.find(cls2 + '-body').tclass(cls + '-body-visible', is);
		}, 100);
	};
});

COMPONENT('tooltip', function(self) {

	var cls = 'ui-tooltip';
	var is = false;

	self.singleton();
	self.readonly();
	self.blind();
	self.nocompile && self.nocompile();

	self.make = function() {
		self.aclass(cls + ' hidden');
	};

	self.hide = function(force) {
		is && setTimeout2(self.ID, function() {
			self.aclass('hidden');
			self.rclass(cls + '-visible');
			is = false;
		}, force ? 1 : 200);
	};

	self.show = function(opt) {

		var tmp = opt.element ? opt.element instanceof jQuery ? opt.element[0] : opt.element.element ? opt.element.dom : opt.element : null;

		if (is && tmp && self.target === tmp) {
			self.hide();
			return;
		}

		clearTimeout2(self.ID);

		self.target = tmp;
		self.opt = opt;
		self.html('<div class="' + cls + '-body">' + opt.html + '</div>');

		var b = self.find('.' + cls + '-body');
		b.rclass2(cls + '-arrow-');
		b.aclass(cls + '-arrow-' + opt.align);

		var css = {};

		if (is) {
			css.left = 0;
			css.top = 0;
			self.element.css(css);
		} else {
			self.rclass('hidden');
			self.aclass(cls + '-visible', 100);
			is = true;
		}

		var target = $(opt.element);
		var w = self.width();
		var h = self.height();
		var offset = target.offset();

		switch (opt.align) {
			case 'left':
			case 'right':
				css.top = offset.top + (opt.center ? (h / 2 >> 0) : 0);
				css.left = opt.align === 'left' ? (offset.left - w - 10) : (offset.left + target.innerWidth() + 10);
				break;
			default:
				css.left = Math.ceil((offset.left - w / 2) + (target.innerWidth() / 2));
				css.top = opt.align === 'bottom' ? (offset.top + target.innerHeight() + 10) : (offset.top - h - 10);
				break;
		}

		if (opt.offsetX)
			css.left += opt.offsetX;

		if (opt.offsetY)
			css.top += opt.offsetY;

		opt.timeout && setTimeout2(self.ID, self.hide, opt.timeout - 200);
		self.element.css(css);
	};

});

COMPONENT('colorpicker', function(self, config, cls) {

	var cls2 = '.' + cls;
	var is = false;
	var events = {};
	var colors = [['E73323', 'EC8632', 'FFFD54', '68B25B', '7CFBFD', '4285F4', 'E73CF7', '73197B', '91683C', 'FFFFFF', '808080', '000000'],['FFFFFF', 'E8E8E8', 'D1D1D1', 'B9B9B9', 'A2A2A2', '8B8B8B', '747474', '5D5D5D', '464646', '2E2E2E', '171717', '000000'],['5C0E07', '5E350F', '66651C', '41641A', '2D6419', '2D6438', '2D6465', '133363', '000662', '2D0962', '5C1262', '5C0F32', '8A1A11', '8E501B', '99982F', '62962B', '47962A', '479654', '479798', '214D94', '010E93', '451393', '8A2094', '8A1C4C', 'B9261A', 'BD6B27', 'CCCB41', '83C83C', '61C83B', '61C871', '62C9CA', '2E67C5', '0216C4', '5C1DC4', 'B92EC5', 'B92865', 'E73323', 'EC8632', 'FFFD54', 'A4FB4E', '7BFA4C', '7BFA8D', '7CFBFD', '3B80F7', '041EF5', '7327F5', 'E73CF7', 'E7357F', 'E8483F', 'EF9D4B', 'FFFE61', 'B4FB5C', '83FA5A', '83FAA2', '83FBFD', '5599F8', '343CF5', '8C42F6', 'E84FF7', 'E84A97', 'EA706B', 'F2B573', 'FFFE7E', 'C5FC7C', '96FA7A', '96FBB9', '96FCFD', '7BB2F9', '666AF6', 'A76EF7', 'EB73F8', 'EA71B0', 'F6CECD', 'FAE6CF', 'FFFED1', 'EBFED1', 'D7FDD0', 'D7FDE7', 'D8FEFE', 'D1E5FD', 'CCCDFB', 'E1CEFB', 'F6CFFC', 'F6CEE4']];

	self.singleton();
	self.readonly();
	self.blind();
	self.nocompile();

	self.make = function() {

		var html = '';
		for (var i = 0; i < colors.length; i++) {
			html += '<div>';
			for (var j = 0; j < colors[i].length; j++) {
				html += '<span class="{0}-cell"><span style="background-color:#{1}"></span></span>'.format(cls, colors[i][j]);
			}
			html += '</div>';
		}

		self.html('<div class="{0}"><div class="{0}-body">{1}</div></div>'.format(cls, html));
		self.aclass(cls + '-container hidden');

		self.event('click', cls2 + '-cell', function() {
			var el = $(this);
			self.opt.callback && self.opt.callback(el.find('span').attr('style').replace('background-color:', ''));
			self.hide();
		});

		events.click = function(e) {
			var el = e.target;
			var parent = self.dom;
			do {
				if (el == parent)
					return;
				el = el.parentNode;
			} while (el);
			self.hide();
		};

		self.on('scroll + reflow + resize + resize2', self.hide);
	};

	self.bindevents = function() {
		if (!events.is) {
			events.is = true;
			$(document).on('click', events.click);
		}
	};

	self.unbindevents = function() {
		if (events.is) {
			events.is = false;
			$(document).off('click', events.click);
		}
	};

	self.show = function(opt) {

		var tmp = opt.element ? opt.element instanceof jQuery ? opt.element[0] : opt.element.element ? opt.element.dom : opt.element : null;

		if (is && tmp && self.target === tmp) {
			self.hide();
			return;
		}

		events.is && self.unbindevents();
		self.target = tmp;
		self.opt = opt;
		var css = {};

		if (is) {
			css.left = 0;
			css.top = 0;
			self.element.css(css);
		} else
			self.rclass('hidden');

		var target = $(opt.element);
		var w = self.element.width();
		var offset = target.offset();

		if (opt.element) {
			switch (opt.align) {
				case 'center':
					css.left = Math.ceil((offset.left - w / 2) + (target.innerWidth() / 2));
					break;
				case 'right':
					css.left = (offset.left - w) + target.innerWidth();
					break;
				default:
					css.left = offset.left;
					break;
			}

			css.top = opt.position === 'bottom' ? (offset.top - self.element.height() - 10) : (offset.top + target.innerHeight() + 10);

		} else {
			css.left = opt.x;
			css.top = opt.y;
		}

		if (opt.offsetX)
			css.left += opt.offsetX;

		if (opt.offsetY)
			css.top += opt.offsetY;

		is = true;
		self.element.css(css);
		setTimeout(self.bindevents, 10);
	};

	self.hide = function() {
		if (is) {
			is = false;
			self.target = null;
			self.opt = null;
			setTimeout(self.unbindevents, 50);
			self.aclass('hidden');
		}
	};
});

COMPONENT('largeform', 'zindex:12;padding:30;scrollbar:1;scrolltop:1;style:1', function(self, config, cls) {

	var cls2 = '.' + cls;
	var csspos = {};
	var nav = false;
	var init = false;

	if (!W.$$largeform) {

		W.$$largeform_level = W.$$largeform_level || 1;
		W.$$largeform = true;

		$(document).on('click', cls2 + '-button-close', function() {
			SET($(this).attrd('path'), '');
		});

		var resize = function() {
			setTimeout2(self.name, function() {
				for (var i = 0; i < M.components.length; i++) {
					var com = M.components[i];
					if (com.name === 'largeform' && !HIDDEN(com.dom) && com.$ready && !com.$removed)
						com.resize();
				}
			}, 200);
		};

		ON('resize2', resize);

		$(document).on('click', cls2 + '-container', function(e) {

			if (e.target === this) {
				var com = $(this).component();
				if (com && com.config.closeoutside) {
					com.set('');
					return;
				}
			}

			var el = $(e.target);
			if (el.hclass(cls + '-container') && !el.hclass(cls + '-style-2')) {
				var form = el.find(cls2);
				var c = cls + '-animate-click';
				form.aclass(c);
				setTimeout(function() {
					form.rclass(c);
				}, 300);
			}
		});
	}

	self.readonly();
	self.submit = function() {
		if (config.submit)
			self.EXEC(config.submit, self.hide, self.element);
		else
			self.hide();
	};

	self.cancel = function() {
		config.cancel && self.EXEC(config.cancel, self.hide);
		self.hide();
	};

	self.hide = function() {
		if (config.independent)
			self.hideforce();
		self.esc(false);
		self.set('');
	};

	self.icon = function(value) {
		var el = this.rclass2('fa');
		value.icon && el.aclass(value.icon.indexOf(' ') === -1 ? ('fa fa-' + value.icon) : value.icon);
	};

	self.resize = function() {

		if (self.hclass('hidden'))
			return;

		var padding = isMOBILE ? 0 : config.padding;
		var ui = self.find(cls2);

		csspos.height = WH - (config.style == 1 ? (padding * 2) : padding);
		csspos.top = padding;
		ui.css(csspos);

		var el = self.find(cls2 + '-title');
		var th = el.height();
		var w = ui.width();

		if (w > WW)
			w = WW;

		csspos = { height: csspos.height - th, width: w };

		if (nav)
			csspos.height -= nav.height();

		self.find(cls2 + '-body').css(csspos);
		self.scrollbar && self.scrollbar.resize();
		self.element.SETTER('*', 'resize');
	};

	self.make = function() {

		$(document.body).append('<div id="{0}" class="hidden {4}-container invisible"><div class="{4}" style="max-width:{1}px"><div data-bind="@config__text span:value.title__change .{4}-icon:@icon" class="{4}-title"><button name="cancel" class="{4}-button-close{3}" data-path="{2}"><i class="fa fa-times"></i></button><i class="{4}-icon"></i><span></span></div><div class="{4}-body"></div></div>'.format(self.ID, config.width || 800, self.path, config.closebutton == false ? ' hidden' : '', cls));

		var scr = self.find('> script');
		self.template = scr.length ? scr.html().trim() : '';
		scr.length && scr.remove();

		var el = $('#' + self.ID);
		var body = el.find(cls2 + '-body')[0];

		while (self.dom.children.length) {
			var child = self.dom.children[0];
			if (child.tagName === 'NAV') {
				nav = $(child);
				body.parentNode.appendChild(child);
			} else
				body.appendChild(child);
		}

		self.rclass('hidden invisible');
		self.replace(el, true);

		if (config.scrollbar)
			self.scrollbar = SCROLLBAR(self.find(cls2 + '-body'), { visibleY: config.visibleY, orientation: 'y' });

		if (config.style === 2)
			self.aclass(cls + '-style-2');

		self.event('scroll', function() {
			EMIT('scroll', self.name);
			EMIT('reflow', self.name);
		});

		self.event('click', 'button[name]', function() {
			var t = this;
			switch (t.name) {
				case 'submit':
					self.submit(self.hide);
					break;
				case 'cancel':
					!t.disabled && self[t.name](self.hide);
					break;
			}
		});

		config.enter && self.event('keydown', 'input', function(e) {
			e.which === 13 && !self.find('button[name="submit"]')[0].disabled && setTimeout(self.submit, 800);
		});
	};

	self.configure = function(key, value, init, prev) {
		if (!init) {
			switch (key) {
				case 'width':
					value !== prev && self.find(cls2).css('max-width', value + 'px');
					break;
				case 'closebutton':
					self.find(cls2 + '-button-close').tclass('hidden', value !== true);
					break;
			}
		}
	};

	self.esc = function(bind) {
		if (bind) {
			if (!self.$esc) {
				self.$esc = true;
				$(W).on('keydown', self.esc_keydown);
			}
		} else {
			if (self.$esc) {
				self.$esc = false;
				$(W).off('keydown', self.esc_keydown);
			}
		}
	};

	self.esc_keydown = function(e) {
		if (e.which === 27 && !e.isPropagationStopped()) {
			var val = self.get();
			if (!val || config.if === val) {
				e.preventDefault();
				e.stopPropagation();
				self.hide();
			}
		}
	};

	self.hideforce = function() {
		if (!self.hclass('hidden')) {
			self.aclass('hidden');
			self.release(true);
			self.find(cls2).rclass(cls + '-animate');
			W.$$largeform_level--;
		}
	};

	var allowscrollbars = function() {
		$('html').tclass(cls + '-noscroll', !!$(cls2 + '-container').not('.hidden').length);
	};

	self.setter = function(value) {

		setTimeout2(self.name + '-noscroll', allowscrollbars, 50);

		var isHidden = value !== config.if;

		if (self.hclass('hidden') === isHidden) {
			if (!isHidden) {
				config.reload && self.EXEC(config.reload, self);
				config.default && DEFAULT(self.makepath(config.default), true);
				config.scrolltop && self.scrollbar && self.scrollbar.scrollTop(0);
			}
			return;
		}

		setTimeout2(cls, function() {
			EMIT('reflow', self.name);
		}, 10);

		if (isHidden) {
			if (!config.independent)
				self.hideforce();
			return;
		}

		if (self.template) {
			var is = self.template.COMPILABLE();
			self.find(cls2).append(self.template);
			self.template = null;
			is && COMPILE();
		}

		if (W.$$largeform_level < 1)
			W.$$largeform_level = 1;

		W.$$largeform_level++;

		self.css('z-index', W.$$largeform_level * config.zindex);
		self.rclass('hidden');

		self.release(false);
		config.scrolltop && self.scrollbar && self.scrollbar.scrollTop(0);

		config.reload && self.EXEC(config.reload, self);
		config.default && DEFAULT(self.makepath(config.default), true);

		if (!isMOBILE && config.autofocus) {
			setTimeout(function() {
				self.find(typeof(config.autofocus) === 'string' ? config.autofocus : 'input[type="text"],select,textarea').eq(0).focus();
			}, 1000);
		}

		self.resize();

		setTimeout(function() {
			self.rclass('invisible');
			self.find(cls2).aclass(cls + '-animate');
			if (!init && isMOBILE) {
				$('body').aclass('hidden');
				setTimeout(function() {
					$('body').rclass('hidden');
				}, 50);
			}
			init = true;
		}, 300);

		// Fixes a problem with freezing of scrolling in Chrome
		setTimeout2(self.ID, function() {
			self.css('z-index', (W.$$largeform_level * config.zindex) + 1);
		}, 500);

		config.closeesc && self.esc(true);
	};
});

COMPONENT('approve', 'cancel:Cancel', function(self, config, cls) {

	var cls2 = '.' + cls;
	var events = {};
	var buttons;
	var oldcancel;

	self.readonly();
	self.singleton();
	self.nocompile && self.nocompile();

	self.make = function() {

		self.aclass(cls + ' hidden');
		self.html('<div><div class="{0}-body"><span class="{0}-close"><i class="fa fa-times"></i></span><div class="{0}-content"></div><div class="{0}-buttons"><button data-index="0"></button><button data-index="1"></button></div></div></div>'.format(cls));

		buttons = self.find(cls2 + '-buttons').find('button');

		self.event('click', 'button', function() {
			self.hide(+$(this).attrd('index'));
		});

		self.event('click', cls2 + '-close', function() {
			self.callback = null;
			self.hide(-1);
		});

		self.event('click', function(e) {
			var t = e.target.tagName;
			if (t !== 'DIV')
				return;
			var el = self.find(cls2 + '-body');
			el.aclass(cls + '-click');
			setTimeout(function() {
				el.rclass(cls + '-click');
			}, 300);
		});
	};

	events.keydown = function(e) {
		var index = e.which === 13 ? 0 : e.which === 27 ? 1 : null;
		if (index != null) {
			self.find('button[data-index="{0}"]'.format(index)).trigger('click');
			e.preventDefault();
			e.stopPropagation();
			events.unbind();
		}
	};

	events.bind = function() {
		$(W).on('keydown', events.keydown);
	};

	events.unbind = function() {
		$(W).off('keydown', events.keydown);
	};

	self.show = function(message, a, b, fn) {

		if (typeof(b) === 'function') {
			fn = b;
			b = config.cancel;
		}

		if (M.scope)
			self.currscope = M.scope();

		self.callback = fn;

		var icon = a.match(/"[a-z0-9-\s]+"/);
		if (icon) {

			var tmp = icon + '';
			if (tmp.indexOf(' ') == -1)
				tmp = 'fa fa-' + tmp;

			a = a.replace(icon, '').trim();
			icon = '<i class="{0}"></i>'.format(tmp.replace(/"/g, ''));
		} else
			icon = '';

		var color = a.match(/#[0-9a-f]+/i);
		if (color)
			a = a.replace(color, '').trim();

		buttons.eq(0).css('background-color', color || '').html(icon + a);

		if (oldcancel !== b) {
			oldcancel = b;
			buttons.eq(1).html(b);
		}

		self.find(cls2 + '-content').html(message.replace(/\n/g, '<br />'));
		$('html').aclass(cls + '-noscroll');
		self.rclass('hidden');
		events.bind();
		self.aclass(cls + '-visible', 5);
		document.activeElement && document.activeElement.blur();
	};

	self.hide = function(index) {

		if (!index) {
			self.currscope && M.scope(self.currscope);
			self.callback && self.callback(index);
		}

		self.rclass(cls + '-visible');
		events.unbind();
		setTimeout2(self.id, function() {
			$('html').rclass(cls + '-noscroll');
			self.aclass('hidden');
		}, 1000);
	};
});

COMPONENT('message', 'button:OK', function(self, config, cls) {

	var cls2 = '.' + cls;
	var is;
	var events = {};

	self.readonly();
	self.singleton();
	self.nocompile && self.nocompile();

	self.make = function() {

		var pls = (config.style === 2 ? (' ' + cls + '2') : '');
		self.aclass(cls + ' hidden' + pls);

		if (config.closeoutside)
			self.event('click', function(e) {
				var node = e.target;
				var skip = { SPAN: 1, A: 1, I: 1 };
				if (!skip[node.tagName])
					self.hide();
			});
		else
			self.event('click', 'button', self.hide);
	};

	events.keyup = function(e) {
		if (e.which === 27)
			self.hide();
	};

	events.bind = function() {
		if (!events.is) {
			$(W).on('keyup', events.keyup);
			events.is = false;
		}
	};

	events.unbind = function() {
		if (events.is) {
			events.is = false;
			$(W).off('keyup', events.keyup);
		}
	};

	self.warning = function(message, icon, fn) {
		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}
		self.callback = fn;
		self.content(cls + '-warning', message, icon || 'warning');
	};

	self.info = function(message, icon, fn) {
		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}
		self.callback = fn;
		self.content(cls + '-info', message, icon || 'info-circle');
	};

	self.success = function(message, icon, fn) {

		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}

		self.callback = fn;
		self.content(cls + '-success', message, icon || 'check-circle');
	};

	self.response = function(message, callback, response) {

		var fn;

		if (typeof(message) === 'function') {
			response = callback;
			fn = message;
			message = null;
		} else if (typeof(callback) === 'function')
			fn = callback;
		else {
			response = callback;
			fn = null;
		}

		if (response instanceof Array) {
			var builder = [];
			for (var i = 0; i < response.length; i++) {
				var err = response[i].error;
				err && builder.push(err);
			}
			self.warning(builder.join('<br />'));
			SETTER('!loading/hide');
		} else if (typeof(response) === 'string') {
			self.warning(response);
			SETTER('!loading/hide');
		} else {

			if (message) {
				if (message.length < 40 && message.charAt(0) === '?')
					SET(message, response);
				else
					self.success(message);
			}

			if (typeof(fn) === 'string')
				SET(fn, response);
			else if (fn)
				fn(response);
		}
	};

	self.hide = function() {
		events.unbind();
		self.callback && self.callback();
		self.aclass('hidden');
	};

	self.content = function(classname, text, icon) {

		if (icon.indexOf(' ') === -1)
			icon = 'fa fa-' + icon;

		!is && self.html('<div><div class="{0}-icon"><i class="{1}"></i></div><div class="{0}-body"><div class="{0}-text"></div><hr /><button>{2}</button></div></div>'.format(cls, icon, config.button));

		self.rclass2(cls + '-').aclass(classname);
		self.find(cls2 + '-body').rclass().aclass(cls + '-body');
		is && self.find(cls2 + '-icon').find('.fa').rclass2('fa').aclass(icon);
		self.find(cls2 + '-text').html(text);
		self.rclass('hidden');
		self.element.focus();
		is = true;
		events.bind();
		document.activeElement && document.activeElement.blur();
		setTimeout(function() {
			self.aclass(cls + '-visible');
			setTimeout(function() {
				self.find(cls2 + '-icon').aclass(cls + '-icon-animate');
				document.activeElement && document.activeElement.blur();
			}, 300);
		}, 100);
	};
});

COMPONENT('floatinginput', 'minwidth:200', function(self, config, cls) {

	var cls2 = '.' + cls;
	var timeout, icon, plus, input, summary;
	var is = false;
	var plusvisible = false;

	self.readonly();
	self.singleton();
	self.nocompile && self.nocompile();

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'placeholder':
				self.find('input').prop('placeholder', value);
				break;
		}
	};

	self.make = function() {

		self.aclass(cls + ' hidden');
		self.append('<div class="{1}-summary hidden"></div><div class="{1}-input"><span class="{1}-add hidden"><i class="fa fa-plus"></i></span><span class="{1}-button"><i class="fa fa-search"></i></span><div><input type="text" placeholder="{0}" class="{1}-search-input" name="dir{2}" autocomplete="dir{2}" /></div></div'.format(config.placeholder, cls, Date.now()));

		input = self.find('input');
		icon = self.find(cls2 + '-button').find('i');
		plus = self.find(cls2 + '-add');
		summary = self.find(cls2 + '-summary');

		self.event('click', cls2 + '-button', function(e) {
			input.val('');
			self.search();
			e.stopPropagation();
			e.preventDefault();
		});

		self.event('click', cls2 + '-add', function() {
			if (self.opt.callback) {
				self.opt.scope && M.scope(self.opt.scope);
				self.opt.callback(input.val(), self.opt.element, true);
				self.hide();
			}
		});

		self.event('keydown', 'input', function(e) {
			switch (e.which) {
				case 27:
					self.hide();
					break;
				case 13:
					if (self.opt.callback) {
						self.opt.scope && M.scope(self.opt.scope);
						self.opt.callback(this.value, self.opt.element);
					}
					self.hide();
					break;
			}
		});

		var e_click = function(e) {
			var node = e.target;
			var count = 0;

			if (is) {
				while (true) {
					var c = node.getAttribute('class') || '';
					if (c.indexOf(cls + '-input') !== -1)
						return;
					node = node.parentNode;
					if (!node || !node.tagName || node.tagName === 'BODY' || count > 3)
						break;
					count++;
				}
			} else {
				is = true;
				while (true) {
					var c = node.getAttribute('class') || '';
					if (c.indexOf(cls) !== -1) {
						is = false;
						break;
					}
					node = node.parentNode;
					if (!node || !node.tagName || node.tagName === 'BODY' || count > 4)
						break;
					count++;
				}
			}

			is && self.hide(0);
		};

		var e_resize = function() {
			is && self.hide(0);
		};

		self.bindedevents = false;

		self.bindevents = function() {
			if (!self.bindedevents) {
				$(document).on('click', e_click);
				$(W).on('resize', e_resize);
				self.bindedevents = true;
			}
		};

		self.unbindevents = function() {
			if (self.bindedevents) {
				self.bindedevents = false;
				$(document).off('click', e_click);
				$(W).off('resize', e_resize);
			}
		};

		self.event('input', 'input', function() {
			var is = !!this.value;
			if (plusvisible !== is) {
				plusvisible = is;
				plus.tclass('hidden', !this.value);
			}
		});

		var fn = function() {
			is && self.hide(1);
		};

		self.on('reflow + scroll + resize + resize2', fn);
	};

	self.show = function(opt) {

		// opt.element
		// opt.callback(value, el)
		// opt.offsetX     --> offsetX
		// opt.offsetY     --> offsetY
		// opt.offsetWidth --> plusWidth
		// opt.placeholder
		// opt.render
		// opt.minwidth
		// opt.maxwidth
		// opt.icon;
		// opt.maxlength = 30;

		var el = opt.element instanceof jQuery ? opt.element[0] : opt.element;

		self.tclass(cls + '-default', !opt.render);

		if (!opt.minwidth)
			opt.minwidth = 200;

		if (is) {
			clearTimeout(timeout);
			if (self.target === el) {
				self.hide(1);
				return;
			}
		}

		self.initializing = true;
		self.target = el;
		plusvisible = false;

		var element = $(opt.element);

		setTimeout(self.bindevents, 500);

		self.opt = opt;
		opt.class && self.aclass(opt.class);

		input.val(opt.value || '');
		input.prop('maxlength', opt.maxlength || 50);

		self.target = element[0];

		var w = element.width();
		var offset = element.offset();
		var width = w + (opt.offsetWidth || 0);

		if (opt.minwidth && width < opt.minwidth)
			width = opt.minwidth;
		else if (opt.maxwidth && width > opt.maxwidth)
			width = opt.maxwidth;

		var ico = '';

		if (opt.icon) {
			if (opt.icon.indexOf(' ') === -1)
				ico = 'fa fa-' + opt.icon;
			else
				ico = opt.icon;
		} else
			ico = 'fa fa-pencil-alt';

		icon.rclass2('fa').aclass(ico).rclass('hidden');

		if (opt.value) {
			plusvisible = true;
			plus.rclass('hidden');
		} else
			plus.aclass('hidden');

		self.find('input').prop('placeholder', opt.placeholder || config.placeholder);
		var options = { left: 0, top: 0, width: width };

		summary.tclass('hidden', !opt.summary).html(opt.summary || '');

		switch (opt.align) {
			case 'center':
				options.left = Math.ceil((offset.left - width / 2) + (width / 2));
				break;
			case 'right':
				options.left = (offset.left - width) + w;
				break;
			default:
				options.left = offset.left;
				break;
		}

		options.top = opt.position === 'bottom' ? ((offset.top - self.height()) + element.height()) : offset.top;
		options.scope = M.scope ? M.scope() : '';

		if (opt.offsetX)
			options.left += opt.offsetX;

		if (opt.offsetY)
			options.top += opt.offsetY;

		self.css(options);

		!isMOBILE && setTimeout(function() {
			opt.select && input[0].select();
			input.focus();
		}, 200);


		self.tclass(cls + '-monospace', !!opt.monospace);
		self.rclass('hidden');

		setTimeout(function() {
			self.initializing = false;
			is = true;
			if (self.opt && self.target && self.target.offsetParent)
				self.aclass(cls + '-visible');
			else
				self.hide(1);
		}, 100);
	};

	self.hide = function(sleep) {
		if (!is || self.initializing)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.unbindevents();
			self.rclass(cls + '-visible').aclass('hidden');
			if (self.opt) {
				self.opt.close && self.opt.close();
				self.opt.class && self.rclass(self.opt.class);
				self.opt = null;
			}
			is = false;
		}, sleep ? sleep : 100);
	};
});

COMPONENT('clipboard', function(self) {

	var container;

	self.singleton();
	self.readonly();
	self.nocompile && self.nocompile();

	self.copy = function(value) {
		container.val(value);
		container.focus();
		container.select();
		document.execCommand('copy');
		container.blur();
	};

	self.make = function() {
		var id = 'clipboard' + self.id;
		$(document.body).append('<textarea id="{0}" class="ui-clipboard"></textarea>'.format(id));
		container = $('#' + id);
	};

	self.setter = function(value) {
		value && self.copy(value);
	};
});

COMPONENT('viewbox', 'margin:0;scroll:true;delay:100;scrollbar:0;visibleY:1;height:100;invisible:1', function(self, config, cls) {

	var eld, elb;
	var scrollbar;
	var cls2 = '.' + cls;
	var init = false;
	var cache;
	var scrolltoforce;

	self.readonly();

	self.init = function() {

		var resize = function() {
			for (var i = 0; i < M.components.length; i++) {
				var com = M.components[i];
				if (com.name === 'viewbox' && com.dom.offsetParent && com.$ready && !com.$removed)
					com.resizeforce();
			}
		};

		ON('resize2', function() {
			setTimeout2('viewboxresize', resize, 200);
		});
	};

	self.destroy = function() {
		scrollbar && scrollbar.destroy();
	};

	self.configure = function(key, value, init) {
		switch (key) {
			case 'disabled':
				eld.tclass('hidden', !value);
				break;
			case 'minheight':
			case 'margin':
			case 'marginxs':
			case 'marginsm':
			case 'marginmd':
			case 'marginlg':
				!init && self.resize();
				break;
			case 'selector': // backward compatibility
				config.parent = value;
				self.resize();
				break;
		}
	};

	self.scrollbottom = function(val) {
		if (val == null)
			return elb[0].scrollTop;
		elb[0].scrollTop = (elb[0].scrollHeight - self.dom.clientHeight) - (val || 0);
		return elb[0].scrollTop;
	};

	self.scrolltop = function(val) {
		if (val == null)
			return elb[0].scrollTop;
		elb[0].scrollTop = (val || 0);
		return elb[0].scrollTop;
	};

	self.make = function() {
		config.invisible && self.aclass('invisible');
		config.scroll && MAIN.version > 17 && self.element.wrapInner('<div class="' + cls + '-body"></div>');
		self.element.prepend('<div class="' + cls + '-disabled hidden"></div>');
		eld = self.find('> .{0}-disabled'.format(cls)).eq(0);
		elb = self.find('> .{0}-body'.format(cls)).eq(0);
		self.aclass('{0} {0}-hidden'.format(cls));
		if (config.scroll) {
			if (config.scrollbar) {
				if (MAIN.version > 17) {
					scrollbar = W.SCROLLBAR(self.find(cls2 + '-body'), { shadow: config.scrollbarshadow, visibleY: config.visibleY, visibleX: config.visibleX, orientation: config.visibleX ? null : 'y', parent: self.element });
					self.scrolltop = scrollbar.scrollTop;
					self.scrollbottom = scrollbar.scrollBottom;
				} else
					self.aclass(cls + '-scroll');
			} else {
				self.aclass(cls + '-scroll');
				self.find(cls2 + '-body').aclass('noscrollbar');
			}
		}
		self.resize();
	};

	self.released = function(is) {
		!is && self.resize();
	};

	var css = {};

	self.resize = function() {
		setTimeout2(self.ID, self.resizeforce, 200);
	};

	self.resizeforce = function() {

		var el = self.parent(config.parent);
		var h = el.height();
		var w = el.width();
		var width = WIDTH();
		var mywidth = self.element.width();

		var key = width + 'x' + mywidth + 'x' + w + 'x' + h;
		if (cache === key) {
			scrollbar && scrollbar.resize();
			if (scrolltoforce) {
				if (scrolltoforce ==='bottom')
					self.scrollbottom(0);
				else
					self.scrolltop(0);
				scrolltoforce = null;
			}
			return;
		}

		cache = key;

		var margin = config.margin;
		var responsivemargin = config['margin' + width];

		if (responsivemargin != null)
			margin = responsivemargin;

		if (margin === 'auto')
			margin = self.element.offset().top;

		if (h === 0 || w === 0) {
			self.$waiting && clearTimeout(self.$waiting);
			self.$waiting = setTimeout(self.resize, 234);
			return;
		}

		h = ((h / 100) * config.height) - margin;

		if (config.minheight && h < config.minheight)
			h = config.minheight;

		css.height = h;
		css.width = mywidth;
		eld.css(css);

		css.width = null;
		self.css(css);
		elb.length && elb.css(css);
		self.element.SETTER('*', 'resize');
		var c = cls + '-hidden';
		self.hclass(c) && self.rclass(c, 100);
		scrollbar && scrollbar.resize();

		if (scrolltoforce) {
			if (scrolltoforce ==='bottom')
				self.scrollbottom(0);
			else
				self.scrolltop(0);
			scrolltoforce = null;
		}

		if (!init) {
			self.rclass('invisible', 250);
			init = true;
		}
	};

	self.resizescrollbar = function() {
		scrollbar && scrollbar.resize();
	};

	self.setter = function() {
		scrolltoforce = config.scrollto || config.scrolltop;
		if (scrolltoforce) {
			if (scrolltoforce ==='bottom')
				self.scrollbottom(0);
			else
				self.scrolltop(0);
			scrolltoforce = null;
		}
		setTimeout(self.resize, config.delay, scrolltoforce);
	};
});

COMPONENT('markdown', function (self) {

	self.readonly();
	self.singleton();
	self.blind();
	self.nocompile();

	self.make = function() {
		// Remove from DOM because Markdown is used as a String prototype and Tangular helper
		setTimeout(function() {
			self.remove();
		}, 500);

		$(document).on('click', '.markdown-showsecret,.markdown-showblock', function() {
			var el = $(this);
			var next = el.next();
			next.tclass('hidden');
			var is = next.hclass('hidden');
			var icons = el.find('i');
			if (el.hclass('markdown-showsecret')) {
				icons.eq(0).tclass('fa-unlock', !is).tclass('fa-lock', is);
				icons.eq(1).tclass('fa-angle-up', !is).tclass('fa-angle-down', is);
			} else {
				icons.eq(0).tclass('fa-minus', !is).tclass('fa-plus', is);
				el.tclass('markdown-showblock-visible', !is);
			}
			el.find('b').html(el.attrd(is ? 'show' : 'hide'));
		});
	};

	(function Markdown() {

		var keywords = /\{.*?\}\(.*?\)/g;
		var linksexternal = /(https|http):\/\//;
		var format = /__.*?__|_.*?_|\*\*.*?\*\*|\*.*?\*|~~.*?~~|~.*?~/g;
		var ordered = /^[a-z|0-9]{1}\.\s|^-\s/i;
		var orderedsize = /^(\s|\t)+/;
		var code = /`.*?`/g;
		var encodetags = /<|>/g;
		var regdash = /-{2,}/g;
		var regicons = /(^|[^\w]):((fab\s|far\s|fas\s|fal\s|fad|fa\s)fa-)?[a-z-]+:([^\w]|$)/g;
		var regemptychar = /\s|\W/;
		var regtags = /<[^>]*>/g;

		var encode = function(val) {
			return '&' + (val === '<' ? 'lt' : 'gt') + ';';
		};

		function markdown_code(value) {
			return '<code>' + value.substring(1, value.length - 1) + '</code>';
		}

		function markdown_imagelinks(value) {
			var end = value.lastIndexOf(')') + 1;
			var img = value.substring(0, end);
			var url = value.substring(end + 2, value.length - 1);
			var label = markdown_links(img);
			var footnote = label.substring(0, 13);

			if (footnote === '<sup data-id=' || footnote === '<span data-id' || label.substring(0, 9) === '<a href="')
				return label;

			return '<a href="' + url + '"' + (linksexternal.test(url) ? ' target="_blank"' : '') + '>' + label + '</a>';
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

			// footnotes
			if ((/^#\d+$/).test(link)) {
				return (/^\d+$/).test(text) ? '<sup data-id="{0}" class="markdown-footnote">{1}</sup>'.format(link.substring(1), text) : '<span data-id="{0}" class="markdown-footnote">{1}</span>'.format(link.substring(1), text);
			}

			if (link.substring(0, 4) === 'www.')
				link = 'https://' + link;

			var nofollow = link.charAt(0) === '@' ? ' rel="nofollow"' : linksexternal.test(link) ? ' target="_blank"' : '';
			return '<a href="' + link + '"' + nofollow + '>' + text + '</a>';
		}

		function markdown_image(value) {

			var end = value.lastIndexOf(']');
			var text = value.substring(2, end);
			var link = value.substring(end + 2, value.length - 1);
			var responsive = 1;
			var f = text.charAt(0);

			if (f === '+') {
				responsive = 2;
				text = text.substring(1);
			} else if (f === '-') {
				// gallery
				responsive = 3;
				text = text.substring(1);
			}

			return '<img src="' + link + '" alt="' + text + '"' + (responsive === 1 ? ' class="img-responsive"' : responsive === 3 ? ' class="markdown-gallery"' : '') + ' border="0" loading="lazy" />';
		}

		function markdown_keywords(value) {
			var keyword = value.substring(1, value.indexOf('}'));
			var type = value.substring(value.lastIndexOf('(') + 1, value.lastIndexOf(')'));
			return '<span class="markdown-keyword" data-type="{0}">{1}</span>'.format(type, keyword);
		}

		function markdown_links2(value) {
			value = value.substring(4, value.length - 4);
			return '<a href="' + (value.isEmail() ? 'mailto:' : linksexternal.test(value) ? '' : 'http://') + value + '" target="_blank">' + value + '</a>';
		}

		function markdown_format(value, index, text) {

			var p = text.charAt(index - 1);
			var n = text.charAt(index + value.length);

			if ((!p || regemptychar.test(p)) && (!n || regemptychar.test(n))) {

				var beg = '';
				var end = '';
				var tag;

				if (value.indexOf('*') !== -1) {
					tag = value.indexOf('**') === -1 ? 'em' : 'strong';
					beg += '<' + tag + '>';
					end = '</' + tag + '>' + end;
				}

				if (value.indexOf('_') !== -1) {
					tag = value.indexOf('__') === -1 ? 'u' : 'b';
					beg += '<' + tag + '>';
					end = '</' + tag + '>' + end;
				}

				if (value.indexOf('~') !== -1) {
					beg += '<strike>';
					end = '</strike>' + end;
				}

				var count = value.charAt(1) === value.charAt(0) ? 2 : 1;
				return beg + value.substring(count, value.length - count) + end;
			}

			return value;
		}

		function markdown_id(value) {
			value = value.replace(regtags, '');
			return value.slug().replace(regdash, '-');
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

			var icon = value.substring(beg, end);
			if (icon.indexOf(' ') === -1)
				icon = 'fa fa-' + icon;
			return value.substring(0, beg - 1) + '<i class="' + icon + '"></i>' + value.substring(end + 1);
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

		FUNC.markdownredraw = function(el, opt) {

			if (!el)
				el = $('body');

			if (!opt)
				opt = EMPTYOBJECT;

			el.find('.lang-secret').each(function() {
				var t = this;
				if (t.$mdloaded)
					return;
				t.$mdloaded = 1;
				var el = $(t);
				el.parent().replaceWith('<div class="markdown-secret" data-show="{0}" data-hide="{1}"><span class="markdown-showsecret"><i class="fa fa-lock"></i><i class="fa pull-right fa-angle-down"></i><b>{0}</b></span><div class="hidden">'.format(opt.showsecret || 'Show secret data', opt.hidesecret || 'Hide secret data') + el.html().trim().markdown(opt.secretoptions, true) +'</div></div>');
			});

			el.find('.lang-video').each(function() {
				var t = this;
				if (t.$mdloaded)
					return;
				t.$mdloaded = 1;
				var el = $(t);
				var html = el.html();
				if (html.indexOf('youtube') !== -1)
					el.parent().replaceWith('<div class="markdown-video"><iframe src="https://www.youtube.com/embed/' + html.split('v=')[1] + '" frameborder="0" allowfullscreen></iframe></div>');
				else if (html.indexOf('vimeo') !== -1)
					el.parent().replaceWith('<div class="markdown-video"><iframe src="//player.vimeo.com/video/' + html.substring(html.lastIndexOf('/') + 1) + '" frameborder="0" allowfullscreen></iframe></div>');
			});

			el.find('.lang-barchart').each(function() {

				var t = this;
				if (t.$mdloaded)
					return;

				t.$mdloaded = 1;
				var el = $(t);
				var arr = el.html().split('\n').trim();
				var series = [];
				var categories = [];
				var y = '';

				for (var i = 0; i < arr.length; i++) {
					var line = arr[i].split('|').trim();
					for (var j = 1; j < line.length; j++) {
						if (i === 0)
							series.push({ name: line[j], data: [] });
						else
							series[j - 1].data.push(+line[j]);
					}
					if (i)
						categories.push(line[0]);
					else
						y = line[0];
				}

				var options = {
					chart: {
						height: 300,
						type: 'bar',
					},
					yaxis: { title: { text: y }},
					series: series,
					xaxis: { categories: categories, },
					fill: { opacity: 1 },
				};

				var chart = new ApexCharts($(this).parent().empty()[0], options);
				chart.render();
			});

			el.find('.lang-linerchart').each(function() {

				var t = this;
				if (t.$mdloaded)
					return;
				t.$mdloaded = 1;

				var el = $(t);
				var arr = el.html().split('\n').trim();
				var series = [];
				var categories = [];
				var y = '';

				for (var i = 0; i < arr.length; i++) {
					var line = arr[i].split('|').trim();
					for (var j = 1; j < line.length; j++) {
						if (i === 0)
							series.push({ name: line[j], data: [] });
						else
							series[j - 1].data.push(+line[j]);
					}
					if (i)
						categories.push(line[0]);
					else
						y = line[0];
				}

				var options = {
					chart: {
						height: 300,
						type: 'line',
					},
					yaxis: { title: { text: y }},
					series: series,
					xaxis: { categories: categories, },
					fill: { opacity: 1 },
				};

				var chart = new ApexCharts($(this).parent().empty()[0], options);
				chart.render();
			});

			el.find('.lang-iframe').each(function() {

				var t = this;
				if (t.$mdloaded)
					return;
				t.$mdloaded = 1;

				var el = $(t);
				el.parent().replaceWith('<div class="markdown-iframe">' + el.html().replace(/&lt;/g, '<').replace(/&gt;/g, '>') + '</div>');
			});

			el.find('pre code').each(function(i, block) {
				var t = this;
				if (t.$mdloaded)
					return;
				if (W.hljs) {
					t.$mdloaded = 1;
					W.hljs.highlightBlock(block);
				}
			});

			el.find('a').each(function() {
				var t = this;
				if (t.$mdloaded)
					return;
				t.$mdloaded = 1;
				var el = $(t);
				var href = el.attr('href');
				var c = href.substring(0, 1);
				if (href === '#') {
					var beg = '';
					var end = '';
					var text = el.html();
					if (text.substring(0, 1) === '<')
						beg = '-';
					if (text.substring(text.length - 1) === '>')
						end = '-';
					el.attr('href', '#' + (beg + markdown_id(el.text()) + end));
				} else if (c !== '/' && c !== '#')
					el.attr('target', '_blank');
			});

			el.find('.markdown-code').rclass('hidden');
		};

		String.prototype.markdown = function(opt, nested) {

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
			// opt.keywords = true;
			// opt.emptynewline = true;

			var str = this;

			if (!opt)
				opt = {};

			var lines = str.split('\n');
			var builder = [];
			var ul = [];
			var table = false;
			var iscode = false;
			var isblock = false;
			var ishead = false;
			var isprevblock = false;
			var prev;
			var prevsize = 0;
			var previndex;
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

			var linkscope = function(val, index, callback) {

				var beg = -1;
				var beg2 = -1;
				var can = false;
				var skip = false;
				var find = false;
				var n;

				for (var i = index; i < val.length; i++) {
					var c = val.charAt(i);

					if (c === '[') {
						beg = i;
						can = false;
						find = true;
						continue;
					}

					var codescope = val.substring(i, i + 6);

					if (skip && codescope === '</code') {
						skip = false;
						i += 7;
						continue;
					}

					if (skip)
						continue;

					if (!find && codescope === '<code>') {
						skip = true;
						continue;
					}

					var il = val.substring(i, i + 4);

					if (il === '&lt;') {
						beg2 = i;
						continue;
					} else if (beg2 > -1 && il === '&gt;') {
						callback(val.substring(beg2, i + 4), true);
						beg2 = -1;
						continue;
					}

					if (c === ']') {

						can = false;
						find = false;

						if (beg === -1)
							continue;

						n = val.charAt(i + 1);

						// maybe a link mistake
						if (n === ' ')
							n = val.charAt(i + 2);

						// maybe a link
						can = n === '(';
					}

					if (beg > -1 && can && c === ')') {
						n = val.charAt(beg - 1);
						callback(val.substring(beg - (n === '!' ? 1 : 0), i + 1));
						can = false;
						find = false;
						beg = -1;
					}
				}

			};

			var formatline = function(line) {
				var tmp = [];
				return line.replace(code, function(text) {
					tmp.push(text);
					return '\0';
				}).replace(format, markdown_format).replace(/\0/g, function() {
					return markdown_code(tmp.shift());
				});
			};

			var imagescope = function(val) {

				var beg = -1;
				var can = false;
				var n;

				for (var i = 0; i < val.length; i++) {
					var c = val.charAt(i);

					if (c === '[') {
						beg = i;
						can = false;
						continue;
					}

					if (c === ']') {

						can = false;

						if (beg === -1)
							continue;

						n = val.charAt(i + 1);

						// maybe a link mistake
						if (n === ' ')
							n = val.charAt(i + 2);

						// maybe a link
						can = n === '(';
					}

					if (beg > -1 && can && c === ')') {
						n = val.charAt(beg - 1);
						var tmp = val.substring(beg - (n === '!' ? 1 : 0), i + 1);
						if (tmp.charAt(0) === '!')
							val = val.replace(tmp, markdown_image(tmp));
						can = false;
						beg = -1;
					}
				}


				return val;
			};

			for (var i = 0; i < lines.length; i++) {

				lines[i] = lines[i].replace(encodetags, encode);
				var three = lines[i].substring(0, 3);

				if (!iscode && (three === ':::' || (three === '==='))) {

					if (isblock) {
						if (opt.blocks !== false)
							builder[builder.length - 1] += '</div></div>';
						isblock = false;
						isprevblock = true;
						continue;
					}

					closeul();
					isblock = true;
					if (opt.blocks !== false) {
						line = lines[i].substring(3).trim();
						if (opt.formatting !== false)
							line = formatline(line);
						builder.push('<div class="markdown-block"><span class="markdown-showblock"><i class="fa fa-plus"></i>{0}</span><div class="hidden">'.format(line));
					}
					prev = '';
					continue;
				}

				if (!isblock && lines[i] && isprevblock) {
					builder.push('<br />');
					isprevblock = false;
				}

				if (three === '```') {

					if (iscode) {
						if (opt.code !== false)
							builder[builder.length - 1] += '</code></pre></div>';
						iscode = false;
						continue;
					}

					closeul();
					iscode = true;
					if (opt.code !== false)
						tmp = '<div class="markdown-code hidden"><pre><code class="lang-' + lines[i].substring(3) + '">';
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

				if (opt.br !== false)
					line = line.replace(/&lt;br(\s\/)?&gt;/g, '<br />');

				if (line.length > 10 && opt.urlify !== false && opt.links !== false)
					line = markdown_urlify(line);

				if (opt.custom)
					line = opt.custom(line);

				if (line.length > 2 && line !== '***' && line !== '---') {
					if (opt.formatting !== false)
						line = formatline(line);
					if (opt.images !== false)
						line = imagescope(line);
					if (opt.links !== false) {
						linkscope(line, 0, function(text, inline) {
							if (inline)
								line = line.replace(text, markdown_links2);
							else if (opt.images !== false)
								line = line.replace(text, markdown_imagelinks);
							else
								line = line.replace(text, formatlinks);
						});
					}
					if (opt.keywords !== false)
						line = line.replace(keywords, markdown_keywords);

					if (opt.icons !== false)
						line = line.replace(regicons, markdown_icon);
				}

				if (!line) {
					if (table) {
						table = null;
						if (opt.tables !== false)
							builder.push('</tbody></table>');
					}
				}

				if (line === '' && lines[i - 1] === '') {
					closeul();
					if (opt.emptynewline !== false)
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
						builder.push('<hr class="markdown-line' + (tmp.charAt(0) === '-' ? '1' : '2') + '" />');
					continue;
				}

				// footnotes
				if ((/^#\d+:(\s)+/).test(line)) {
					if (opt.footnotes !== false) {
						tmp = line.indexOf(':');
						builder.push('<div class="markdown-footnotebody" data-id="{0}"><span>{0}:</span> {1}</div>'.format(line.substring(1, tmp).trim(), line.substring(tmp + 1).trim()));
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
						previndex = builder.push('<' + type + (subtype ? (' type="' + subtype + '"') : '') + '>') - 1;
						ul.push(type + (append ? '></li' : ''));
						prev = type;
						prevsize = size;
					}

					var tmpstr = (type === 'ol' ? tmpline.substring(tmpline.indexOf('.') + 1) : tmpline.substring(2));
					if (type !== 'ol') {
						var tt = tmpstr.substring(0, 3);
						if (tt === '[ ]' || tt === '[x]') {
							if (previndex != null)
								builder[previndex] = builder[previndex].replace('<ul', '<ul class="markdown-tasks"');
							previndex = null;
						}
					}

					builder.push('<li>' + tmpstr.trim().replace(/\[x\]/g, '<i class="fa fa-check-square green"></i>').replace(/\[\s\]/g, '<i class="far fa-square"></i>') + '</li>');

				} else {
					closeul();
					line && builder.push((opt.linetag ? ('<' + opt.linetag + '>') : '') + line.trim() + (opt.linetag ? ('</' + opt.linetag + '>') : ''));
					prev = 'p';
				}
			}

			closeul();
			table && opt.tables !== false && builder.push('</tbody></table>');
			iscode && opt.code !== false && builder.push('</code></pre>');
			if (!opt.noredraw && typeof(window) === 'object')
				setTimeout(FUNC.markdownredraw, 1, null, opt);
			return (opt.wrap ? ('<div class="markdown' + (nested ? '' : ' markdown-container') + '">') : '') + builder.join('\n').replace(/\t/g, '    ') + (opt.wrap ? '</div>' : '');
		};

	})();

});