// -- use this.Slidelock
// -- save mode as node variable
// -- mgui: select mode
// -- mgui: det current as default mode - if not already
// -- HTMLS where necessary (links and notes and statements)
// 
// FUNC FOR SLIDE
// -> child new
// -> child enter
// -> child move
// -> child remove
// -> child cut/copy
// -> child paste
// -> link new
// -> link modify
// -> link move
// -> link remove
// -> note new
// -> note modify
// -> note move
// -> note remove
// -> whiteboard new
// -- mode enter
// -- mode set default
// -- mode checklist
// -- mode kanban
// -- mode tasklist
// -- whiteboard enter (delete from inside)
// -- whiteboards
//
// -- treat isolated child loops as orphans
//
const Tab = function (File, Container, GUI) {
	this.File = File;
	this.Container = Container;
	this.GUI = GUI;
	this.Chain = [];
	this.Options = new Map();
	this.Menu_Setup();
	this.Slidelock = false;
	this.Navigate(this.File.Data[0]);
	this.Draw();
}
Tab.prototype.Navigate = function (Node, Ignore) {
	if (Node == this.Node) return;
	//if (!Ignore && Node === false) this.GUI.Navigate(false);
	if (!Node) {
		if (this.Chain.length > 0) this.Node = this.Chain.pop();
		else this.Node = this.File.Data[0];
		//if (!Ignore) this.GUI.Navigate(false);
	} else {
		if (this.Node) this.Chain.push(this.Node);
		this.Node = this.File.Identify_Node(Node);
	}
	if (!this.Options.has(this.Node)) this.Options.set(this.Node, Object.create(null));
}
Tab.prototype.Draw = function () {
	this.Container.innerHTML = '';
	if (!this.Options.has(this.Node)) this.Options.set(this.Node, Object.create(null));
	let Mode = this.Options.get(this.Node).Mode;
	if (!this.Slidelock && Mode) switch (Mode) {
		case 'Kanban':
			this.Draw_Kanban();
			break;
		case 'Checklist':
			this.Draw_Checklist();
			break;
		case 'Tasklist':
			this.Draw_Tasklist();
			break;
		default:
			this.Draw_Slide();
	} else this.Draw_Slide();
}
Tab.prototype.Draw_Slide = function (Dunk) {
	let Options = this.Options.get(this.Node);
	if (!this.Options.has('Slide')) this.Options.set('Slide', Object.create(null));
	if (!Options.Slide) Options.Slide = Object.create(null);
	let Draw_Node = (Node, Active, Full) => {
		let Slide_Node = document.createElement('div');
		Slide_Node.classList.add('Slide-Node');
		let Warning = this.Chain.includes(Node);
		if (Warning) Slide_Node.classList.add('Slide-Node-Bad');
		let Slide_Node_Header = document.createElement('div');
		Slide_Node_Header.classList.add('Slide-Node-Header');
		if (typeof Node.Complete == 'boolean') {
			let Checkbox = document.createElement('div');
			Checkbox.classList.add('Slide-Checkbox');
			Checkbox.classList.add(Node.Complete ? 'Slide-Checkbox-Complete' : 'Slide-Checkbox-Incomplete');
			Checkbox.onclick = () => {
				this.File.Node_Modify({Complete: !Node.Complete}, Node);
				this.Draw();
			}
			Slide_Node_Header.appendChild(Checkbox);
		}
		let Title = document.createElement('div');
		Title.classList.add('Slide-Title');
		Title.innerHTML = Node.Title;
		Title.onclick = () => {
			if (Node == this.Node) return;
			else if (Active) this.Navigate(Node);
			if (Node == this.Chain[this.Chain.length -1]) this.Navigate();
			else this.Node = Node;
			this.Draw();
		}
		Slide_Node_Header.appendChild(Title);
		Slide_Node.appendChild(Slide_Node_Header);
		if (Full && Node.Statement) {
			let Statement = document.createElement('xmp');
			Statement.classList.add('Slide-Statement');
			Statement.innerHTML = Node.Statement;
			Slide_Node.appendChild(Statement);
		}
		let Box = document.createElement('div');
		Box.classList.add('Slide-Node-Box');
		if (Active) Box.classList.add('Slide-Active');
		if (Node == this.Node) Slide_Node.classList.add('Slide-Current');
		Box.appendChild(Slide_Node);
		return Box;
	}
	let Draw_Corkboard = Node => {
		let Shell = [];
		if (this.Chain.length > 0) Shell.push(Draw_Node(this.Chain[this.Chain.length - 1]));
		Shell.push(Draw_Node(Node, false, true));
		if (Object.keys(Node.Whiteboards).length > 0) for (let i = 0, o = Object.keys(Node.Whiteboards), l = o.length; i < l; i++) {
			let Item = document.createElement('button');
			Item.classList.add('Slide-Whiteboard');
			Item.onclick = () => {
				if (this.GUI.Chain.length >= 2) return;
				let Shell = [{}, {}, {}, {}, []];
				let Name = o[i];
				Shell[0].Enter = {
					Name: 'Open',
					Function: () => {}
				}
				Shell[1].Enter = {
					Name: 'Rename',
					Function: () => {
						this.Prompt('Text', Name, Rename => {
							this.File.Whiteboard_Rename(Name, Rename, Node);
							this.GUI.Navigate(false);
							this.Draw();
						});
					}
				}
				Shell[1].Delete = {
					Name: 'Delete',
					Function: () => {
						this.File.Whiteboard_Remove(Name, Node);
						this.GUI.Navigate(false);
						this.Draw();
					}
				}
				Shell[4].push({Name:o[i]});
				this.GUI.Navigate(new MGUI.Menu(...Shell));
			}
			Item.innerHTML = o[i]; // HTMLS
			Shell.push(Item);
		}
		if (Node.Links.length > 0) for (let i = 0, l = Node.Links.length; i < l; i++) {
			let Item = document.createElement('button');
			Item.classList.add('Slide-Link');
			Item.onclick = () => {
				if (this.GUI.Chain.length >= 2) return;
				let Shell = [{}, {}, {}, {}, []];
				let Index = i;
				Shell[0].Enter = {
					Name: 'Open',
					Function: () => IPC.Link_Open(Node.Links[Index])
				}
				Shell[1].Enter = {
					Name: 'Edit',
					Function: () => {
						this.Prompt('Raw', Node.Links[Index], Link => {
							this.File.Link_Modify(Index, Link, Node);
							this.GUI.Navigate(false);
							this.Draw();
						});
					}
				}
				Shell[0].ArrowUp = {
					Name: 'Move Up',
					Function: () => {
						Index = this.File.Link_Move(Index, true, Node) ? Index - 1 : Index;
						this.Draw();
					}
				}
				Shell[0].ArrowDown = {
					Name: 'Move Down',
					Function: () => {
						Index = this.File.Link_Move(Index, false, Node) ? Index + 1 : Index;
						this.Draw();
					}
				}
				Shell[1].Delete = {
					Name: 'Delete',
					Function: () => {
						this.File.Link_Remove(Index, Node);
						this.GUI.Navigate(false);
						this.Draw();
					}
				}
				Shell[4].push({Name:Node.Links[i]});
				this.GUI.Navigate(new MGUI.Menu(...Shell));
			}
			Item.innerHTML = Node.Links[i]; // HTMLS
			Shell.push(Item);
		}
		if (Node.Notes.length > 0) {
			let Note_Box= document.createElement('div');
			Note_Box.classList.add('Slide-Notes');
			for (let i = 0, l = Node.Notes.length; i < l; i++) {
				let Note = document.createElement('xmp');
				Note.setAttribute('tabindex', '0');
				Note.classList.add('Slide-Note');
				Note.addEventListener('keydown', function (E) {
					if (E.key == 'Enter') this.click();
				});
				Note.onclick = () => {
					if (this.GUI.Chain.length >= 2) return;
					let Shell = [{}, {}, {}, {}, []];
					let Index = i;
					Shell[0].ArrowUp = {
						Name: 'Move Up',
						Function: () => {
							Index = this.File.Note_Move(Index, true, Node) ? Index - 1 : Index;
							this.Draw();
						}
					}
					Shell[0].ArrowDown = {
						Name: 'Move Down',
						Function: () => {
							Index = this.File.Note_Move(Index, false, Node) ? Index + 1 : Index;
							this.Draw();
						}
					}
					Shell[1].Enter = {
						Name: 'Edit',
						Function: () => {
							this.Prompt('Raw', Node.Notes[Index], Note => {
								this.File.Note_Modify(Index, Note, Node);
								this.GUI.Navigate(false);
								this.Draw();
							});
						}
					}
					Shell[1].Delete = {
						Name: 'Delete',
						Function: () => {
							this.File.Note_Remove(Index, Node);
							this.GUI.Navigate(false);
							this.Draw();
						}
					}
					Shell[4].push({Name:Node.Notes[i]});
					this.GUI.Navigate(new MGUI.Menu(...Shell));
				}
				Note.innerHTML = Node.Notes[i]; // HTMLS
				Note_Box.appendChild(Note);
			}
			Shell.push(Note_Box);
		}
		return Shell;
	}
	let Parent = this.Chain.length > 0 ? this.Chain[this.Chain.length - 1] : false;
	if (Parent) {
		if (!this.Options.has(Parent)) this.Options.set(Parent, Object.create(null));
		let Parent_Options = this.Options.get(Parent);
		Parent_Options.Favorite_Child = this.Node;
	}
	let Siblings = Parent ? Parent.Children : this.File.Node_Orphans();
	if (!Siblings.includes(this.Node)) Siblings.unshift(this.Node);
	let Current = Siblings.indexOf(this.Node);
	Options.Slide.Siblings = Siblings;
	Options.Slide.Current = Current;
	let Siblings_Box = document.createElement('div');
	Siblings_Box.classList.add('Slide-Column');
	for (let i = 0, l = Siblings.length; i < l; i++) Siblings_Box.appendChild(Draw_Node(Siblings[i], Siblings[i] == this.Node));
	let Children_Box = document.createElement('div');
	Children_Box.classList.add('Slide-Column');
	Children_Box.classList.add('Slide-Active');
	if (!this.Chain.includes(this.Node))  for (let i = 0, l = this.Node.Children.length; i < l; i++) Children_Box.appendChild(Draw_Node(this.Node.Children[i], true));
	let Node_Box = document.createElement('div');
	Node_Box.classList.add('Slide-Column');
	Node_Box.append(...Draw_Corkboard(this.Node));
	this.Container.appendChild(Node_Box);
	this.Container.appendChild(Siblings_Box);
	this.Container.appendChild(Children_Box);
	Siblings_Box.querySelector('.Slide-Active').focus();
	let Shell = [{}, {}, {}, {}, []];
	Shell[0].Control = this.Menus.File;
	Shell[0].Alt = this.Menus.Edit;
	Shell[2].n = this.Menus.New_File;
	Shell[2].o = this.Menus.Open_File;
	Shell[2].s = this.Menus.Save_File;
	Shell[2].Delete = this.Menus.Exit_File;
	if (Current != 0) {
		Shell[0].ArrowUp = this.Menus.Slide_Up;
		Shell[1].ArrowUp = this.Menus.Move_Sibling_Up;
	}
	if (Current < Siblings.length - 1) {
		Shell[0].ArrowDown = this.Menus.Slide_Down;
		Shell[1].ArrowDown = this.Menus.Move_Sibling_Down;
		Shell[1].ArrowRight = this.Menus.Lower_Sibling;
	}
	if (this.Node.Children.length > 0) Shell[0].ArrowRight = this.Menus.Slide_Right;
	if (this.Chain.length > 0) {
		Shell[0].ArrowLeft = this.Menus.Slide_Left;
		Shell[1].ArrowLeft = this.Menus.Raise_Sibling;
		Shell[1].Delete = this.Menus.Orphan_Node;
		Shell[1].x = this.Menus.Cut;
	}
	Shell[1].c = this.Menus.Copy;
	if (this.Options.get('Slide').Clipboard) Shell[1].v = this.Menus.Paste;
	if (this.Node.Complete !== null) Shell[0].q = this.Menus.Mark_Complete;
	Shell[1].t = this.Menus.Set_Title;
	Shell[1].s = this.Menus.Set_Statement;
	Shell[1].q = this.Menus.Toggle_Tracking;
	if (this.Node.Complete !== null) Shell[0].q = this.Menus.Mark_Complete;
	Shell[1]['+'] = this.Menus.New_Child;
	Shell[1].l = this.Menus.New_Link;
	Shell[1].n = this.Menus.New_Note;
	Shell[1].w = this.Menus.New_Whiteboard;
	//this.GUI.Navigate(new MGUI.Menu(...Shell));
	// Shell.[1].m = this.Menus.Set_Mode;
	if (this.Node != this.File.Data[0]) Shell[1].Delete = this.Menus.Delete_Node;
	if (this.GUI.Chain.length < 2) this.GUI.Navigate(new MGUI.Menu(...Shell), true);
}
Tab.prototype.Draw_Kanban = function () {}
Tab.prototype.Draw_Checklist = function () {}
Tab.prototype.Draw_Tasklist = function () {}
Tab.prototype.Draw_Whiteboard = function () {}
Tab.prototype.Prompt = function (Type, Options, Function) {
	let Exit_Function = () => {
		let Boxes = this.Container.getElementsByClassName('Prompt-Background');
		[...Boxes].forEach(Box => Box.remove());
		this.GUI.Navigate(false);
		this.Draw();
	}
	let Go_Function = () => {
		Exit_Function();
	}
	let Prompt_Background = document.createElement('div');
	Prompt_Background.classList.add('Prompt-Background');
	let Prompt_Box = document.createElement('div');
	Prompt_Box.classList.add('Prompt-Box');
	let Exit_Button = document.createElement('button');
	Exit_Button.classList.add('Prompt-Button');
	Exit_Button.innerHTML = 'Exit';
	Exit_Button.onclick = Exit_Function;
	let Go_Button = document.createElement('button');
	Go_Button.classList.add('Prompt-Button');
	Go_Button.innerHTML = 'Go';
	Go_Button.onclick = Go_Function;
	let Target;
	switch (Type) {
		case 'Text':
			let Text_In = document.createElement('input');
			Text_In.classList.add('Prompt-Text');
			if (Options) Text_In.value = Options;
			Go_Function = () => Function(Text_In.value);
			Prompt_Box.appendChild(Text_In);
			Target = Text_In;
			break;
		case 'Raw':
			let Raw_In = document.createElement('textarea');
			Raw_In.setAttribute('autocapitalize', 'false');
			Raw_In.setAttribute('autocomplete', 'false');
			Raw_In.setAttribute('autocorrect', 'false');
			Raw_In.setAttribute('spellcheck', 'false');
			Raw_In.classList.add('Prompt-Raw');
			if (Options) Raw_In.innerHTML = Options;
			Go_Function = () => Function(Raw_In.value ? Raw_In.value : null);
			Prompt_Box.appendChild(Raw_In);
			Target = Raw_In;
			break;
		case 'Link':
			let Link_In = document.createElement('input');
			Link_In.classList.add('Prompt-Text');
			if (Options) Link_In.value = Options;
			let Get_Link = document.createElement('button');
			Get_Link.classList.add('Prompt-Button');
			Get_Link.innerHTML = 'Browse';
			Get_Link.onclick = async () => await IPC.Link_New().then(Link => Link ? Link_In.value = Link : false);
			Go_Function = () => Function(Link_In.value);
			Prompt_Box.appendChild(Link_In);
			Prompt_Box.appendChild(Get_Link);
			Target = Link_In;
			break;
		default:
			throw new Error('Invalid input Type: expected "Text", "Raw", or "Link"');
	}
	let Save_Function = () => {
		Go_Function();
		Exit_Function();
	}
	Go_Button.onclick = Save_Function;
	Prompt_Box.appendChild(Go_Button);
	Prompt_Box.appendChild(Exit_Button);
	Prompt_Background.appendChild(Prompt_Box);
	let Shell = [{}, {}, {}, {}, []];
	Shell[0].Escape = {
		Name: 'Escape',
		Function: Exit_Function
	};
	Shell[1].Enter = {
		Name: 'Save',
		Function: Save_Function
	};
	this.Container.appendChild(Prompt_Background);
	this.GUI.Navigate(new MGUI.Menu(...Shell));
	Target.focus();
}
Tab.prototype.Menu_Setup = function () {
	this.Menus = Object.create(null);
	this.Menus.File = {
		Name: 'File'
	};
	this.Menus.Edit = {
		Name: 'Edit'
	};
	this.Menus.New_File = {
		Name: 'New File',
		Function: IPC.File_New
	};
	this.Menus.Open_File = {
		Name: 'Open File',
		Function: IPC.File_Open
	};
	this.Menus.Save_File = {
		Name: 'Save File',
		Function: () => IPC.File_Save(this.File.Export())
	};
	this.Menus.Exit_File = {
		Name: 'Close File',
		Function: () => this.GUI.Navigate(new MGUI.Menu({}, {}, {}, {}, [{
			Name: 'Abandon Changes and Close the Document',
			Function: () => window.close()
		}]))
	}
	this.Menus.New_Node = {
		Name: 'New Node',
		Function: () => this.Prompt('Text', null, Title => {
			let Node = this.File.Node_Add({Title: Title});
			this.Node = Node; // is this method correct?
			this.Draw();
		})
	};
	this.Menus.Orphan_Node = {
		Name: 'Orphan',
		Function: () => {
			let Parent = this.Chain[this.Chain.length - 1];
			this.File.Child_Remove(this.Node, Parent);
			this.Navigate();
			this.Draw();
		}
	};
	this.Menus.Copy = {
		Name: 'Copy',
		Function: () => {
			this.Options.get('Slide').Clipboard = this.Node;
			return true;
		}
	};
	this.Menus.Cut = {
		Name: 'Cut',
		Function: () => {
			let Parent = this.Chain[this.Chain.length - 1];
			this.File.Child_Remove(this.Node, Parent);
			this.Options.get('Slide').Clipboard = this.Node;
			this.Navigate();
			this.Draw();
		}
	};
	this.Menus.Paste = {
		Name: 'Paste',
		Function: () => {
			this.File.Child_Add(this.Options.get('Slide').Clipboard, this.Node);
			this.Draw();
		}
	};
	this.Menus.Delete_Node = {
		Name: 'Delete Node',
		Function: () => {
			let Remove = () => this.File.Node_Remove(this.Node);
			let Navigate = () => this.Navigate();
			let GUI = () => this.GUI.Navigate(false);
			let Draw = () => this.Draw();
			this.GUI.Navigate(new MGUI.Menu({
				'y': {
					Name: 'Delete Node',
					Function: () => {
						Remove();
						Navigate();
						GUI();
						Draw();
					}
				}
			}, {}, {}, {}, []));
		}
	};
	this.Menus.Slide_Up = {
		Name: 'Up',
		Function: () => {
			let Options = this.Options.get(this.Node);
			this.Node = Options.Slide.Siblings[Options.Slide.Current - 1];
			this.Draw();
		}	
	};
	this.Menus.Slide_Down = {
		Name: 'Down',
		Function: () => {
			let Options = this.Options.get(this.Node);
			this.Node = Options.Slide.Siblings[Options.Slide.Current + 1];
			this.Draw();
		}
	};
	this.Menus.Slide_Right = {
		Name: 'Enter',
		Function: () => {
			if (this.Chain.includes(this.Node)) return;
			else if (!this.Options.has(this.Node)) this.Options.set(this.Node, Object.create(null));
			let Options = this.Options.get(this.Node);
			if (this.Node.Children.includes(Options.Favorite_Child)) this.Navigate(Options.Favorite_Child);
			else this.Navigate(this.Node.Children[0]);
			this.Draw();
		}
	};
	this.Menus.Slide_Left = {
		Name: 'Back',
		Function: () => {
			let Options = this.Options.get(this.Node);
			//if (!Options || !Options.Slide || !Options.Slide.Dunked) this.Navigate();
			//else Options.Slide.Dunked = false;
			this.Navigate();
			this.Draw();
		}
	};
	this.Menus.Toggle_Tracking = {
		Name: 'Toggle Tracking',
		Function: () => {
			this.File.Node_Modify({Complete: this.Node.Complete === null ? false : null}, this.Node);
			this.Draw();
		}
	};
	this.Menus.Mark_Complete = {
		Name: 'Toggle Completion',
		Function: () => {
			this.File.Node_Modify({Complete: !this.Node.Complete}, this.Node);
			this.Draw();
		}
	};
	// this.Menus.Set_Mode = {}
	// this.Menus.Set_Default_Mode = {}
	this.Menus.Set_Title = {
		Name: 'Edit Title',
		Function: () => this.Prompt('Text', this.Node.Title, Title => {
			this.File.Node_Modify({Title:Title}, this.Node);
			this.Draw();
		})
	};
	this.Menus.Set_Statement ={
		Name: 'Edit Statement',
		Function: () => this.Prompt('Raw', Node.Statement, Statement => {
			this.File.Node_Modify({Statement: Statement}, Node);
			this.Draw();
		})
	};
	this.Menus.New_Child = {
		Name: 'New Child',
		Function: () => {
			let Node = this.Node;
			this.Prompt('Text', null, Title => {
				let Child = this.File.Node_Add({Title: Title});
				this.File.Child_Add(Child, Node);
				this.Draw();
			});
		}
	};
	this.Menus.New_Link = {
		Name: 'New Link',
		Function: () => this.Prompt('Link', null, Link => {
			this.File.Link_Add(Link, this.Node);
			this.Draw();
		})
	};
	this.Menus.New_Note = {
		Name: 'New Note',
		Function: () => this.Prompt('Raw', null, Note => {
			this.File.Note_Add(Note, this.Node);
			this.Draw();
		})
	};
	this.Menus.New_Whiteboard ={
		Name: 'New Whiteboard',
		Function: () => this.Prompt('Text', null, Name => {
			this.File.Whiteboard_Add(Name, null, this.Node);
			this.Draw();
		})
	};
	this.Menus.Move_Sibling_Up = {
		Name: 'Move Up',
		Function: () => {
			this.File.Child_Move(this.Node, true, this.Chain[this.Chain.length - 1]);
			this.Draw();
		}
	};
	this.Menus.Move_Sibling_Down = {
		Name: 'Move Down',
		Function: () => {
			this.File.Child_Move(this.Node, false, this.Chain[this.Chain.length - 1]);
			this.Draw();
		}
	};
	this.Menus.Raise_Sibling = {
		Name: 'Move Into Parent',
		Function: () => {
			this.File.Child_Remove(this.Node, this.Chain[this.Chain.length - 1]);
			if (this.Chain.length > 1) this.File.Child_Add(this.Node, this.Chain[this.Chain.length - 2]);
			let Node = this.Node;
			this.Navigate();
			this.Node = Node;
			this.Draw();
		}
	};
	this.Menus.Lower_Sibling = {
		Name: 'Move Into Next Sibling',
		Function: () => {
			this.File.Child_Remove(this.Node, this.Chain[this.Chain.length - 1]);
			let Options = this.Options.get(this.Node);
			let Sibling = this.Chain[this.Chain.length - 1].Children[Options.Slide.Current];
			this.File.Child_Add(this.Node, Sibling);
			this.Node = Sibling
			this.Draw();
		}
	};
	this.Menus.New_Parent_Child = {
		Name: 'New Child',
		Function: () => {
			let Node = this.Chain[this.Chain.length - 1];
			this.Prompt('Text', null, Title => {
				let Child = this.File.Node_Add({Title: Title});
				this.File.Child_Add(Child, Node);
				this.Draw();
			});
		}
	};
	this.Menus.New_Parent_Whiteboard ={
		Name: 'New Whiteboard',
		Function: () => {
			let Node = this.Chain[this.Chain.length - 1];
			this.Prompt('Text', null, Name => {
				this.File.Whiteboard_Add(Name, null, Node);
				this.Draw();
			});
		}
	};
	this.Menus.Toggle_Parent_Tracking = {
		Name: 'Toggle Tracking',
		Function: () => {
			let Node = this.Chain[this.Chain.length - 1];
			this.File.Node_Modify({Complete: Node.Complete === null ? false : null}, Node);
			this.Draw();
		}
	};
	this.Menus.New_Parent_Note = {
		Name: 'New Note',
		Function: () => {
			let Node = this.Chain[this.Chain.length - 1];
			this.Prompt('Raw', null, Note => {
				this.File.Note_Add(Note, Node);
				this.Draw();
			});
		}
	};
	this.Menus.New_Parent_Link = {
		Name: 'New Link',
		Function: () => {
			let Node = this.Chain[this.Chain.length - 1];
			this.Prompt('Link', null, Link => {
				this.File.Link_Add(Link, Node);
				this.Draw();
			});
		}
	};
	this.Menus.Set_Parent_Title = {
		Name: 'Edit Title',
		Function: () => {
			let Node = this.Chain[this.Chain.length - 1];
			this.Prompt('Text', Node.Title, Title => {
				this.File.Node_Modify({Title:Title}, Node);
				this.Draw();
			});
		}
	};
	this.Menus.Set_Parent_Statement ={
		Name: 'Edit Statement',
		Function: () => {
			let Node = this.Chain[this.Chain.length - 1];
			this.Prompt('Raw', Node.Statement, Statement => {
				this.File.Node_Modify({Statement: Statement}, Node);
				this.Draw();
			});
		}
	};
	this.Menus.Mark_Parent_Complete = {
		Name: 'Toggle Completion',
		Function: () => {
			let Node = this.Chain[this.Chain.length - 1];
			this.File.Node_Modify({Complete: !Node.Complete}, Node);
			this.Draw();
		}
	};
}

// navigation: up and down chain
// to arbitrary element (clear chain?)
// to arbitrary element (include in chain)
// spawn new tab from element?
//
// what info & func is required for using each mode?
//
// slide:
// -- parent-node (or synthetic adoptor node)
// -- current position in children list
//
// kanban:
// -- current node
// -- children
// -- grandchildren (under each child)
//
// checklist:
// -- current node
//
// tasklist:
// -- current node
// -- max-depth (depth mask/per child?)
//
// whiteboard:
// -- current node
// -- current whiteboard
// -- x, y position
// -- zoom level
//
