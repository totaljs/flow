var SNIPPETS = [];

COMPONENT('codemirror', 'linenumbers:true;required:false;trim:false;tabs:true;margin:0;height:0', function(self, config, cls) {

	var editor, container;
	var cls2 = '.' + cls;
	var HSM = { annotateScrollbar: true, delay: 100 };
	var fn = {};
	var can = {};
	var snippets = {};
	var snippets_cache = {};
	var autocomplete;
	var autocomplete_unique;
	var REGAUTOCOMPLETE = /(#)?[a-zA-Z0-9_-]{3,30}/g;
	var lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'.split(' ');

	self.getter = null;
	self.nocompile();

	self.resize = function() {
		setTimeout2(self.ID, self.resizeforce, 300);
	};

	self.resizeforce = function() {
		if (config.height) {
			editor.setSize('100%', config.height + 'px');
		} else {
			var parent = self.parent(config.parent);
			var h = parent.height();
			editor.setSize('100%', (h - config.margin) + 'px');
			self.css('height', h - config.margin);
		}
	};

	function autocomplete_sort(a, b) {

		var an = a.displayText || a.text;
		var bn = b.displayText || b.text;

		if (a.priority && !b.priority)
			return -1;

		if (!a.priority && b.priority)
			return 1;

		if (a.priority && b.priority) {
			if (a.priority > b.priority)
				return -1;
			else if (a.priority < b.priority)
				return 1;
			else
				return 0;
		}

		if (an.length < bn.length)
			return -1;
		else if (an.length > bn.length)
			return 1;

		return 0;
	}

	function rebuild(index) {

		if (index == null || autocomplete_unique == null)
			return;

		var line = editor.getLine(index);

		if (!line)
			return;

		var words = line.match(REGAUTOCOMPLETE);

		if (words) {

			var unique = {};

			for (var i = 0; i < words.length; i++) {
				var w = words[i];
				var index = w.indexOf('__');
				if (index !== -1)
					w = w.substring(0, index);
				if (!autocomplete_unique[w])
					autocomplete_unique[w] = unique[w] = 1;
			}

			unique = Object.keys(unique);
			unique.sort();

			// adds new keywords
			for (var i = 0; i < unique.length; i++) {
				var s = unique[i];
				autocomplete.push({ search: s, text: (s.charAt(0) === '#' && s.length === 7 ? '<i class="fa fa-square mr5" style="color:{0}"></i>'.format(s) : '') + s, code: s });
			}
		}
	}

	function rebuild_source(val) {

		var words = val || editor.getValue();
		var max = 100000;
		if (words.length > max)
			words = words.substring(0, max);

		words = words.match(REGAUTOCOMPLETE);
		if (words) {

			autocomplete_unique = {};
			for (var i = 0; i < words.length; i++) {
				var w = words[i];
				var index = w.indexOf('__');
				if (index !== -1)
					w = w.substring(0, index);
				autocomplete_unique[w] = 1;
			}

			autocomplete = Object.keys(autocomplete_unique);
			autocomplete.sort();

			for (var i = 0; i < autocomplete.length; i++) {
				var s = autocomplete[i];
				autocomplete[i] = { search: s, text: (s.charAt(0) === '#' && s.length === 7 ? '<i class="fa fa-square mr5" style="color:{0}"></i>'.format(s) : '') + s, code: s };
			}

		} else
			autocomplete = null;
	}

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

		var tabulator = function() {

			var cm = editor;
			var cur = cm.getCursor();
			var line = cm.getLine(cur.line);
			var loremcount = 0;
			var end = line.substring(cur.ch);

			line.substring(0, cur.ch).replace(/lorem\d+$/i, function(text) {
				loremcount = +text.match(/\d+/)[0];
				cur.ch -= text.length;
				self.change(true);
				return '';
			});

			if (loremcount) {
				var builder = lorem.slice(0, loremcount).join(' ').replace(/(,|\.)$/, '');
				cm.replaceRange(builder + (end || ''), { line: cur.line, ch: cur.ch }, { line: cur.line, ch: cur.cr });
				cm.doc.setCursor({ line: cur.line, ch: cur.ch + builder.length });
				self.change(true);
				return;
			}

			if (editor.options.mode === 'totaljs' || editor.options.mode === 'html') {

				var index = fn.lastIndexOf(line, cur.ch, '\t', '>', ' ');
				if (index === -1)
					return CodeMirror.Pass;

				var html = line.substring(index, cur.ch);
				if ((/(div|ul|address|li|span|footer|header|main|table|strong|em|b|i|a|h|p|img|td|tr|th|hr|br|thead|tfoot|tbody|section|figure|section|dd|dl|dt)+(\.[a-z0-9-_])*/).test(html) || (/(^|\s)\.[a-z0-9-_]*/).test(html)) {
					var cls = html.split('.');
					if (!cls[0]) {
						if (cls[1].substring(0, 2) === 'fa')
							cls[0] = 'i';
						else
							cls[0] = 'div';
					}
					var tag = cls[0] === 'hr' || cls[0] === 'br' ? '<{0} />'.format(cls[0]) : cls[0] === 'img' ? '<img src="" alt="" />' : ('<{0}{1}></{0}>'.format(cls[0], cls[1] ? (' class="' + cls[1] + '"') : ''));
					cm.replaceRange(line.substring(0, index) + tag + line.substring(cur.ch), { line: cur.line, ch: 0 }, { line: cur.line, ch: cur.cr });
					cm.doc.setCursor({ line: cur.line, ch: index + (cls[0] === 'img' ? (tag.indexOf('"') + 1) : (tag.indexOf('>') + 1)) });
					self.change(true);
					return;
				}
			}

			return CodeMirror.Pass;
		};

		var comment = function() {
			var sel = editor.getSelections();
			var cur = editor.getCursor();
			var mode = editor.getModeAt(cur);
			var syntax = FUNC.getext(mode.helperType || mode.name);
			var iscurrent = false;

			if (sel.length === 1 && !sel[0]) {
				var line = editor.getLine(cur.line);
				sel[0] = line;
				iscurrent = true;
			}

			for (var i = 0; i < sel.length; i++) {
				sel[i] = sel[i].split('\n');
				sel[i] = FUNC.comment(syntax, sel[i]).join('\n');
			}

			if (iscurrent)
				editor.replaceRange(sel[0], { line: cur.line, ch: 0 }, { line: cur.line });
			else
				editor.replaceSelections(sel);

			self.change(true);
		};

		var options = {};
		// options.autoRefresh = true;
		options.lineNumbers = config.linenumbers;
		options.mode = config.type || 'htmlmixed';
		options.indentUnit = 4;
		options.scrollbarStyle = 'simple';
		options.gutters = ['CodeMirror-lint-markers', 'CodeMirror-linenumbers'];
		options.rulers = [{ column: 130, lineStyle: 'dashed' }, { column: -20, lineStyle: 'dashed' }];
		options.viewportMargin = 500;
		// options.foldGutter = true;
		//options.matchTags = { bothTags: true };
		options.scrollPastEnd = true;
		options.extraKeys = { 'Cmd-D': findmatch, 'Ctrl-D': findmatch, 'Ctrl-/': comment, 'Cmd-/': comment, 'Ctrl--': comment, 'Cmd--': comment, Tab: tabulator };
		options.styleActiveLine = true;
		options.autoCloseTags = true;
		options.autoCloseBrackets = true;
		options.doubleIndentSwitch = false;
		options.showCursorWhenSelecting = true;
		// options.lint = true;
		options.lineWrapping = false;
		options.matchBrackets = true;
		options.highlightSelectionMatches = HSM;
		options.showTrailingSpace = false;

		if (config.tabs)
			options.indentWithTabs = true;

		editor = CodeMirror(container[0], options);
		self.editor = editor;

		editor.setOption('lint', { esversion: 6, expr: true, evil: true, unused: true, shadow: true, node: true, browser: true });
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

		self.resize();
		self.on('resize + resize2', self.resize);

		if (config.disabled) {
			self.aclass('ui-disabled');
			editor.readOnly = true;
			editor.refresh();
		}

		fn.lastIndexOf = function(str, chfrom) {
			for (var i = chfrom; i > 0; i--) {
				var c = str.substring(i - 1, i);
				for (var j = 1; j < arguments.length; j++)
					if (c === arguments[j])
						return i;
			}
			return 0;
		};

		var snippetsoptions = { completeSingle: false, hint: function(cm) {

			if (snippets.text.length < 2 && snippets.text !== '#') {
				snippets_cache.list = EMPTYARRAY;
				snippets_cache.from = 0;
				snippets_cache.to = 0;
				return snippets_cache;
			}

			var cur = cm.getCursor();
			var mode = cm.getModeAt(cur);
			var start = snippets.index;
			var end = cur.ch;
			var tabs = '';

			for (var i = 0; i < snippets.index; i++) {
				if (snippets.line.charAt(i) !== '\t')
					break;
				tabs += '\t';
			}

			var index = -1;

			for (var i = snippets.text.length - 1; i > 0; i--) {
				var c = snippets.text.charCodeAt(i);
				if ((c > 64 && c < 91) || (c > 96 && c < 123) || (c > 47 && c < 58) || c === 45 || c === 95)
					continue;
				index = i;
				break;
			}

			if (index > -1) {
				index++;
				snippets.text = snippets.text.substring(index);
				start += index;
				// reportsform/submit --> it doesn't work when typing "submit" and "/" was before
				// end += index;
			} else
				index = 0;

			snippets_cache.from = CodeMirror.Pos(cur.line, start);
			snippets_cache.to = CodeMirror.Pos(cur.line, end);

			if (snippets.text.length < 2 && snippets.text !== '#')
				snippets_cache.list = EMPTYARRAY;
			else {
				var arr = FUNC.snippets(FUNC.getext(mode.helperType || mode.name), snippets.text, tabs, cur.line, autocomplete, (end - snippets.text.length - tabs.length), snippets.line);
				arr.sort(autocomplete_sort);
				snippets_cache.list = arr.take(10);
			}

			return snippets_cache;
		}};

		can['+input'] = can['+delete'] = can.undo = can.redo = can.paste = can.cut = can.clear = true;

		editor.on('change', function(a, b) {

			if (config.disabled || !can[b.origin])
				return;

			setTimeout2(self.id, function() {

				var cur = editor.getCursor();
				var line = editor.getLine(cur.line);
				var index = fn.lastIndexOf(line, cur.ch, ' ', '>', '\t', ';', '.', '"', '\'', ')', '(', '<', ',');
				if (index !== -1) {
					var text = line.substring(index, cur.ch);
					if (text) {
						snippets.index = index;
						snippets.text = text;
						snippets.line = line;
						editor.showHint(snippetsoptions);
					}
				}

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
				rebuild(b.from.line);

			}, 200);

		});

		self.event('contextmenu', function(e) {
			e.preventDefault();
			e.stopPropagation();
			config.contextmenu && self.EXEC(config.contextmenu, e, editor);
		});

		editor.on('cursorActivity', function() {
			if (editor.state.linerruler)
				self.toggleruler(true);
		});

		self.toggleruler = function(islive) {

			if (!islive && editor.state.linerruler) {
				editor.state.linerruler = false;
				options.rulers[1].column = -20;
			} else {
				var cur = editor.getCursor();
				var line = editor.getLine(cur.line);
				var count = 0;
				for (var i = 0; i < cur.ch; i++) {
					if (line.charAt(i) === '\t')
						count++;
				}
				options.rulers[1].column = cur.ch + (count * 3);
				editor.state.linerruler = true;
			}

			editor.state.redrawrulers(editor);
		};
	};

	self.setter = function(value, path, type) {

		setTimeout2('EditorRebuild', rebuild_source, 500);
		editor.setValue(value || '');
		editor.refresh();

		setTimeout(function() {
			editor.refresh();
			editor.scrollTo(0, 0);
			type && editor.setCursor(0);
		}, 200);

		setTimeout(function() {
			editor.refresh();
		}, 1000);

		setTimeout(function() {
			editor.refresh();
		}, 2000);
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

		function validator(text, options) {
			if (!options.indent)    // JSHint error.character actually is a column index, this fixes underlining on lines using tabs for indentation
				options.indent = 1; // JSHint default value is 4
			JSHINT(text, options, options.globals);
			var errors = JSHINT.data().errors, result = [];
			if (errors)
				parseErrors(errors, result);
			return result;
		}

		CodeMirror.registerHelper('lint', 'javascript', validator);
		CodeMirror.registerHelper('lint', 'totaljs_server', validator);
		CodeMirror.registerHelper('lint', 'totaljs:server', validator);

		function parseErrors(errors, output) {
			for ( var i = 0; i < errors.length; i++) {
				var error = errors[i];
				if (error) {
					var start = error.character - 1;
					var hint = {
						message: error.reason,
						severity: error.code ? (error.code.startsWith('W') ? 'warning' : 'error') : 'error',
						from: CodeMirror.Pos(error.line - 1, start)
					};
					output.push(hint);
				}
			}
		}
	});

	// CodeMirror, copyright (c) by Marijn Haverbeke and others
	// Distributed under an MIT license: https://codemirror.net/LICENSE
	(function(mod) {
		mod(CodeMirror);
	})(function(CodeMirror) {

		var GUTTER_ID = 'CodeMirror-lint-markers';

		function showTooltip(e, content) {
			var tt = document.createElement('div');
			tt.className = 'CodeMirror-lint-tooltip';
			tt.appendChild(content.cloneNode(true));
			document.body.appendChild(tt);

			function position(e) {
				if (!tt.parentNode)
					return CodeMirror.off(document, 'mousemove', position);
				tt.style.top = Math.max(0, e.clientY - tt.offsetHeight - 5) + 'px';
				tt.style.left = (e.clientX + 5) + 'px';
			}

			CodeMirror.on(document, 'mousemove', position);
			position(e);
			if (tt.style.opacity != null)
				tt.style.opacity = 1;
			return tt;
		}

		function rm(elt) {
			if (elt.parentNode)
				elt.parentNode.removeChild(elt);
		}

		function hideTooltip(tt) {
			if (!tt.parentNode)
				return;
			if (tt.style.opacity == null)
				rm(tt);
			tt.style.opacity = 0;
			setTimeout(function() {
				rm(tt);
			}, 600);
		}

		function showTooltipFor(e, content, node) {
			var tooltip = showTooltip(e, content);
			function hide() {
				CodeMirror.off(node, 'mouseout', hide);
				if (tooltip) {
					hideTooltip(tooltip);
					tooltip = null;
				}
			}

			var poll = setInterval(function() {
				if (tooltip) {
					for (var n = node;; n = n.parentNode) {
						if (n && n.nodeType == 11)
							n = n.host;
						if (n == document.body)
							return;
						if (!n) {
							hide();
							break;
						}
					}
				}

				if (!tooltip)
					return clearInterval(poll);
			}, 400);
			CodeMirror.on(node, 'mouseout', hide);
		}

		function LintState(cm, options, hasGutter) {
			this.marked = [];
			this.options = options;
			this.timeout = null;
			this.hasGutter = hasGutter;
			this.onMouseOver = function(e) { onMouseOver(cm, e); };
			this.waitingFor = 0;
		}

		function parseOptions(_cm, options) {
			if (options instanceof Function)
				return { getAnnotations: options };
			if (!options || options === true)
				options = {};
			return options;
		}

		function clearMarks(cm) {
			var state = cm.state.lint;
			if (state.hasGutter)
				cm.clearGutter(GUTTER_ID);
			for (var i = 0; i < state.marked.length; ++i)
				state.marked[i].clear();
			state.marked.length = 0;
		}

		function makeMarker(labels, severity, multiple, tooltips) {
			var marker = document.createElement('div');
			var inner = marker;

			marker.className = 'fa CodeMirror-lint-marker-' + severity;
			// marker.title = labels.textContent;

			if (multiple) {
				inner = marker.appendChild(document.createElement('div'));
				inner.className = 'CodeMirror-lint-marker-multiple';
			}

			if (tooltips != false) {
				CodeMirror.on(inner, 'mouseover', function(e) {
					showTooltipFor(e, labels, inner);
				});
			}

			return marker;
		}

		function getMaxSeverity(a, b) {
			return a == 'error' ? a : b;
		}

		function groupByLine(annotations) {
			var lines = [];
			for (var i = 0; i < annotations.length; ++i) {
				var ann = annotations[i];
				var line = ann.from.line;
				(lines[line] || (lines[line] = [])).push(ann);
			}
			return lines;
		}

		function annotationTooltip(ann) {
			var severity = ann.severity;
			if (!severity)
				severity = 'error';
			var tip = document.createElement('div');
			if (typeof(ann.messageHTML) != 'undefined')
				tip.innerHTML = ann.messageHTML;
			else {
				var el = document.createElement('DIV');
				el.innerHTML = '<i class="fa fa-{0}"></i> '.format(severity === 'error' ? 'times-circle' : 'warning') + Thelpers.encode(ann.message);
				tip.appendChild(el);
			}
			return tip;
		}

		function lintAsync(cm, getAnnotations, passOptions) {
			var state = cm.state.lint;
			var id = ++state.waitingFor;

			function abort() {
				id = -1;
				cm.off('change', abort);
			}

			cm.on('change', abort);

			getAnnotations(cm.getValue(), function(annotations, arg2) {
				cm.off('change', abort);
				if (state.waitingFor != id)
					return;
				if (arg2 && annotations instanceof CodeMirror)
					annotations = arg2;
				cm.operation(function() {
					updateLinting(cm, annotations);
				});
			}, passOptions, cm);
		}

		function startLinting(cm) {
			var state = cm.state.lint;
			var options = state.options;

			/*
			* Passing rules in `options` property prevents JSHint (and other linters) from complaining
			* about unrecognized rules like `onUpdateLinting`, `delay`, `lintOnChange`, etc.
			*/
			var passOptions = options.options || options;
			var getAnnotations = options.getAnnotations || cm.getHelper(CodeMirror.Pos(0, 0), 'lint');
			if (!getAnnotations)
				return;

			if (options.async || getAnnotations.async)
				lintAsync(cm, getAnnotations, passOptions);
			else {
				var annotations = getAnnotations(cm.getValue(), passOptions, cm);
				if (!annotations)
					return;
				if (annotations.then) {
					annotations.then(function(issues) {
						cm.operation(function() {
							updateLinting(cm, issues);
						});
					});
				} else {
					cm.operation(function() {
						updateLinting(cm, annotations);
					});
				}
			}
		}

		function updateLinting(cm, annotationsNotSorted) {

			clearMarks(cm);
			var state = cm.state.lint;
			var options = state.options;
			var annotations = groupByLine(annotationsNotSorted);

			for (var line = 0; line < annotations.length; ++line) {
				var anns = annotations[line];
				if (!anns)
					continue;

				var maxSeverity = null;
				var tipLabel = state.hasGutter && document.createDocumentFragment();

				for (var i = 0; i < anns.length; ++i) {
					var ann = anns[i];
					var severity = ann.severity;
					if (!severity)
						severity = 'error';
					maxSeverity = getMaxSeverity(maxSeverity, severity);

					if (options.formatAnnotation)
						ann = options.formatAnnotation(ann);

					if (state.hasGutter)
						tipLabel.appendChild(annotationTooltip(ann));

					if (ann.to)
						state.marked.push(cm.markText(ann.from, ann.to, { className: 'CodeMirror-lint-mark-' + severity, __annotation: ann }));
				}

				if (state.hasGutter)
					cm.setGutterMarker(line, GUTTER_ID, makeMarker(tipLabel, maxSeverity, anns.length > 1, state.options.tooltips));
			}

			if (options.onUpdateLinting)
				options.onUpdateLinting(annotationsNotSorted, annotations, cm);
		}

		function onChange(cm) {
			var state = cm.state.lint;
			if (!state)
				return;
			clearTimeout(state.timeout);
			state.timeout = setTimeout(function() {
				startLinting(cm);
			}, state.options.delay || 500);
		}

		function popupTooltips(annotations, e) {
			var target = e.target || e.srcElement;
			var tooltip = document.createDocumentFragment();
			for (var i = 0; i < annotations.length; i++) {
				var ann = annotations[i];
				tooltip.appendChild(annotationTooltip(ann));
			}
			showTooltipFor(e, tooltip, target);
		}

		function onMouseOver(cm, e) {
			var target = e.target || e.srcElement;
			if (!/\bCodeMirror-lint-mark-/.test(target.className))
				return;
			var box = target.getBoundingClientRect(), x = (box.left + box.right) / 2, y = (box.top + box.bottom) / 2;
			var spans = cm.findMarksAt(cm.coordsChar({left: x, top: y}, 'client'));
			var annotations = [];
			for (var i = 0; i < spans.length; ++i) {
				var ann = spans[i].__annotation;
				if (ann)
					annotations.push(ann);
			}
			if (annotations.length)
				popupTooltips(annotations, e);
		}

		CodeMirror.defineOption('lint', false, function(cm, val, old) {

			if (old && old != CodeMirror.Init) {
				clearMarks(cm);
				if (cm.state.lint.options.lintOnChange !== false)
					cm.off('change', onChange);
				CodeMirror.off(cm.getWrapperElement(), 'mouseover', cm.state.lint.onMouseOver);
				clearTimeout(cm.state.lint.timeout);
				delete cm.state.lint;
			}

			if (val) {

				var gutters = cm.getOption('gutters');
				var hasLintGutter = false;

				for (var i = 0; i < gutters.length; ++i) {
					if (gutters[i] == GUTTER_ID)
						hasLintGutter = true;
				}

				var state = cm.state.lint = new LintState(cm, parseOptions(cm, val), hasLintGutter);
				if (state.options.lintOnChange !== false)
					cm.on('change', onChange);

				if (state.options.tooltips != false && state.options.tooltips != 'gutter')
					CodeMirror.on(cm.getWrapperElement(), 'mouseover', state.onMouseOver);
				startLinting(cm);
			}
		});

		CodeMirror.defineExtension('performLint', function() {
			if (this.state.lint)
				startLinting(this);
		});
	});

	CodeMirror.defineMode('totaljs', function(config) {
		var htmlbase = CodeMirror.getMode(config, 'text/html');
		var totaljsinner = CodeMirror.getMode(config, 'totaljs:inner');
		return CodeMirror.overlayMode(htmlbase, totaljsinner);
	});

	CodeMirror.defineMode('totaljs_server', function(config) {
		return CodeMirror.overlayMode(CodeMirror.getMode(config, 'text/javascript'), CodeMirror.getMode(config, 'totaljs:inner'));
	});

	CodeMirror.defineMode('totaljs:inner', function() {
		return {
			token: function(stream) {

				if (stream.match(/@\(.*?\)/, true))
					return 'variable-L';

				if (stream.match(/\{\{.*?\}\}/, true))
					return 'variable-A';

				if (stream.match(/ICON|NAME|UID|ID|CONFIG|CLASS|STATUS/, true))
					return 'variable-R';

				stream.next();
				return null;
			}
		};
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

			t.vert.node.style.display = needsV ? 'block' : 'none';
			t.horiz.node.style.display = needsH ? 'block' : 'none';

			if (needsV) {
				t.vert.update(measure.scrollHeight, measure.clientHeight, measure.viewHeight - (needsH ? width : 0));
				t.vert.node.style.bottom = needsH ? width + 'px' : '0';
			}

			if (needsH) {
				t.horiz.update(measure.scrollWidth, measure.clientWidth, measure.viewWidth - (needsV ? width : 0) - measure.barLeft);
				t.horiz.node.style.right = needsV ? width + 'px' : '0';
				t.horiz.node.style.left = measure.barLeft + 'px';
			}

			return {right: needsV ? width : 0, bottom: needsH ? width : 0};
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

	// CodeMirror, copyright (c) by Marijn Haverbeke and others
	// Distributed under an MIT license: https://codemirror.net/LICENSE
	(function(mod) {
		mod(CodeMirror);
	})(function(CodeMirror) {

		var HINT_ELEMENT_CLASS = 'CodeMirror-hint';
		var ACTIVE_HINT_ELEMENT_CLASS = 'CodeMirror-hint-active';

		// This is the old interface, kept around for now to stay
		// backwards-compatible.
		CodeMirror.showHint = function(cm, getHints, options) {

			if (!getHints)
				return cm.showHint(options);

			if (options && options.async)
				getHints.async = true;

			var newOpts = { hint: getHints };
			if (options) {
				for (var prop in options)
					newOpts[prop] = options[prop];
			}
			return cm.showHint(newOpts);
		};

		CodeMirror.defineExtension('showHint', function(options) {
			options = parseOptions(this, this.getCursor('start'), options);
			var selections = this.listSelections();
			if (selections.length > 1)
				return;

			// By default, don't allow completion when something is selected.
			// A hint function can have a `supportsSelection` property to
			// indicate that it can handle selections.
			if (this.somethingSelected()) {
				if (!options.hint.supportsSelection)
					return;
				// Don't try with cross-line selections
				for (var i = 0; i < selections.length; i++) {
					if (selections[i].head.line != selections[i].anchor.line)
						return;
				}
			}

			this.state.completionActive && this.state.completionActive.close();

			var completion = this.state.completionActive = new Completion(this, options);
			if (completion.options.hint) {
				CodeMirror.signal(this, 'startCompletion', this);
				completion.update(true);
			}
		});

		function Completion(cm, options) {
			var self = this;
			self.cm = cm;
			self.options = options;
			self.widget = null;
			self.debounce = 0;
			self.tick = 0;
			self.startPos = self.cm.getCursor('start');
			self.startLen = self.cm.getLine(self.startPos.line).length - self.cm.getSelection().length;

			cm.on('cursorActivity', self.activityFunc = function() {
				self.cursorActivity();
			});
		}

		var requestAnimationFrame = window.requestAnimationFrame || function(fn) {
			return setTimeout(fn, 1000/60);
		};

		var cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;

		Completion.prototype = {
			close: function(item) {
				if (this.active()) {
					this.cm.state.completionActive = null;
					this.tick = null;
					this.cm.off('cursorActivity', this.activityFunc);
					this.widget && this.data && CodeMirror.signal(this.data, 'close');
					this.widget && this.widget.close();
					CodeMirror.signal(this.cm, 'endCompletion', this.cm, item);
				}
			},

			active: function() {
				return this.cm.state.completionActive == this;
			},

			pick: function(data, i) {
				var completion = data.list[i];
				if (completion.hint)
					completion.hint(this.cm, data, completion);
				else
					this.cm.replaceRange(getText(completion), completion.to || data.to, completion.from || data.from, 'complete');
				CodeMirror.signal(data, 'pick', completion);
				this.close(completion);
			},

			cursorActivity: function() {

				if (this.debounce) {
					cancelAnimationFrame(this.debounce);
					this.debounce = 0;
				}

				var pos = this.cm.getCursor();
				var line = this.cm.getLine(pos.line);
				if (pos.line != this.startPos.line || line.length - pos.ch != this.startLen - this.startPos.ch || pos.ch < this.startPos.ch || this.cm.somethingSelected() || (!pos.ch || this.options.closeCharacters.test(line.charAt(pos.ch - 1)))) {
					this.close();
				} else {
					var self = this;
					this.debounce = requestAnimationFrame(function() {
						self.update();
					});
					this.widget && this.widget.disable();
				}
			},

			update: function(first) {
				if (this.tick == null)
					return;
				var self = this;
				var myTick = ++this.tick;
				fetchHints(this.options.hint, this.cm, this.options, function(data) {
					if (self.tick == myTick)
						self.finishUpdate(data, first);
				});
			},

			finishUpdate: function(data, first) {
				if (this.data)
					CodeMirror.signal(this.data, 'update');

				var picked = (this.widget && this.widget.picked) || (first && this.options.completeSingle);
				this.widget && this.widget.close();
				this.data = data;

				if (data && data.list.length) {
					if (picked && data.list.length == 1) {
						this.pick(data, 0);
					} else {
						this.widget = new Widget(this, data);
						CodeMirror.signal(data, 'shown');
					}
				}
			}
		};

		function parseOptions(cm, pos, options) {
			var editor = cm.options.hintOptions;
			var out = {};
			for (var prop in defaultOptions)
				out[prop] = defaultOptions[prop];
			if (editor)
				for (var prop in editor) {
					if (editor[prop] !== undefined)
						out[prop] = editor[prop];
				}
			if (options)
				for (var prop in options) {
					if (options[prop] !== undefined)
						out[prop] = options[prop];
				}

			if (out.hint.resolve)
				out.hint = out.hint.resolve(cm, pos);

			return out;
		}

		function getText(completion) {
			return typeof completion == 'string' ? completion : completion.text;
		}

		function buildKeyMap(completion, handle) {
			var baseMap = {
				Up: function() {
					handle.moveFocus(-1);
				},
				Down: function() {
					handle.moveFocus(1);
				},
				PageUp: function() {
					handle.moveFocus(-handle.menuSize() + 1, true);
				},
				PageDown: function() {
					handle.moveFocus(handle.menuSize() - 1, true);
				},
				Home: function() {
					handle.setFocus(0);
				},
				End: function() {
					handle.setFocus(handle.length - 1);
				},
				Enter: handle.pick,
				Tab: handle.pick,
				Esc: handle.close
			};

			var custom = completion.options.customKeys;
			var ourMap = custom ? {} : baseMap;

			function addBinding(key, val) {
				var bound;
				if (typeof val != 'string')
					bound = function(cm) {
						return val(cm, handle);
					};
				else if (baseMap.hasOwnProperty(val)) // This mechanism is deprecated
					bound = baseMap[val];
				else
					bound = val;
				ourMap[key] = bound;
			}

			if (custom) {
				for (var key in custom) {
					if (custom.hasOwnProperty(key))
						addBinding(key, custom[key]);
				}
			}

			var extra = completion.options.extraKeys;
			if (extra) {
				for (var key in extra)
					extra.hasOwnProperty(key) && addBinding(key, extra[key]);
			}
			return ourMap;
		}

		function getHintElement(hintsElement, el) {
			while (el && el != hintsElement) {
				if (el.nodeName.toUpperCase() === 'LI' && el.parentNode == hintsElement)
					return el;
				el = el.parentNode;
			}
		}

		function Widget(completion, data) {

			this.completion = completion;
			this.data = data;
			this.picked = false;
			var widget = this, cm = completion.cm;
			var ownerDocument = cm.getInputField().ownerDocument;
			var parentWindow = ownerDocument.defaultView || ownerDocument.parentWindow;
			var hints = this.hints = ownerDocument.createElement('ul');
			var theme = completion.cm.options.theme;
			hints.className = 'CodeMirror-hints ' + theme;
			this.selectedHint = data.selectedHint || 0;

			var completions = data.list;
			for (var i = 0; i < completions.length; ++i) {
				var elt = hints.appendChild(ownerDocument.createElement('li')), cur = completions[i];
				var className = HINT_ELEMENT_CLASS + (i != this.selectedHint ? '' : ' ' + ACTIVE_HINT_ELEMENT_CLASS);
				if (cur.className != null)
					className = cur.className + ' ' + className;
				elt.className = className;
				if (cur.render)
					cur.render(elt, data, cur);
				else
					elt.innerHTML = cur.displayText || getText(cur);
				elt.hintId = i;
			}

			var pos = cm.cursorCoords(completion.options.alignWithWord ? data.from : null);
			var left = pos.left;
			var top = pos.bottom;
			var below = true;

			hints.style.left = left + 'px';
			hints.style.top = top + 'px';
			// If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
			var winW = parentWindow.innerWidth || Math.max(ownerDocument.body.offsetWidth, ownerDocument.documentElement.offsetWidth);
			var winH = parentWindow.innerHeight || Math.max(ownerDocument.body.offsetHeight, ownerDocument.documentElement.offsetHeight);
			(completion.options.container || ownerDocument.body).appendChild(hints);
			var box = hints.getBoundingClientRect(), overlapY = box.bottom - winH;
			var scrolls = hints.scrollHeight > hints.clientHeight + 1;
			var startScroll = cm.getScrollInfo();

			if (overlapY > 0) {
				var height = box.bottom - box.top;
				var curTop = pos.top - (pos.bottom - box.top);
				if (curTop - height > 0) { // Fits above cursor
					hints.style.top = (top = pos.top - height) + 'px';
					below = false;
				} else if (height > winH) {
					hints.style.height = (winH - 5) + 'px';
					hints.style.top = (top = pos.bottom - box.top) + 'px';
					var cursor = cm.getCursor();
					if (data.from.ch != cursor.ch) {
						pos = cm.cursorCoords(cursor);
						hints.style.left = (left = pos.left) + 'px';
						box = hints.getBoundingClientRect();
					}
				}
			}

			var overlapX = box.right - winW;
			if (overlapX > 0) {
				if (box.right - box.left > winW) {
					hints.style.width = (winW - 5) + 'px';
					overlapX -= (box.right - box.left) - winW;
				}
				hints.style.left = (left = pos.left - overlapX) + 'px';
			}

			if (scrolls) {
				for (var node = hints.firstChild; node; node = node.nextSibling)
					node.style.paddingRight = cm.display.nativeBarWidth + 'px';
			}

			cm.addKeyMap(this.keyMap = buildKeyMap(completion, {
				moveFocus: function(n, avoidWrap) {
					widget.changeActive(widget.selectedHint + n, avoidWrap);
				},
				setFocus: function(n) {
					widget.changeActive(n);
				},
				menuSize: function() {
					return widget.screenAmount();
				},
				length: completions.length,
				close: function() {
					completion.close();
				},
				pick: function() {
					widget.pick();
				},
				data: data
			}));

			if (completion.options.closeOnUnfocus) {
				var closingOnBlur;
				cm.on('blur', this.onBlur = function() {
					closingOnBlur = setTimeout(function() {
						completion.close();
					}, 100);
				});
				cm.on('focus', this.onFocus = function() {
					clearTimeout(closingOnBlur);
				});
			}

			cm.on('scroll', this.onScroll = function() {
				var curScroll = cm.getScrollInfo();
				var editor = cm.getWrapperElement().getBoundingClientRect();
				var newTop = top + startScroll.top - curScroll.top;
				var point = newTop - (parentWindow.pageYOffset || (ownerDocument.documentElement || ownerDocument.body).scrollTop);
				if (!below)
					point += hints.offsetHeight;
				if (point <= editor.top || point >= editor.bottom)
					return completion.close();
				hints.style.top = newTop + 'px';
				hints.style.left = (left + startScroll.left - curScroll.left) + 'px';
			});

			CodeMirror.on(hints, 'dblclick', function(e) {
				var t = getHintElement(hints, e.target || e.srcElement);
				if (t && t.hintId != null) {
					widget.changeActive(t.hintId);
					widget.pick();
				}
			});

			CodeMirror.on(hints, 'click', function(e) {
				var t = getHintElement(hints, e.target || e.srcElement);
				if (t && t.hintId != null) {
					widget.changeActive(t.hintId);
					completion.options.completeOnSingleClick && widget.pick();
				}
			});

			CodeMirror.on(hints, 'mousedown', function() {
				setTimeout(function() {
					cm.focus();
				}, 20);
			});

			CodeMirror.signal(data, 'select', completions[this.selectedHint], hints.childNodes[this.selectedHint]);
			return true;
		}

		Widget.prototype = {
			close: function() {
				if (this.completion.widget != this)
					return;
				this.completion.widget = null;
				this.hints.parentNode.removeChild(this.hints);
				this.completion.cm.removeKeyMap(this.keyMap);
				var cm = this.completion.cm;
				if (this.completion.options.closeOnUnfocus) {
					cm.off('blur', this.onBlur);
					cm.off('focus', this.onFocus);
				}
				cm.off('scroll', this.onScroll);
			},

			disable: function() {
				this.completion.cm.removeKeyMap(this.keyMap);
				var widget = this;
				this.keyMap = { Enter: function() {
					widget.picked = true;
				}};
				this.completion.cm.addKeyMap(this.keyMap);
			},

			pick: function() {
				this.completion.pick(this.data, this.selectedHint);
			},

			changeActive: function(i) {
				if (i >= this.data.list.length) {
					this.completion.close();
					this.data.from.line++;
					this.completion.cm.setCursor(this.data.from);
					return;
				} else if (i < 0) {
					this.completion.close();
					this.data.from.line--;
					this.completion.cm.setCursor(this.data.from);
					return;
				}
				if (this.selectedHint == i)
					return;
				var node = this.hints.childNodes[this.selectedHint];
				if (node)
					node.className = node.className.replace(' ' + ACTIVE_HINT_ELEMENT_CLASS, '');
				node = this.hints.childNodes[this.selectedHint = i];
				node.className += ' ' + ACTIVE_HINT_ELEMENT_CLASS;
				if (node.offsetTop < this.hints.scrollTop)
					this.hints.scrollTop = node.offsetTop - 3;
				else if (node.offsetTop + node.offsetHeight > this.hints.scrollTop + this.hints.clientHeight)
					this.hints.scrollTop = node.offsetTop + node.offsetHeight - this.hints.clientHeight + 3;
				CodeMirror.signal(this.data, 'select', this.data.list[this.selectedHint], node);
			},

			screenAmount: function() {
				return Math.floor(this.hints.clientHeight / this.hints.firstChild.offsetHeight) || 1;
			}
		};

		function applicableHelpers(cm, helpers) {
			if (!cm.somethingSelected())
				return helpers;
			var result = [];
			for (var i = 0; i < helpers.length; i++)
				if (helpers[i].supportsSelection)
					result.push(helpers[i]);
			return result;
		}

		function fetchHints(hint, cm, options, callback) {
			if (hint.async) {
				hint(cm, callback, options);
			} else {
				var result = hint(cm, options);
				if (result && result.then)
					result.then(callback);
				else
					callback(result);
			}
		}

		function resolveAutoHints(cm, pos) {

			var helpers = cm.getHelpers(pos, 'hint');
			var words;

			if (helpers.length) {
				var resolved = function(cm, callback, options) {
					var app = applicableHelpers(cm, helpers);
					function run(i) {
						if (i == app.length)
							return callback(null);
						fetchHints(app[i], cm, options, function(result) {
							if (result && result.list.length > 0)
								callback(result);
							else
								run(i + 1);
						});
					}
					run(0);
				};

				resolved.async = true;
				resolved.supportsSelection = true;
				return resolved;
			} else if (words = cm.getHelper(cm.getCursor(), 'hintWords')) {
				return function(cm) {
					return CodeMirror.hint.fromList(cm, { words: words });
				};
			} else if (CodeMirror.hint.anyword) {
				return function(cm, options) {
					return CodeMirror.hint.anyword(cm, options);
				};
			} else {
				return function() {};
			}
		}

		CodeMirror.registerHelper('hint', 'auto', { resolve: resolveAutoHints });
		CodeMirror.registerHelper('hint', 'fromList', function(cm, options) {

			var cur = cm.getCursor();
			var token = cm.getTokenAt(cur);
			var term;
			var f = CodeMirror.Pos(cur.line, token.start);
			var to = cur;

			if (token.start < cur.ch && /\w/.test(token.string.charAt(cur.ch - token.start - 1))) {
				term = token.string.substr(0, cur.ch - token.start);
			} else {
				term = '';
				f = cur;
			}

			var found = [];
			for (var i = 0; i < options.words.length; i++) {
				var word = options.words[i];
				if (word.slice(0, term.length) == term)
					found.push(word);
			}

			if (found.length)
				return { list: found, from: f, to: to };
		});

		CodeMirror.commands.autocomplete = CodeMirror.showHint;

		var defaultOptions = {
			hint: CodeMirror.hint.auto,
			completeSingle: true,
			alignWithWord: true,
			closeCharacters: /[\s()[]{};:>,\/"]/,
			closeOnUnfocus: true,
			completeOnSingleClick: true,
			container: null,
			customKeys: null,
			extraKeys: null
		};

		CodeMirror.defineOption('hintOptions', null);
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

	!function(t){"object"==typeof exports&&"object"==typeof module?t(require("../../lib/codemirror")):"function"==typeof define&&define.amd?define(["../../lib/codemirror"],t):t(CodeMirror)}(function(r){var s=/MSIE \d/.test(navigator.userAgent)&&(null==document.documentMode||document.documentMode<8),k=r.Pos,p={"(":")>",")":"(<","[":"]>","]":"[<","{":"}>","}":"{<","<":">>",">":"<<"};function v(t){return t&&t.bracketRegex||/[(){}[\]]/}function u(t,e,n){var r=t.getLineHandle(e.line),i=e.ch-1,a=n&&n.afterCursor;null==a&&(a=/(^| )cm-fat-cursor($| )/.test(t.getWrapperElement().className));var c=v(n),o=!a&&0<=i&&c.test(r.text.charAt(i))&&p[r.text.charAt(i)]||c.test(r.text.charAt(i+1))&&p[r.text.charAt(++i)];if(!o)return null;var l=">"==o.charAt(1)?1:-1;if(n&&n.strict&&0<l!=(i==e.ch))return null;var h=t.getTokenTypeAt(k(e.line,i+1)),s=f(t,k(e.line,i+(0<l?1:0)),l,h||null,n);return null==s?null:{from:k(e.line,i),to:s&&s.pos,match:s&&s.ch==o.charAt(0),forward:0<l}}function f(t,e,n,r,i){for(var a=i&&i.maxScanLineLength||1e4,c=i&&i.maxScanLines||1e3,o=[],l=v(i),h=0<n?Math.min(e.line+c,t.lastLine()+1):Math.max(t.firstLine()-1,e.line-c),s=e.line;s!=h;s+=n){var u=t.getLine(s);if(u){var f=0<n?0:u.length-1,m=0<n?u.length:-1;if(!(u.length>a))for(s==e.line&&(f=e.ch-(n<0?1:0));f!=m;f+=n){var g=u.charAt(f);if(l.test(g)&&(void 0===r||t.getTokenTypeAt(k(s,f+1))==r)){var d=p[g];if(d&&">"==d.charAt(1)==0<n)o.push(g);else{if(!o.length)return{pos:k(s,f),ch:g};o.pop()}}}}}return s-n!=(0<n?t.lastLine():t.firstLine())&&null}function e(t,e,n){for(var r=t.state.matchBrackets.maxHighlightLineLength||1e3,i=[],a=t.listSelections(),c=0;c<a.length;c++){var o=a[c].empty()&&u(t,a[c].head,n);if(o&&t.getLine(o.from.line).length<=r){var l=o.match?"CodeMirror-matchingbracket":"CodeMirror-nonmatchingbracket";i.push(t.markText(o.from,k(o.from.line,o.from.ch+1),{className:l})),o.to&&t.getLine(o.to.line).length<=r&&i.push(t.markText(o.to,k(o.to.line,o.to.ch+1),{className:l}))}}if(i.length){s&&t.state.focused&&t.focus();function h(){t.operation(function(){for(var t=0;t<i.length;t++)i[t].clear()})}if(!e)return h;setTimeout(h,800)}}function i(t){t.operation(function(){t.state.matchBrackets.currentlyHighlighted&&(t.state.matchBrackets.currentlyHighlighted(),t.state.matchBrackets.currentlyHighlighted=null),t.state.matchBrackets.currentlyHighlighted=e(t,!1,t.state.matchBrackets)})}r.defineOption("matchBrackets",!1,function(t,e,n){n&&n!=r.Init&&(t.off("cursorActivity",i),t.state.matchBrackets&&t.state.matchBrackets.currentlyHighlighted&&(t.state.matchBrackets.currentlyHighlighted(),t.state.matchBrackets.currentlyHighlighted=null)),e&&(t.state.matchBrackets="object"==typeof e?e:{},t.on("cursorActivity",i))}),r.defineExtension("matchBrackets",function(){e(this,!0)}),r.defineExtension("findMatchingBracket",function(t,e,n){return!n&&"boolean"!=typeof e||(e=n?(n.strict=e,n):e?{strict:!0}:null),u(this,t,e)}),r.defineExtension("scanForBracket",function(t,e,n,r){return f(this,t,e,n,r)})});

	next();
}]);

FUNC.snippets = function(type, text, tabs, line, words, chplus, linestr) {

	var arr = [];
	var cache = {};
	var tmp;

	// for (var i = 0; i < designer.autocomplete.length; i++) {
	// 	var item = designer.autocomplete[i];
	// 	if (item.name.indexOf(text) !== -1)
	// 		arr.push({ displayText: item.name, text: item.name, ch: chplus, line: line, priority: 0 });
	// }

	for (var i = 0; i < SNIPPETS.length; i++) {
		var snip = SNIPPETS[i];

		if ((!snip.type || snip.type === type) && (snip.search.indexOf(text) !== -1 && (snip.search !== text || text.charAt(0) === '-'))) {

			tmp = '';

			if (snip.special === 1) {
				if (linestr && linestr.indexOf('(') !== -1 && linestr.indexOf(')') === -1)
					tmp = ');';
			}

			tmp = snip.code.format(tabs || '', snip.search === 'NEWSCHEMA' ? (name.substring(0, 1).toUpperCase() + name.substring(1).replace(/-(\w)/, function(text) {
				return '/' + text.substring(1).toUpperCase();
			})) : name) + (tmp ? tmp : '');
			if (!cache[tmp]) {
				cache[tmp] = 1;
				arr.push({ displayText: snip.text, text: tmp, ch: (snip.line ? snip.ch + tabs.length : tabs.length === 0 ? snip.ch - 1 : snip.ch + tabs.length - 1) + chplus, line: line + (snip.line || 0), priority: snip.priority });
			}
		}
	}

	if (words && words.length) {
		for (var i = 0; i < words.length; i++) {
			var snip = words[i];
			if (cache[snip.code])
				continue;
			if (snip.search.indexOf(text) !== -1 && snip.search !== text) {
				cache[snip.code] = 1;
				arr.push({ displayText: snip.html || snip.text, text: snip.code, ch: snip.code.length + tabs.length + chplus, line: line, priority: -100 });
			}
		}
	}

	/*
	var count = 0;

	for (var i = 0; i < code.data.files.length; i++) {
		var file = code.data.files[i];
		if (file.substring(0, 8) === '/public/') {
			var path = file.substring(7);
			if (path.indexOf(text) !== -1) {
				if (count++ > 10)
					break;
				arr.push({ displayText: '<i class="far fa-file mr5"></i>' + path, text: path, ch: path.length + tabs.length + chplus, line: line });
			}
		}
	}*/

	return arr;
};

FUNC.getext = function(syntax) {
	switch (syntax) {
		case 'totaljs':
		case 'text/html':
		case 'html':
			return 'html';
		case 'application/x-httpd-php':
		case 'php':
			return 'php';
		case 'javascript':
		case 'js':
			return 'js';
		case 'text/css':
		case 'css':
			return 'css';
		case 'text/x-csrc':
		case 'text/x-c++src':
		case 'cpp':
			return 'cpp';
		case 'text/x-sql':
		case 'sql':
			return 'sql';
		case 'application/ld+json':
		case 'application/json':
		case 'text/json':
		case 'json':
			return 'json';
		case 'text/x-cython':
		case 'python':
		case 'py':
			return 'python';
		case 'text/x-sh':
		case 'bash':
		case 'sh':
			return 'bash';
		case 'text/x-sass':
		case 'sass':
			return 'sass';
		case 'text/x-yaml':
		case 'yaml':
			return 'yaml';
		case 'application/xml':
		case 'text/xml':
		case 'xml':
			return 'xml';
	}
	return 'plain';
};

SNIPPETS.push({ type: 'js', search: 'AUTH', text: '<b>AUTH</b>', code: 'AUTH(function($) {\n\t{0}$.success(USER_PROFILE);\n{0}});', ch: 30 });
// SNIPPETS.push({ type: 'js', search: 'NEWSCHEMA', text: '<b>NEWSCHEMA</b>', code: 'NEWSCHEMA(\'{1}\', function(schema) {\n\t{0}schema.define(\'key\', String, true);\n{0}});', ch: 12 });
// SNIPPETS.push({ type: 'js', search: 'NEWOPERATION', text: '<b>NEWOPERATION</b>', code: 'NEWOPERATION(\'\', function($, value) {\n\t{0}\n{0}});', ch: 15 });
// SNIPPETS.push({ type: 'js', search: 'NEWTASK', text: '<b>NEWTASK</b>', code: 'NEWTASK(\'{1}\', function(push) {\n\n\t{0}push(\'TASK_NAME_1\', function($, value) {\n\t\t{0}$.next(\'TASK_NAME_2\');\n\t{0}});\n\n\t{0}push(\'TASK_NAME_2\', function($, value) {\n\t\t{0}$.end();\n\t{0}});\n\n{0}});', ch: 10 });
SNIPPETS.push({ type: 'js', search: 'NEWCOMMAND', text: '<b>NEWCOMMAND</b>', code: 'NEWCOMMAND(\'\', function() {\n\t{0}\n{0}});', ch: 13 });
SNIPPETS.push({ type: 'js', search: 'EXEC', text: '<b>EXEC</b>', code: 'EXEC(\'\', model, function(err, response) {\n\t{0}\n{0}});', ch: 6 });
SNIPPETS.push({ type: 'js', search: 'for var', text: '<b>for in</b>', code: 'for (var i = 0; i < .length; i++)', ch: 21, priority: 10 });
SNIPPETS.push({ type: 'js', search: 'foreach forEach', text: '<b>forEach</b>', code: 'forEach(function(item) {\n{0}});', ch: 30, priority: 1 });
SNIPPETS.push({ type: 'js', search: '$.invalid', text: '<b>$.invalid()</b>', code: 'if (err) {\n\t{0}$.invalid(err);\n\t{0}return;\n{0}}', ch: 30 });
SNIPPETS.push({ type: 'js', search: 'callback', text: '<b>callback</b>', code: 'callback', ch: 9, priority: 1 });
SNIPPETS.push({ type: 'js', search: 'callback function', text: '<b>function() {</b>', code: 'function() {\n\t{0}\n{0}}', ch: 30, priority: 1, special: 1 });
SNIPPETS.push({ type: 'js', search: 'callback function', text: '<b>function(err, response) {</b>', code: 'function(err, response) {\n\t{0}\n{0}}', ch: 30, priority: 1, special: 1 });
SNIPPETS.push({ type: 'js', search: 'callback function', text: '<b>function(response) {</b>', code: 'function(response) {\n\t{0}\n{0}}', ch: 30, priority: 1, special: 1 });
SNIPPETS.push({ type: 'js', search: 'callback function', text: '<b>function(item, next) {</b>', code: 'function(item, next) {\n\t{0}\n{0}}', ch: 30, priority: 1, special: 1 });
SNIPPETS.push({ type: 'js', search: 'callback function', text: '<b>function($) {</b>', code: 'function($) {\n\t{0}\n{0}}', ch: 30, priority: 1, special: 1 });
SNIPPETS.push({ type: 'js', search: 'Object.keys', text: '<b>Object.keys</b>', code: 'Object.keys()', ch: 13, priority: 1 });
SNIPPETS.push({ type: 'js', search: 'schema.middleware', text: '<b>schema.middleware</b>', code: 'schema.middleware(function($, next) {\n\t{0}\n{0}});', ch: 2, line: 1, priority: 1 });
SNIPPETS.push({ type: 'js', search: 'MERGE', text: '<b>MERGE</b>', code: 'MERGE(\'\', \'\');', ch: 8 });
SNIPPETS.push({ type: 'js', search: 'ROUTE', text: '<b>ROUTE</b>', code: 'ROUTE(\'\', \'\');', ch: 8 });
SNIPPETS.push({ type: 'js', search: 'WEBSOCKET', text: '<b>WEBSOCKET</b>', code: 'WEBSOCKET(\'\', action, [\'json\']);', ch: 12 });
SNIPPETS.push({ type: 'js', search: 'LOCALIZE', text: '<b>LOCALIZE</b>', code: 'LOCALIZE(\'\', \'\');', ch: 11 });
SNIPPETS.push({ type: 'js', search: 'exports.install', text: '<b>exports.install</b>', code: 'exports.install = function() {\n\t{0}\n{0}};', ch: 2, line: 1 });
SNIPPETS.push({ type: 'js', search: 'console.log', text: '<b>console.log</b>', code: 'console.log();', ch: 13 });
SNIPPETS.push({ type: 'js', search: 'console.warn', text: '<b>console.warn</b>', code: 'console.warn();', ch: 14 });
SNIPPETS.push({ type: 'js', search: 'console.error', text: '<b>console.error</b>', code: 'console.error();', ch: 15 });
SNIPPETS.push({ type: 'js', search: 'null', text: '<b>null</b>', code: 'null', ch: 5 });
SNIPPETS.push({ type: 'js', search: 'undefined', text: '<b>undefined</b>', code: 'undefined', ch: 10, priority: -1 });
SNIPPETS.push({ type: 'js', search: 'setImmediate', text: 'setImmediate', code: 'setImmediate()', ch: 13, priority: -1 });
SNIPPETS.push({ type: 'js', search: 'EMPTYARRAY', text: 'EMPTYARRAY', code: 'EMPTYARRAY', ch: 11 });
SNIPPETS.push({ type: 'js', search: 'EMPTYOBJECT', text: 'EMPTYOBJECT', code: 'EMPTYOBJECT', ch: 12 });
SNIPPETS.push({ type: 'js', search: '$.ip', text: '$.ip', code: '$.ip', ch: 4 });
SNIPPETS.push({ type: 'js', search: '$.user', text: '$.user', code: '$.user', ch: 6 });
SNIPPETS.push({ type: 'js', search: '$.req', text: '$.req', code: '$.req', ch: 5 });
SNIPPETS.push({ type: 'js', search: '$.res', text: '$.res', code: '$.res', ch: 5 });
SNIPPETS.push({ type: 'js', search: '$.success()', text: '$.success()', code: '$.success()', ch: 7 });
SNIPPETS.push({ type: 'js', search: '$.invalid()', text: '$.invalid()', code: '$.invalid()', ch: 7 });

SNIPPETS.push({ search: 'openplatformid', text: 'openplatformid', code: 'openplatformid', ch: 15 });
SNIPPETS.push({ search: 'encodeURIComponent', text: 'encodeURIComponent', code: 'encodeURIComponent', ch: 19 });
SNIPPETS.push({ search: 'decodeURIComponent', text: 'decodeURIComponent', code: 'decodeURIComponent', ch: 19 });
SNIPPETS.push({ search: 'componentator', text: 'componentator', code: 'componentator', ch: 14 });
SNIPPETS.push({ search: 'RESTBuilder', text: 'RESTBuilder', code: 'RESTBuilder', ch: 12 });
SNIPPETS.push({ search: 'exports.', text: 'exports.', code: 'exports.', ch: 9 });
SNIPPETS.push({ search: 'controller', text: 'controller', code: 'controller', ch: 10 });
SNIPPETS.push({ search: 'response', text: 'response', code: 'response', ch: 9 });
SNIPPETS.push({ search: 'self', text: 'self', code: 'self', ch: 5 });
SNIPPETS.push({ search: 'invalid', text: 'invalid', code: 'invalid', ch: 8 });
SNIPPETS.push({ search: 'schema', text: 'schema', code: 'schema', ch: 7 });
SNIPPETS.push({ search: 'language', text: 'language', code: 'language', ch: 9 });

(function() {
	for (var i = 0; i < SNIPPETS.length; i++) {
		if (!SNIPPETS[i].priority)
			SNIPPETS[i].priority = 10;
	}
})();