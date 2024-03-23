const Element_Template = function (Options) {
	let Shell = document.createElement(Options.Type ? Options.Type : 'div');
	if (typeof Options.Class == 'string') Shell.setAttribute('class', Options.Class);
	else if(Array.isArray(Options.Class)) Options.Class.forEach(Class => Shell.classList.add(Class));
	if (Options.Click) Shell.onclick = Options.Click;
	if (Options.Listeners) for (let Key in Options.Listeners) Shell.addEventListener(Key, Options.Listeners[Key]);
	if (Options.Attributes) for (let Key in Options.Attributes) Shell.setAttribute(Key, Options.Attributes[Key]);
	if (typeof Options.In == 'string') Shell.innerHTML += Options.In;
	else if (Options.In instanceof HTMLElement) Shell.appendChild(Options.In);
	else if (Array.isArray(Options.In)) Options.In.filter(In => In !== null).forEach(In => {
		if (In instanceof HTMLElement) Shell.appendChild(In);
		else Shell.innerHTML += In;
	});
	if (Options.Value) Shell.value = Options.Value;
	if (Options.Parent) Options.Parent.appendChild(Shell);
	return Shell;
}
if(typeof module!=="undefined"&&module.exports)module.exports=Element_Template;
