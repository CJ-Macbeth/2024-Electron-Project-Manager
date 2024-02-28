var GUI, File;
const Menu_Boilerplate = [{}, {}, {
	'n': {
		Name: 'New File',
		Function: IPC.File_New
	},
	'o': {
		Name: 'Open File',
		Function: IPC.File_Open
	}
}, {}, [{
	Name: '2024 Electron Project Manager'
}, {
	Name: 'created by CJ Macbeth'
}]];
const Menu = new MGUI.Menu(...Menu_Boilerplate);
const init = async function () {
	GUI = new MGUI(document.getElementById('Menu'));
	GUI.Navigate(Menu);
	let Data = await IPC_Load();
	File = new Project(document.getElementById('Workspace'), Data);
}
