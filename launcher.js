var GUI;
const Close = function () { window.close(); }
const Menu_Boilerplate = [{}, {}, {
	'n': {
		Name: 'New File',
		Function: () => IPC.File_New().then(R => R ? Close() : false)
	},
	'o': {
		Name: 'Open File',
		Function: () => IPC.File_Open().then(R => {R ? Close() : false})
	}
}, {}, [{
	Name: 'Formica Project Manager'
}, {
	Name: 'created by CJ Macbeth'
}]];
const Menu = new MGUI.Menu(...Menu_Boilerplate);
const init = function () {
	GUI = new MGUI(document.getElementById('Menu'));
	GUI.Navigate(Menu);
}
