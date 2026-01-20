global.PREF = MEMORIZE('preferences');

(function() {
	for (let key in Total.plugins) {
		let item = Total.plugins[key];
		if (item.config) {
			for (let m of item.config) {
				if (CONF[m.id] == null)
					CONF[m.id] = m.value;
			}
		}
	}
})();

ON('ready', function() {

	// UI components
	COMPONENTATOR('ui', 'errorhandler,exec,title,console2,code,hashchange,searchinput,columns,virtualwire,viewbox,websocket,part,loading,page,validation,search,selected,animation,layout,markdown,approve,notifybar,menu,importer,form,input,shortcuts,message,clipboard,textboxlist,textarea,colorpicker,datepicker,timepicker,floatinginput,empty,keyvalue,paste,directory,checkbox,floatingbox,floatingsearch,properties2,togglebutton,wysiwyg,fileuploader,tooltip,configuration,audio,progress,miniform,notify,validate,box,watcher,edit,intro,autoexec,inlinedatepicker,enter,parts,noscrollbar,windows,ready,autofill,choose,locale,listform,tabmenu,loadcontent,uibuilder,icons,filereader,intranetcss,objecttree,tangular-filesize,tangular-counter,tangular-jsonformat,selection,inlineproperties,flow,controls,filesaver,dropfiles,movable,spotlight,uistudio,prompt,imageviewer,tangular-rgba,datasource,cl,autocomplete,changer,Tangular-autoformat,clbind,datagrid,remember', true);

	// Ready, start all stuff
	EMIT('start');

	// Due to plugins
	EMIT('reload');

});
