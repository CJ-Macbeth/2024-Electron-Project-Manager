const File = function (Data) {
	this.Import(Data);
}
File.prototype.Identify_Node = function (Node) {
	if (Number.isInteger(Node) && this.Data[Node]) return this.Data[Node];
	else if (!Node) return this.Data[0];
	else if (this.Data.includes(Node)) return Node;
	else throw new Error('Failed to identify node');
}
File.prototype.Import = function (Data) {
	if (!Array.isArray(Data)) throw new Error('Invalid input Data: expected array');
	else if (Data.length == 0) throw new Error('Invalid input Data: expected at least one element');
	this.Data = Data.map((Node, Index) => {
		if (Node === null) return Node;
		else if (typeof Node != 'object') throw new Error(`Invalid input Data[${Index}]: expected object or null`);
		let Shell = Object.create(null);
		if (typeof Node.Title != 'string' || Node.Title.length == 0) throw new Error(`Invalid input Data[${Index}]: empty Title`);
		else Shell.Title = Node.Title.trim();
		if (Node.Statement && typeof Node.Statement != 'string') throw new Error(`Invalid input Data[${Index}]: invalid Statement`);
		else Shell.Statement = Node.Statement ? Node.Statement : null;
		if (Node.Children) Shell.Children = Node.Children;
		if (Node.Links && !Array.isArray(Node.Links)) throw new Error(`Invalid input Data[${Index}]: invalid Links`);
		else if (!Node.Links.every(Link => typeof Link == 'string')) throw new Error(`Invalid input Data[${Index}]: invalid link in Links`);
		else Shell.Links = Node.Links ? Node.Links.map(Link => Link.trim()) : null;
		if (Node.Notes && !Array.isArray(Node.Notes)) throw new Error(`Invalid input Data[${Index}]: invalid Notes`);
		else if (!Node.Notes.every(Note => typeof Note == 'string')) throw new Error(`Invalid input Data[${Index}]: invalid note in Notes`);
		else Shell.Notes = Node.Notes ? Node.Notes : null;
		if (Node.Mode && ['Slide', 'Kanban', 'Checklist', 'Tasklist'].includes(Node.Mode)) Shell.Mode = Node.Mode;
		else if (Node.Mode) throw new Error(`Invalid input Data[${Index}]: invalid Mode`);
		else Shell.Mode = 'Slide';
		if (Node.Whiteboards) Shell.Whiteboards = Node.Whiteboards;
		else Shell.Whiteboards = Object.create(null);
		if (typeof Node.Complete == 'boolean') Shell.Complete = Node.Complete;
		else if (!Node.Complete) Shell.Complete = null;
		else throw new Error(`Invalid input Data[${Index}]: invalid Complete: expected boolean, null, or undefined`);
		return Shell;
	});
	this.Data.forEach(Node => {
		if (Node.Children && !Array.isArray(Node.Children)) throw new Error(`Invalid input Data[${Index}]: invalid Children`);
		else if (Node.Children) Node.Children = Node.Children.map((Child, Index_2) => {
			if (Child === null) return null;
			else if (!Number.isInteger(Child)) throw new Error(`Invalid input Data[${Index}].Chilren[${Index_2}]: expected integer`);
			else if (Child < 0 || Child >= this.Data.length) throw new Error(`Invalid input Data[${Index}].Chilren[${Index_2}]: invalid reference`);
			else if (this.Data[Child] === null) return null;
			else return this.Data[Child];
		}).filter(Child => Child !== null);
		else Node.Children = [];
		if (Node.Whiteboards && typeof Node.Whiteboards != 'object') throw new Error(`Invalid input Data[${Index}]: invalid Whiteboards`);
		else if (Node.Whiteboards) {
			for (let i = 0, o = Object.keys(Node.Whiteboards), l = o.length; i < l; i++) {
				let ShellB = [];
				Node.Whiteboards[o[i]].forEach(Item => {
					let ShellC = structuredClone(Item);
					if (
						Item.Type == 'Child' && 
						(!Number.isInteger(Item.Child) || 
							Item.Child < 0 || 
							Item.Child >= 
							Node.Children.length)
					) throw new Error(`Invalid input Data[${Index}]: invalid Whiteboard[${Whiteboard}][${I2}]: invalid child reference`);
					else if (Item.Type == 'Child') SehllC.Child = Node.Children[Item.Child];
					else if (
						Item.Type == 'Link' && 
						(!Number.isInteger(Item.Link) || 
							Item.Link < 0 || 
							Item.Link >= 
						Node.Links.length)
					) throw new Error(`Invalid input Data[${Index}]: invalid Whiteboard[${Whiteboard}][${I2}]: invalid link reference`);
					else if (Item.Type == 'Link') ShellC.Link = Node.Links[Item.Link];
					else if (
						Item.Type == 'Note' && 
						(!Number.isInteger(Item.Note) || 
							Item.Note < 0 || 
							Item.Note >= 
							Node.Notes.length)
					) throw new Error(`Invalid input Data[${Index}]: invalid Whiteboard[${Whiteboard}][${I2}]: invalid note reference`);
					else if (Item.Type == 'Note') ShellC.Note = Node.Notes[Item.Note];
					ShellB.push(ShellC);
				});
				Node.Whiteboards[o[i]] = ShellB;
			}
		}
	});
	this.Data = this.Data.filter(Node => Node !== null);
	return true;
}
File.prototype.Export = function () {
	return this.Data.map(Node => {
		let Shell = structuredClone(Node);
		Shell.Children = Node.Children.map(Child => this.Data.indexOf(Child)).filter(Child => Child != -1);
		Shell.Whiteboards = Object.create(null);
		Object.keys(Node.Whiteboards).forEach(Name => {
			Shell.Whiteboards[Name] = Node.Whiteboards[Name].map(Item => {
				let Shell = structuredClone(Item);
				if (Item.Type == 'Child') Shell.Child = Node.Children.indexOf(Item.Child);
				else if (Item.Type == 'Note') Shell.Note = Node.Notes.indexOf(Item.Note);
				else if (Item.Type == 'Link') Shell.Link = Node.Children.Links.indexOf(Item.Link);
				return Item;
			});
		});
		return Shell;
	});
}
File.prototype.Node_Add = function (Options) {
	let Shell = Object.create(null);
	Shell.Title = Options.Title;
	Shell.Statement = Options.Statement ? Options.Statement : null;
	Shell.Links = Options.Links ? Options.Links : [];
	Shell.Children = Options.Children ? Options.Chilren : [];
	Shell.Notes = Options.Notes ? Options.Notes : [];
	Shell.Whiteboards = Options.Whiteboards ? Options.Whiteboards : Object.create(null);
	Shell.Mode = Options.Mode ? Options.Mode : 'Slide';
	Shell.Complete = (typeof Options.Complete == 'boolean') ? Options.Complete : null;
	this.Data.push(Shell);
	return Shell;
}
File.prototype.Node_Modify = function (Options, Node) {
	Node = this.Identify_Node(Node);
	if (Options.Title) Node.Title = Options.Title;
	if (Options.Statement) Node.Statement = Options.Statement;
	else if (Options.Statement === null) Node.Statement = null;
	if (Options.Links) Node.Links = Options.Links;
	else if (Options.Links === null) Node.Links = [];
	if (Options.Children) Node.Children = Options.Children;
	else if (Options.Children === null) Node.Children = [];
	if (Options.Notes) Node.Notes = Options.Notes;
	else if (Options.Notes === null) Node.Notes = [];
	if (Options.Whiteboards) Node.Whiteboards = Options.Whiteboards;
	else if (Options.Whiteboards === null) Node.Whiteboards = [];
	if (Options.Mode) Node.Mode = Options.Mode;
	else if (Options.Mode === null) Options.Mode = 'Slide';
	if (typeof Options.Complete == 'boolean' || Options.Complete === null) Node.Complete = Options.Complete;
	return true;
}
File.prototype.Node_Remove = function (Node) {
	if (!Number.isInteger(Node)) Node = this.Data.indexOf(Node);
	if (!this.Data[Node]) return false;
	let Problem_Child = this.Data.splice(Node, 1)[0];
	this.Data.forEach(Node => Node.Children = Node.Children.filter(Child => Child != Problem_Child));
	return true;
}
File.prototype.Node_Search = function (Search, Depth, Node) {
	Node = this.Identify_Node(Node);
	let Matches = [];
	let Checked = [];
	let Dive = (Remaining_Depth, Current_Node) => {
		for (let i = 0, l = Current_Node.Children.length; i < l; i++){
			if (Checked.includes[Current_Node.Children[i]]) continue;
			if (
				Current_Node.Children[i].Title.match(Search) ||
				Current_Node.Children[i].Statement.match(Search)
			) Matches.push(Current_Node.Children[i]);
			Checked.push(Current_Node.Children[i]);
			if (Remaining_Depth > 0) Dive(Remaining_Depth - 1, Current_Node.Children[i]);
		}
	}
	Dive(Depth, Node);
	return Matches;
}
File.prototype.Node_Orphans = function () {
	let Parented = new Set();
	let Everyone = new Set(this.Data);
	this.Data.forEach(Node => Node.Children.forEach(Child => Parented.add(Child)));
	let Difference = Everyone.difference(Parented);
	let Ordered_Difference = [...Difference].sort((A, B) => this.Data.indexOf(A) < this.Data.indexOf(B) ? -1 : 1);
	return Ordered_Difference;
}
File.prototype.Child_Add = function (Child, Node)  {
	if (!this.Data.includes(Child)) return false;
	Node = this.Identify_Node(Node);
	if (Node.Children.includes(Child)) return false;
	else Node.Children.unshift(Child);
	return true;
}
File.prototype.Child_Move = function (Index, Target, Node) {	
	Node = this.Identify_Node(Node);
	if (!Number.isInteger(Index)) Index = Node.Children.indexOf(Index);
	if (!Node.Children[Index]) return false;
	if (Target === true && Index > 0) {
		let Child = Node.Children.splice(Index, 1)[0];
		Node.Children.splice(Index - 1, 0, Child);
	} else if (Target === false && Index < Node.Children.length) {
		let Child = Node.Children.splice(Index, 1)[0];
		Node.Children.splice(Index + 1, 0, Child);
	} else if (Number.isInteger(Target) && Node.Children[Target]) {
		let Child = Node.Children.splice(Target, 1);
		Node.Children.splice(Target, 0, Child);
	} else return false;
	return true;
}
File.prototype.Child_Remove = function (Index, Node) {	
	Node = this.Identify_Node(Node);
	if (!Number.isInteger(Index)) Index = Node.Children.indexOf(Index);
	if (!Node.Children[Index]) return false;
	Node.Children.splice(Index, 1);
	return true;
}
File.prototype.Link_Add = function (Link, Node) {
	if (typeof Link != 'string' || Link.length == 0) return false;
	Node = this.Identify_Node(Node);
	Node.Links.push(Link);
	return true;
}
File.prototype.Link_Modify = function (Index, Link, Node) {
	if (typeof Link != 'string' || Link.length == 0) return false;
	Node = this.Identify_Node(Node);
	if (!Node.Links[Index]) return false;
	Node.Links[Index] = Link;
	return true;
}
File.prototype.Link_Move = function (Index, Target, Node) {
	Node = this.Identify_Node(Node);
	if (!Node.Links[Index]) return false;
	if (Target === true && Index > 0) {
		let Link = Node.Links.splice(Index, 1)[0];
		Node.Links.splice(Index - 1, 0, Link);
	} else if (Target === false && Index < Node.Links.length -1) {
		let Link = Node.Links.splice(Index, 1)[0];
		Node.Links.splice(Index + 1, 0, Link);
	} else if (Number.isInteger(Target) && Node.Links[Target]) {
		let Link = Node.Links.splice(Target, 1);
		Node.Links.splice(Target, 0, Link);
	} else return false;
	return true;
}
File.prototype.Link_Remove = function (Index, Node) {
	Node = this.Identify_Node(Node);
	if (!Node.Links[Index]) return false;
	Node.Links.splice(Index, 1);
	return true;
}
File.prototype.Note_Add = function (Note, Node) {
	if (typeof Note != 'string' || Note.length == 0) return false;
	Node = this.Identify_Node(Node);
	Node.Notes.push(Note);
	return true;
}
File.prototype.Note_Modify = function (Index, Note, Node) {
	if (typeof Note != 'string' || Note.length == 0) return false;
	Node = this.Identify_Node(Node);
	if (!Node.Notes[Index]) return false;
	Node.Notes[Index] = Note;
	return true;
}
File.prototype.Note_Move = function (Index, Target, Node) {
	Node = this.Identify_Node(Node);
	if (!Node.Notes[Index]) return false;
	if (Target === true && Index > 0) {
		let Note = Node.Notes.splice(Index, 1)[0];
		Node.Notes.splice(Index - 1, 0, Note);
	} else if (Target === false && Index < Node.Notes.length -1) {
		let Note = Node.Notes.splice(Index, 1)[0];
		Node.Notes.splice(Index + 1, 0, Note);
	} else if (Number.isInteger(Target) && Node.Note[Target]) {
		let Link = Node.Links.splice(Target, 1);
		Node.Notes.splice(Target, 0, Note);
	} else return false;
	return true;
}
File.prototype.Note_Remove = function (Index, Node) {
	Node = this.Identify_Node(Node);
	if (!Node.Notes[Index]) return false;
	Node.Notes.splice(Index, 1);
	return true;
}
File.prototype.Whiteboard_Add = function (Name, Whiteboard, Node) {
	Node = this.Identify_Node(Node);
	if (typeof Name != 'string') return false;
	else if (Whiteboard && !Array.isArray(Whiteboard)) return false;
	Node.Whiteboards[Name] = Whiteboard ? Whiteboard : [];
	return true;
}
File.prototype.Whiteboard_Rename = function (Name, Rename, Node) {
	Node = this.Identify_Node(Node);
	if (!Node.Whiteboards[Name]) return false;
	if (Node.Whiteboards[Name] && !Node.Whiteboards[Rename]) {
		Node.Whiteboards[Rename] = Node.Whiteboards[Name];
		delete Node.Whiteboards[Name];
		return true;
	} else return false;
}
File.prototype.Whiteboard_Modify = function (Name, Options, Index, Node) {
	Node = this.Identify_Node(Node);
	if (!Node.Whiteboards[Name]) return false;
	if (Options && Number.isInteger(Index) && Node.Whiteboards[Name][Index]) {
		Object.keys(Options).forEach(Option => {
			if (Options[Option] === null) delete Node.Whiteboards[Name][Index][Option];
			else Node.Whiteboards[Name][Index][Option] = Options[Option];
			// remove extra/wrong options?
		});
	} else if (!Options && Number.isInteger(Index) && Node.Whiteboards[Name][Index]) {
		Node.Whiteboards[Name].splice(Index, 1);
	} else if (Options && !Number.isInteger(Index)) {
		Node.Whiteboard[Name].push(structuredClone(Options));
		// validate input types?
	} else return false;
	return  true;
}
File.prototype.Whiteboard_Remove = function (Name, Node) {
	Node = this.Identify_Node(Node);
	if (!Node.Whiteboards[Name]) return false;
	else delete Node.Whiteboards[Name];
}