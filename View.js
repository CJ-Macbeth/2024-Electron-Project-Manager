const View = function (Edit, Container, GUI) {
	this.Edit = Edit;
	this.Container = Container;
	this.GUI = GUI;
	this.Tabs = [];
	this.Clipboard = null;
	this.Save = null;
	this.Navigate(0, false, true);
}
View.prototype.Navigate = async function (Index, Silent, Tab) {
	if (Tab === true) {
		let New_Tab = new Map();
		New_Tab.set('Chain', []);
		New_Tab.set('Enter', false);
		New_Tab.set('Node', Number.isInteger(Index) ? Index : this.Tab.get('Node'));
		New_Tab.set(New_Tab.get('Node'), Object.create(null));
		this.Tabs.push(New_Tab);
		this.Tab = New_Tab;
	} else if (Tab && this.Tabs.includes(Tab)) this.Tab = Tab;
	if (this.Tab.get('Menulock')) return;
	this.Tab.set('Active', false);
	let Chain = this.Tab.get('Chain');
	if (Index === false && Chain.length > 0) this.Tab.set('Node', Chain.pop());
	else if (Index === false) this.Tab.set('Node', 0);
	else if (Number.isInteger(Index) && Tab !== true) {
		if (!Silent && this.Tab.has('Node')) Chain.push(this.Tab.get('Node'));
		this.Tab.set('Node', Index);
		if (!this.Tab.has(Index)) this.Tab.set(Index, Object.create(null));
	}
	await this.Draw();
}
View.prototype.Draw = async function (Enter) {
	if (this.Save) this.Save();
	this.Save = null;
	this.Container.innerHTML = '';
	if (typeof Enter == 'boolean') this.Tab.set('Enter', Enter);
	Enter = this.Tab.get('Enter');
	let Index = this.Tab.get('Node');
	let Node = await this.Edit.Node(Index);
	if (Enter) switch (Node.Type) {
		case 'Kanban':
			await this.Kanban(Index, Node);
			break;
		default:
			await this.Task(Index, Node);
	} else await this.Tree(Index, Node);
	return true;
}
View.prototype.Tree = async function (Current_Index, Current_Node) {

	let Chain = this.Tab.get('Chain');
	let Node_Options = this.Tab.get(Current_Index);
	if (!Node_Options.Tree) Node_Options.Tree = Object.create(null);
	let Options = Node_Options.Tree;
	if (!Options.Depth) Options.Depth = 1;

	let Parent = false;
	let Last_Index = null;
	let Sibling_Indexes = [];

	if (Chain.length > 0){
		Last_Index = Chain[Chain.length - 1];
		let Last_Node = await this.Edit.Node(Last_Index);
		if (Last_Node.Children.includes(Current_Index)) Parent = true;
	}
	if (Parent) {
		let Parent_Node = await this.Edit.Node(Last_Index);
		Sibling_Indexes = Parent_Node.Children;
		this.Tab.get(Last_Index).Favorite_Child = Current_Index;
	} else if (Last_Index === null) {
		Sibling_Indexes = await this.Edit.Node_Orphans(true);
	} else Sibling_Indexes = [Current_Index];
	if (!Sibling_Indexes.includes(Current_Index)) Sibling_Indexes.unshift(Current_Index);

	let Draw_Node = async (Index, Highlight, Full) => {
		let Node = await this.Edit.Node(Index);
		let Box = this.Element({Class: 'Tree-Node-Box'});
		let Item = this.Element({Parent: Box, Class: 'Tree-Node', Click: async () => {
			if (Index == Current_Index) return;
			else if (Node == Chain[Chain.length - 1]) return await this.Navigate(false);
			else if (Sibling_Indexes.includes(Index)) return await this.Navigate(Index, true);
			else return await this.Navigate(Index);
		}});
		let Warn = Chain.includes(Index);
		if (Warn || Highlight === false) Item.classList.add('Tree-Node-Warn');
		else if (Highlight === true) Item.classList.add('Tree-Node-Active');
		let Header = this.Element({Parent: Item, Class: 'Tree-Node-Header'});
		if (Node.Complete !== null) this.Element({
			Parent: Header,
			Class: ['Tree-Checkbox', Node.Complete ? 'Tree-Complete' : 'Tree-Incomplete' ],
			Click: async e => {
				e.stopPropagation();
				await this.Edit.Node_Modify({Complete: !Node.Complete}, Index);
				return await this.Draw();
			}
		});
		this.Element({Parent: Header, Class: 'Tree-Title', In: Node.Title});
		if (Full && Node.Statement) this.Element({Type: 'xmp', Parent: Item, Class: 'Tree-Statement', In: Node.Statement});
		return Box;
	}

	let Column_1 = this.Element({Parent: this.Container, Class: 'Tree-Column'});
	if (Parent) await Draw_Node(Last_Index, false).then(Element => Column_1.appendChild(Element));
	await Draw_Node(Current_Index, null, true).then(Element => Column_1.appendChild(Element));
	if (Current_Node.Links.length > 0) Current_Node.Links.forEach((Link, I) => {
		this.Element({Parent: Column_1, Type: 'button', Class: 'Tree-Link', In: Link, Click: () => {
			let Menu = this.Menu_Template();
			let Index = I;
			this.Menu_Link(Menu, Current_Index, () => {return Index}, Link, New_Index => Index = New_Index);
			this.GUI.Navigate(Menu);
		}, Attributes: {tabindex: '0'}, Listeners: {keydown: function (e) {
			if (e.key == 'Enter') this.click();
		}}});
	});
	let Canvas_Box = this.Element({Parent: Column_1, Class: 'Tree-Sketch'});
	let Canvas = this.Sketch(Current_Index, Current_Node, Canvas_Box);
	if (Current_Node.Log.length > 0) this.Element({
		Parent: Column_1,
		Type: 'xmp',
		Class: 'Tree-Log',
		In: Current_Node.Log[Current_Node.Log.length - 1]
	});
	if (Options.Position) Column_1.scrollTo(0, Options.Position);
	let Target;
	let Column_2 = this.Element({Parent: this.Container, Class: 'Tree-Column'});
	for (let i = 0, l = Sibling_Indexes.length; i < l; i++) {
		let Current = Sibling_Indexes[i] == Current_Index;
		let Element = await Draw_Node(Sibling_Indexes[i], Current ? true : null);
		if (Current) {
			Element.classList.add('Tree-Active');
			Target = Element;
		}
		Column_2.appendChild(Element);
	}

	let Column_3 = this.Element({Parent: this.Container, Class: ['Tree-Column', 'Tree-Active']});
	if (!Chain.includes(Current_Index)) for (let i = 0, l = Current_Node.Children.length; i < l; i++) await Draw_Node(Current_Node.Children[i]).then(Element => Column_3.appendChild(Element));

	Target.scrollIntoViewIfNeeded();
	Target.focus();

	this.Save = () => Options.Position = Column_1.scrollTop;

	if (!this.Tab.get('Menulock')) {
		let Menu = this.Menu_Template();
		this.Menu_File(Menu);
		this.Menu_Edit(Menu, Current_Index, Current_Node, Parent, Last_Index);
		this.Menu_Slide_Arrows(Menu, Chain, Parent, Last_Index, Sibling_Indexes, Current_Index, Current_Node.Children);
		Menu[0].Enter = this.Menu_View();
		Menu[0].q = this.Menu_Complete(Current_Index, Current_Node.Complete);
		Menu[0].f = this.Menu_Search(Current_Index, Current_Node);
		Menu[0].b = this.Menu_Logbook(Current_Index, Current_Node);
		Menu[0].t = this.Menu_Tabs();
		this.GUI.Navigate(Menu, true);
	}
}
View.prototype.Task = async function (Current_Index, Current_Node) {

	let Chain = this.Tab.get('Chain');
	let Node_Options = this.Tab.get(Current_Index);
	if (!Node_Options.Task) Node_Options.Task = Object.create(null);
	let Options = Node_Options.Task;
	if (!Options.Depth) Options.Depth = 1;

	let Parent = false;
	let Last_Index = null;
	let Sibling_Indexes = [];

	if (Chain.length > 0){
		Last_Index = Chain[Chain.length - 1];
		let Last_Node = await this.Edit.Node(Last_Index);
		if (Last_Node.Children.includes(Current_Index)) Parent = true;
	}
	if (Parent) {
		let Parent_Node = await this.Edit.Node(Last_Index);
		Sibling_Indexes = Parent_Node.Children;
		this.Tab.get(Last_Index).Favorite_Child = Current_Index;
	} else if (Last_Index === null) {
		Sibling_Indexes = await this.Edit.Node_Orphans(true);
	} else Sibling_Indexes = [Current_Index];
	if (!Sibling_Indexes.includes(Current_Index)) Sibling_Indexes.unshift(Current_Index);
	
	let Children = [];
	for (let i = 0, l = Current_Node.Children.length; i < l; i++) await this.Edit.Node(Current_Node.Children[i]).then(C => Children.push(C)); 

	let Column_Left = this.Element({Parent: this.Container, Class: 'Task-Column'});
	let Header = this.Element({Parent: Column_Left, Class: 'Task-Header'});
	if (Current_Node.Complete !== null) this.Element({
		Parent: Header,
		Class: ['Tree-Checkbox', Current_Node.Complete ? 'Tree-Complete' : 'Tree-Incomplete'],	
		Click: async () => {
			await this.Edit.Node_Modify({Complete: !Current_Node.Complete}, Current_Index);
			return await this.Draw();
		}
	});
	this.Element({Parent: Header, Class: 'Task-Title', In: Current_Node.Title});
	if (Current_Node.Statement) this.Element({Parent: Column_Left, Type: 'xmp', Class: 'Task-Statement', In: Current_Node.Statement});
	Current_Node.Links.forEach((Link, I) => {
		this.Element({Parent: Column_Left, Type: 'button', Class: 'Task-Link', In: Link,  Click: () => {
			let Index = I;
			let Menu = this.Menu_Template();
			this.Menu_Link(Menu, Current_Index, () => {return Index}, Link, New_Index => Index = New_Index);
			this.GUI.Navigate(Menu);		
		}});

	});
	if (Current_Node.Children.length > 0) {
		let Draw_Checklist = async (Index, Node, Depth, Chain2, Invert, Parent) => {
			if (!Invert && Node.Complete === null) return;
			else if (Invert && Node.Complete !== null) return;
			let Row = this.Element({Parent: Parent, Class: 'Task-Checklist-Row'});
			let Level = Options.Depth - Depth;
			for (let i = 0; i < Level; i++) this.Element({Parent: Row, Class: 'Task-Checkbox'});
			if (Node.Complete === null) this.Element({Parent: Row, Class: 'Task-Checkbox'});
			else this.Element({Parent: Row,
				Class: ['Task-Checkbox', Node.Complete ? 'Task-Complete' : 'Task-Incomplete'],
				Click: async () => {
					await this.Edit.Node_Modify({Complete: !Node.Complete}, Index);
					return await this.Draw();
				}
			});
			this.Element({Parent: Row, Class: 'Task-Checklist-Item', In: Node.Title, Click: async () => {
				return await this.Navigate(Index);
			}, Attributes: {tabindex: '0'}, Listeners: {keydown: function (e) {
				if (e.key == 'Enter') this.click();
			}}});
			if (Chain2.includes(Index)) return;
			Chain2.push(Index);
			if (Node.Children.length > 0 && Depth > 1) for (let i = 0, l = Node.Children.length; i < l; i++) {
				let Child = await this.Edit.Node(Node.Children[i]);
				await Draw_Checklist(Node.Children[i], Child, Depth - 1, Chain2, Invert, Parent);
			}
		}
		let Depth_Explorer = async (Index, Chain2) => {
			if (Chain.includes(Index)) return 1;
			let Node;
			if (Index == Current_Index) Node = Current_Node;
			else Node = await this.Edit.Node(Index);
			if (Node.Children.length == 0) return 1;
			Chain2.push(Index);
			return Math.max(...Node.Children.map(Child => Depth_Explorer(Child, Chain2) + 1));
		}
		Options.Max_Depth = await Depth_Explorer(Current_Index, []);
		let Chain2 = [Current_Index];
		if (Children.some(Child => Child.Complete !== null)) {
			let Checklist = this.Element({Parent: Column_Left, Class: 'Task-Checklist'});
			for (let i = 0, l = Children.length; i < l; i++) await Draw_Checklist(Children[i].Index, Children[i], Options.Depth, Chain2, false, Checklist);
		}
		if (Children.some(Child => Child.Complete === null)) {
			let Checklist2 = this.Element({Parent: Column_Left, Class: 'Task-Checklist'});
			for (let i = 0, l = Children.length; i < l; i++) await Draw_Checklist(Children[i].Index, Children[i], Options.Depth, Chain2, true, Checklist2);
		}
	}
	if (Current_Node.Log.length > 0) this.Element({
		Parent: Column_Left,
		Type: 'xmp',
		Class: 'Task-Log',
		In: Current_Node.Log[Current_Node.Log.length - 1]
	});
	if (Options.Position) Column_Left.scrollTo(0, Options.Position);
	let Column_Right = this.Element({Parent: this.Container, Class: 'Task-Column'});
	let Canvas = await this.Sketch(Current_Index, Current_Node, Column_Right);

	this.Save = () => Options.Position = Column_Left.scrollTop;

	if (!this.Tab.get('Menulock')) {
		let Menu = this.Menu_Template();
		Menu[0].Escape = this.Menu_Tree();
		if (Chain.length > 0) Menu[0].ArrowLeft = this.Menu_Back();
		this.Menu_File(Menu);
		this.Menu_Edit(Menu, Current_Index, Current_Node, Parent, Last_Index);
		if (Children.length > 0) this.Menu_Task_Depth(Menu, Options);
		Menu[0].s = this.Menu_Enter_Sketch();
		Menu[0].q = this.Menu_Complete(Current_Index, Current_Node.Complete);
		Menu[0].f = this.Menu_Search(Current_Index, Current_Node);
		Menu[0].b = this.Menu_Logbook(Current_Index, Current_Node);
		Menu[0].t = this.Menu_Tabs();
		this.GUI.Navigate(Menu, true);
	}
}
View.prototype.Kanban = async function (Current_Index, Current_Node) {

	let Chain = this.Tab.get('Chain');
	let Node_Options = this.Tab.get(Current_Index);
	if (!Node_Options.Kanban) Node_Options.Kanban = Object.create(null);
	let Options = Node_Options.Kanban;
	if (!Options.Depth) Options.Depth = 1;
	if (!Options.PositionX) Options.PositionX = 0;
	if (!Options.PositionY) Options.PositionY = 0;

	let Parent = false;
	let Last_Index = null;
	let Sibling_Indexes = [];

	if (Chain.length > 0){
		Last_Index = Chain[Chain.length - 1];
		let Last_Node = await this.Edit.Node(Last_Index);
		if (Last_Node.Children.includes(Current_Index)) Parent = true;
	}
	if (Parent) {
		let Parent_Node = await this.Edit.Node(Last_Index);
		Sibling_Indexes = Parent_Node.Children;
		this.Tab.get(Last_Index).Favorite_Child = Current_Index;
	} else if (Last_Index === null) {
		Sibling_Indexes = await this.Edit.Node_Orphans(true);
	} else Sibling_Indexes = [Current_Index];
	if (!Sibling_Indexes.includes(Current_Index)) Sibling_Indexes.unshift(Current_Index);

	let Board = this.Element({Parent: this.Container, Class: 'Kanban-Board'});

	let Column_Tasklist = this.Element({Parent: Board, Class: ['Kanban-Column', 'Kanban-Tasklist']});
	let Header = this.Element({Parent: Column_Tasklist, Class: 'Task-Header'});
	if (Current_Node.Complete !== null) this.Element({
		Parent: Header,
		Class: ['Tree-Checkbox', Current_Node.Complete ? 'Tree-Complete' : 'Tree-Incomplete'],
		Click: async () => {
			await this.Edit.Node_Modify({Complete: !Current_Node.Complete}, Current_Index);
			return await this.Draw();
		}
	});
	this.Element({Parent: Header, Class: 'Task-Title', In: Current_Node.Title});
	if (Current_Node.Statement) this.Element({Parent: Column_Tasklist, Type: 'xmp', Class: 'Task-Statement', In: Current_Node.Statement});
	Current_Node.Links.forEach((Link, I) => {
		this.Element({Parent: Column_Tasklist, Type: 'button', Class: 'Task-Link', In: Link,  Click: () => {
			let Index = I;
			let Menu = this.Menu_Template();
			this.Menu_Link(Menu, Current_Index, () => {return Index}, Link, New_Index => Index = New_Index);
			this.GUI.Navigate(Menu);		
		}});

	});
	let Draw_Checklist = (Node, Parent) => {
		let Row = this.Element({Parent: Parent, Class: 'Task-Checklist-Row'});
		if (Node.Complete === null) this.Element({Parent: Row, Class: 'Task-Checkbox'});
		else this.Element({Parent: Row,
			Class: ['Task-Checkbox', Node.Complete ? 'Task-Complete' : 'Task-Incomplete'],
			Click: async () => {
				await this.Edit.Node_Modify({Complete: !Node.Complete}, Node.Index);
				return await this.Draw();
			}
		});
		this.Element({Parent: Row, Class: 'Task-Checklist-Item', In: Node.Title, Click: async () => {
			return await this.Navigate(Node.Index);
		}, Attributes: {tabindex: '0'}, Listeners: {keydown: function (e) {
			if (e.key == 'Enter') this.click();
		}}});
	}
	let Children = [];
	for (let i = 0, l = Current_Node.Children.length; i < l; i++) await this.Edit.Node(Current_Node.Children[i]).then(Node => Children.push(Node));
	if (Children.some(Child => Child.Complete !== null)) {
		let Checklist = this.Element({Parent: Column_Tasklist, Class: 'Task-Checklist'});
		Children.filter(Child => Child.Complete !== null).forEach(Child => Draw_Checklist(Child, Checklist));
	}
	if (Current_Node.Log.length > 0) this.Element({
		Parent: Column_Tasklist,
		Type: 'xmp',
		Class: 'Task-Log',
		In: Current_Node.Log[Current_Node.Log.length - 1]
	});

	let Foundfocus = false;
	let Node_Symbol = Symbol();	
	let Draw_Items = async (Node, Stage) => {
		for (let i = 0, l = Node.Children.length; i < l; i++) {
			let Child_Index = Node.Children[i];
			let Child = await this.Edit.Node(Child_Index);
			let Item = this.Element({
				Parent: Stage,
				Class: 'Kanban-Item',
				Attributes: {tabindex: '0'},
				Listeners: {keydown:function(e){if(e.key=='Enter')this.click();}},
				Click: async () => {
					Options.Focus = Child_Index;
					Options.Stage = Node.Index;
					return await this.Draw();
				}
			});
			if (Options.Focus == Child_Index) {
				Item.classList.add('Kanban-Focus');
				Options.Stage = Node.Index;
				Foundfocus = Item;
			}
			Item[Node_Symbol] = Child;
			let Header = this.Element({Parent: Item, Class: 'Kanban-Header'});
			if (Child.Complete !== null) this.Element({
				Parent: Header,
				Class: ['Kanban-Checkbox', Child.Complete ? 'Kanban-Complete' : 'Kanban-Incomplete'],
				Click: async e => {
					e.stopPropagation();
					await this.Edit.Node_Modify({Complete: !Child.Complete}, Child_Index);
					return await this.Draw();
				}
			});
			this.Element({Parent: Header, Class: 'Kanban-Item-Title', In: Child.Title});
			if (Child.Statement) this.Element({Parent: Item, Type: 'xmp', Class: 'Kanban-Statement', In: Child.Statement});
		}
	}

	let filtered = Children.filter(Child => Child.Complete === null);
	let sl = filtered.length;
	let base = new BigNumber(127);
	let inc = base.div(sl).toFixed(0);
	let colors = [];
	for (let i = 0; i < sl; i++) {
		let depth = base.minus(inc * i);
		let red = depth.toString(16);
		if (red.length == 1) red = '0' + red;
		let green = base.minus(depth).toString(16);
		if (green.length == 1) green = '0' + green;
		colors.push(`#${red}${green}00`);
	}
	for (let i = 0, l = filtered.length; i < l; i++) {
		let Stage = this.Element({Parent: Board, Class: ['Kanban-Column', 'Kanban-Stage']});
		this.Element({Parent: Stage, Class: 'Kanban-Stage-Title', In: filtered[i].Title, Attributes: {style: `background:${colors[i]};`}});
		await Draw_Items(filtered[i], Stage);
	}

	let Column_Sketch = this.Element({Parent: Board, Class: ['Kanban-Column', 'Kanban-Sketch']});
	let Canvas = this.Sketch(Current_Index, Current_Node, Column_Sketch);

	Board.scrollTo(Options.PositionX, Options.PositionY);

	this.Save = () => {
		Options.PositionX = Board.scrollLeft;
		Options.PositionY = Board.scrollTop;
	}
	
	if (!this.Tab.get('Menulock')) {
		if (Foundfocus) {
			Foundfocus.scrollIntoViewIfNeeded();
			return await this.Menu_Kanban_Item(Current_Index, Options.Stage, Options.Focus, Options);
		} else {
			Options.Focus = null;
			Options.Stage = null;
		}
		let Menu = this.Menu_Template();
		Menu[0].Escape = this.Menu_Tree();
		if (Chain.length > 0) Menu[0].ArrowLeft = this.Menu_Back();
		this.Menu_File(Menu);
		this.Menu_Edit(Menu, Current_Index, Current_Node, Parent, Last_Index);
		Menu[0].i = {
			Name: 'Navigate Items',
			Function: async () => {
				let First_Stage = Current_Node.Children.find(Stage => Stage.Children.length > 0);
				if (First_Stage) Options.Focus = First_Stage.Children[0];
				return await this.Draw();
			}
		};
		Menu[0].s = this.Menu_Enter_Sketch();
		Menu[0].q = this.Menu_Complete(Current_Index, Current_Node.Complete);
		Menu[0].f = this.Menu_Search(Current_Index, Current_Node);
		Menu[0].b = this.Menu_Logbook(Current_Index, Current_Node);
		Menu[0].t = this.Menu_Tabs();
		this.GUI.Navigate(Menu, true);
	}
}
View.prototype.Sketch = async function (Index, Node, Parent) {

	let Options = this.Tab.get(Index);
	if (!Options.Sketch) Options.Sketch = Object.assign(Object.create(null), {X: new BigNumber(-2), Y:new BigNumber(-1), Z: new BigNumber(0)});
	let Session = Options.Sketch;
	
	let Size = new BigNumber(16); // the size in pixels of one unit in the sketch area
	let Rate = new BigNumber(1.25); // raised to the power of session.Z to determine the zoom rate (using ints, rather than those pesy decimals)
	let Get_Scale = () => Size.times(Rate.pow(Session.Z));
	let Set_Zoom = (Value) => Session.Z = BigNumber.max(BigNumber.min(Value, 20), -20); // maximum and minimum zoom levels

	let Canvas = this.Element({Parent: Parent, Type: 'canvas', Class: 'Sketch'});
	let Context = Canvas.getContext('2d');

	let Width = 0;
	let Height = 0;
	
	let Draw = async Update => {
		if (Update) Node = await this.Edit.Node(Index);

		Width = Canvas.getBoundingClientRect().width;
		Canvas.width = Width;
		Height = Canvas.getBoundingClientRect().height;
		Canvas.height = Height;
		Context.clearRect(0, 0, Width, Height);

		let Scale = Get_Scale();
		let Grid_Scale = new BigNumber(0);
		let Grid_Rate = new BigNumber(2);

		while (Scale.times(Grid_Rate.pow(Grid_Scale)).lt(16)) Grid_Scale = Grid_Scale.plus(1);
		while (Scale.times(Grid_Rate.pow(Grid_Scale)).gt(128)) Grid_Scale = Grid_Scale.minus(1);

		let Grid_Increment = Grid_Rate.pow(Grid_Scale);
		let Increment = Scale.times(Grid_Increment);
		Session.Increment = Grid_Increment;

		Context.font = '16px ubuntu';

		let Color = '#86F66B44';
		Context.fillStyle = Color;
		Context.beginPath();

		let YOffsetUnits = Session.Y.plus(Grid_Increment.minus(Session.Y.mod(Grid_Increment)));
		let YOffsetPixels = YOffsetUnits.minus(Session.Y).times(Scale);

		let XOffsetWidths = [];

		for (let i = YOffsetPixels; i.lt(Height); i = i.plus(Increment)) {
			if (i.lte(15)) continue;
			let Val = (Session.Y.plus(i.div(Scale))).toString();
			let offset = Context.measureText(Val).width;
			XOffsetWidths.push(offset);
			Context.moveTo(4 + offset, i);
			Context.lineTo(Width, i);
			Context.fillText(Val, 2, i.plus(4));
		}

		let XOffsetMin = new BigNumber(XOffsetWidths.reduce((High, Val) => {return Val > High ? Val : High}, 0)).plus(2);
		let XOffsetUnits = Session.X.plus(Grid_Increment.minus(Session.X.mod(Grid_Increment)));
		let XOffsetPixels = XOffsetUnits.minus(Session.X).times(Scale);

		for (let i = XOffsetPixels; i.lt(Width); i = i.plus(Increment)) {
			if (i.lte(XOffsetMin)) continue;
			Context.moveTo(i, 15);
			Context.lineTo(i, Height);
			let Val = (Session.X.plus(i.div(Scale))).toString();
			let off = Context.measureText(Val).width / 2;
			Context.fillText(Val, i.minus(off), 12);
		}

		Session.XPlace = XOffsetUnits.plus(Grid_Increment);
		Session.YPlace = YOffsetUnits.plus(Grid_Increment);

		Context.strokeStyle = Color;
		Context.stroke();
		Auto_Detect();
		Context.beginPath();
		Node.Sketch.forEach((Item, I) => {
			let Fontrate = new BigNumber(2);
			let x = new BigNumber(Item.X).minus(Session.X).times(Scale);
			let y = new BigNumber(Item.Y).minus(Session.Y).times(Scale);
			let font = Scale.times(Fontrate.pow(Item.Z));
			Context.font = font + 'px ubuntu';
			let l = BigNumber(0);
			let w = [];
			let funcs = [];
			Item.Text.split('\n').forEach((Line, i) => {
				l = l.plus(1);
				w.push(Context.measureText(Line).width);
				funcs.push(() => Context.fillText(Line, x, y.plus(font.times(i+1))));
			});
			let NewColor = Color.substring(0, 7) + '44';
			Context.fillStyle = NewColor;
			if (Session.Selected === I) Context.fillRect(x, y, w.reduce((b,c)=>c>b?c:b), font.times(l));
			Context.fillStyle = Item.Color;
			funcs.forEach(func => func());
		});
		Context.stroke();
		if (Update) Session.Edit ? this.Menu_Sketch_Edit(true) : this.Menu_Sketch(true);
	}
	
	let Auto_Detect = () => {
		let Scale = Get_Scale();
		let X = Session.X.minus(0);
		let Y = Session.Y.minus(0);
		let Xt = new BigNumber(Width).div(Scale).plus(X);
		let Yt = new BigNumber(Height).div(Scale).plus(X);
		Session.Candidates = Node.Sketch
			.filter(Item => (X.lte(Item.X) && Xt.gt(Item.X) && Y.lte(Item.Y) && Yt.gt(Item.Y)))
			.map(Item => Node.Sketch.indexOf(Item));
	}

	Session.Edit = false;
	Session.Selected = null;
	Session.Candidates = [];
	Session.Draw = Update => Draw(Update);

	Canvas.addEventListener('wheel', e => {
		let Zoom = new BigNumber(1);
		if (e.deltaY > 0) Zoom = new BigNumber(-1);
		else if (e.deltaY < 0) Zoom = new BigNumber(1);
		let Scale = Get_Scale(); // number of pixels per unit
		let OffX = new BigNumber(e.offsetX); // offset of the mouse event in px
		let OffY = new BigNumber(e.offsetY); // offset of the mouse event in px
		Set_Zoom(Session.Z.plus(Zoom));
		let New_Scale = Get_Scale(); // the now adjusted scale of pixels per unit
		Session.X = Session.X.minus((OffX.minus(New_Scale.times(OffX.div(Scale)))).div(New_Scale));
		Session.Y = Session.Y.minus((OffY.minus(New_Scale.times(OffY.div(Scale)))).div(New_Scale))
		Draw();
	});

	let BeforeMoveX = 0;
	let BeforeMoveY = 0;
	let MoveX = 0;
	let MoveY = 0;

	let Mouse_Move = e => {
		let Scale = Get_Scale();
		Session.X = BeforeMoveX.plus(new BigNumber(MoveX - e.offsetX).div(Scale));
		Session.Y = BeforeMoveY.plus(new BigNumber(MoveY - e.offsetY).div(Scale));
		Draw();
	}

	let Mouse_Out = e => {
		Canvas.removeEventListener('mousemove', Mouse_Move);
		Canvas.removeEventListener('mouseup', Mouse_Out);
		Canvas.removeEventListener('mouseout', Mouse_Out);
	}

	Canvas.addEventListener('mousedown', e => {
		BeforeMoveX = Session.X.minus(0);
		BeforeMoveY = Session.Y.minus(0);
		MoveX = e.offsetX;
		MoveY = e.offsetY;
		Canvas.addEventListener('mousemove', Mouse_Move);
		Canvas.addEventListener('mouseup', Mouse_Out);
		Canvas.addEventListener('mouseout', Mouse_Out);
	});

	Draw();

	return Canvas;

	// -- add documentation to code for future archeologists
}
View.prototype.Logbook = async function (Index, Node) {
	this.Tab.set('Menulock', true);
	let Last_Index = Node.Log.length > 0 ? Node.Log.length - 1 : null;
	let Exit_Function = async Reboot => {
		[...this.Container.getElementsByClassName('Prompt-Background')].forEach(Element => Element.remove());
		if (!Reboot) {
			this.Tab.set('Menulock', false);
			this.GUI.Navigate(false);
			await this.Draw();
		}
	}
	let Draw_Function = async () => {
		Node = await this.Edit.Node(Index);
		let Box = this.Element({Parent: this.Container, Class: 'Prompt-Background'});
		let Book = this.Element({Parent: Box, Class: 'Logbook'});
		let Entries = Node.Log.map((Entry, I) => this.Element({
			Parent: Book,
			Type: 'xmp',
			Class: 'Log-Entry',
			In: Entry,
			Attributes: {tabindex: '0'},
			Click: () => Reload_Function(I),
			Listeners: {keydown: function (e) {if (e.key=='Enter') this.click()}}
		}));
		let Menu = this.Menu_Template();
		Menu[0].Escape = {Name: 'Escape', Function: () => {
			Exit_Function();
		}};
		if (Last_Index !== null && Entries.length > 0) {
			Entries[Last_Index].scrollIntoViewIfNeeded();
			Entries[Last_Index].focus();
			this.Menu_Log_Edit(Menu, Index, Node, Last_Index, Node.Log[Last_Index], Reload_Function);
		}
		this.Menu_File(Menu);
		this.GUI.Navigate(Menu, true);

	}
	let Reload_Function = async New_Index => {
		if (Node.Log.length == 0) Last_Index = null;
		else if (New_Index < 0) Last_Index = 0;
		else if (New_Index >= Node.Log.length) Last_Index = Node.Log.length - 1;
		else Last_Index = New_Index;
		Exit_Function(true);
		await Draw_Function();
	}
	Draw_Function();
}
View.prototype.Search = async function (Search) {
	if (!Search || Search.trim().length == 0) return;
	else Search = Search.trim();
	let Current_Index = this.Tab.get('Node');
	let Current_Node = await this.Edit.Node(Current_Index);
	let Options = this.Tab.get(Current_Node);
	let Elements = await this.Edit.Node_Search(Search, Infinity, Current_Index);
	let Chain = [];
	let Box = this.Element({Parent: this.Container, Class: 'Search-Box'});
	let Result = this.Element({Parent: Box, Class: 'Search-Result'});
	this.Element({Parent: Result, Class: 'Search-Head', In: Search, Click: async () => {
		await this.Draw();
		this.Prompt('Text', null, Search => this.Search(Search), true);
	}});
	let Table = this.Element({Parent: Result, Type: 'table', Class: 'Search-Table'});
	let Draw_Match = async Index => {
		if (Chain.includes(Index)) return null;
		else Chain.push(Index);
		let Node = Index == Current_Index ? Current_Node : await this.Edit.Node(Index);
		let Header = this.Element({Class: 'Search-Item-Head', In: [
			Node.Complete === null ? null : this.Element({Class: ['Search-Checkbox', Node.Complete ? 'Search-Complete' : 'Search-Incomplete']}),
			this.Element({Class: 'Search-Title', In: Node.Title})
		]});
		let Statement = Node.Statement ? this.Element({Class: 'Search-Statement', In: Node.Statement}) : null;
		let Cell_Box = this.Element({Class: 'Search-Item', In: [Header, Statement], Click: async () => {
			return await this.Navigate(Index);
		}, Attributes: {tabindex: '0'}, Listeners: {keydown: function (e) {
			if (e.key == 'Enter') this.click();
		}}});
		let Cell = this.Element({Type: 'td', In: Cell_Box});
		this.Element({Parent: Table, Type: 'tr', In: Cell});
	}
	Draw_Match(Current_Index);
	Elements.forEach(Element => Draw_Match(Element));
	if (!this.Tab.get('Menulock')) {
		let Menu = this.Menu_Template();
		Menu[0].Escape = {Name: 'Escape', Function: async () => this.Draw()};
		this.GUI.Navigate(Menu, true);
	}
}
View.prototype.Tabview = function () {
	let Backdrop = this.Element({Parent: this.Container, Class: 'Prompt-Background'});
	let Box = this.Element({Parent: Backdrop, Class: 'Search-Result'});
	this.Tabs.forEach(Tab => this.Element({Parent: Box, Type: 'button', Class: 'Tab', In: Tab.get('Node').Title, Click: async () => {
		return await this.Navigate(null, null, Tab);
	}}));
	let Menu = this.Menu_Template();
	Menu[0].Escape = {
		Name: 'Escape',
		Function: async () => this.Draw()
	};
	Menu[1].Enter = {
		Name: 'New Tab',
		Function: async () => this.Navigate(null, null,true)
	}
	this.Menu_File(Menu);
	this.GUI.Navigate(Menu, true);
}
View.prototype.Element = function (Options) {
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
View.prototype.Prompt = function (Type, Value, Callback, After, Silent) {
	let Exit_Function = async () => {
		[...this.Container.getElementsByClassName('Prompt-Background')].forEach(Element => Element.remove());
		this.Tab.set('Menulock', false);
		this.GUI.Navigate(false);
		if (!Silent) return await this.Draw();
		else return true;
	}
	let Go_Function = async () => {}
	let Prompt_Background = this.Element({Parent: this.Container, Class: 'Prompt-Background'});
	let Prompt_Box = this.Element({Parent: Prompt_Background, Class: 'Prompt-Box'});
	let Target;
	switch (Type) {
		case 'Text':
			Target = this.Element({Parent: Prompt_Box, Type: 'input', Class: 'Prompt-Text', Value: Value ? Value : ''});
			Go_Function = () => Callback(Target.value);
			break;
		case 'Raw':
			Target = this.Element({Parent: Prompt_Box, Type: 'textarea', Class: 'Prompt-Raw', In: Value ? Value : '',
				Attributes: {autocapitalize: false, autocomplete: false, autocorrect: false, spellcheck: false}
			});
			Go_Function = () => Callback(Target.value ? Target.value : null);
			break;
		case 'Link':
			Target = this.Element({Parent: Prompt_Box, Type: 'input', Class: 'Prompt-Text', Value: Value ? Value : ''});
			Go_Function = () => Callback(Target.value);
			this.Element({Parent: Prompt_Box, Type: 'button', Class: 'Prompt-Button', In: 'Browse',
				Click: async () => IPC.Link_New().then(Link => Link ? Target.value = Link : null)
			});
			break;
		case 'Color':
			Target = this.Element({Parent: Prompt_Box, Type: 'input', Class: 'Prompt-Color', Value: Value ? Value : '',
				Attributes: {type: 'color'}
			});
			Prompt_Box.classList.add('Prompt-Flex');
			Go_Function = () => Callback(Target.value);
			break;
	}
	let Save_Function = async () => {
		if (!After) await Go_Function();
		await Exit_Function();
		if (After) await Go_Function();
	}
	this.Element({Parent: Prompt_Box, Type: 'button', Class: 'Prompt-Button', Click: Save_Function, In: 'Go'});
	this.Element({Parent: Prompt_Box, Type: 'button', Class: 'Prompt-Button', Click: Exit_Function, In: 'Exit'});
	Target.focus();
	this.Tab.set('Menulock', true);
	let Menu = this.Menu_Template();
	this.Menu_Prompt(Menu, Go_Function, Exit_Function);
	this.GUI.Navigate(Menu);
}
View.prototype.Menu_Template = function () {
	let Shell = [{}, {}, {}, {}, []];
	return Shell;
}
View.prototype.Menu_File = function (Menu) {
	Menu[0].Control = {Name: 'File'};
	Menu[2].n = {
		Name: 'New File',
		Function: IPC.File_New
	};
	Menu[2].o = {
		Name: 'Open File',
		Function: IPC.File_Open
	};
	Menu[2].s = {
		Name: 'Save File',
		Function: () => this.Edit.Export().then(IPC.File_Save)
	};
	Menu[2].t = this.Menu_Tabs();
	if (this.Tabs.length > 1) Menu[2].Delete = this.Menu_Close_Tab();
	Menu[2].Escape = {
		Name: 'Close File',
		Function: () => this.GUI.Navigate([{}, {}, {}, {}, [{
			Name: 'Abandon Changes and Close File',
			Function: () => window.close()
		}]])
	};
}
View.prototype.Menu_Edit = async function (Menu, Index, Node, Parent, Last_Index) {
	Menu[0].Alt = {Name: 'Edit'};
	Menu[1].Enter = {
		Name: 'New Child',
		Function: () => {
			this.Prompt('Text', null, async Title => {
				let Child_Index = await this.Edit.Node_Add({Title: Title, Complete: false});
				await this.Edit.Child_Add(Child_Index, Index);
				return await this.Draw();
			});
		}
	};
	Menu[1].c = {
		Name: 'Copy Element',
		Function: () => {
			this.Clipboard = Index;
			return true;
		}
	};
	Menu[1].x = {Name: 'Cut Element'};
	if (Parent) Menu[1].x.Function =  async () => {
		let Parent = await this.Edit.Node(Last_Index);
		this.Clipboard = await this.Edit.Child_Remove(Parent.Children.indexOf(Index), Last_Index);
		return await this.Navigate(false);
	}
	Menu[1].v = {Name: 'Paste Element'};
	if (this.Clipboard !== null) Menu[1].v.Function = async () => {
		await this.Edit.Child_Add(this.Clipboard, Index);
		return await this.Draw();
	}
	Menu[1].t = {
		Name: 'Edit Title',
		Function: () => {
			this.Prompt('Text', Node.Title, async Title => {
				await this.Edit.Node_Modify({Title: Title}, Index);
				return await this.Draw();
			});
		}
	};
	Menu[1].s = {
		Name: 'Edit Statement',
		Function: () => {
			this.Prompt('Raw', Node.Statement, async Statement => {
				await this.Edit.Node_Modify({Statement: Statement}, Index);
				return await this.Draw();
			});
		}
	};
	Menu[1].q = {
		Name: 'Toggle Tracking',
		Function: async () => {
			await this.Edit.Node_Modify({Complete: Node.Complete === null ? false : null}, Index);
			return await this.Draw();
		}
	};
	Menu[1].l = {
		Name: 'New Link',
		Function: () => {
			this.Prompt('Link', null, async Link => {
				await this.Edit.Link_Add(Link, Index);
				return await this.Draw();
			});
		}
	};
	Menu[1].b = {
		Name: 'New Log Entry',
		Function: () => {
			this.Prompt('Raw', null, async Log => {
				await this.Edit.Log_Add(Log, Index);
				return await this.Draw();
			});
		}
	};
	Menu[1].m = {
		Name: 'Set Type',
		Function: () => {
			let Menu = this.Menu_Template();
			let Go = async Type => {
				await this.Edit.Node_Modify({Type: Type}, Index);
				this.GUI.Navigate(false);
				return await this.Draw();
			}
			Menu[0][1] = {Name: 'Task', Function: () => Go('Task')};
			Menu[0][2] = {Name: 'Kanban', Function: () => Go('Kanban')};
			this.GUI.Navigate(Menu);
		}
	};
	Menu[1].Delete = {Name: 'Delete'};
	if (Index != 0) Menu[1].Delete.Function = () => this.GUI.Navigate([{Enter:{
		Name:'Perminently Delete Node',
		Function: async () => {
			await this.Edit.Node_Remove(Index);
			this.GUI.Navigate(false);
			return await this.Navigate(false);
		}
	}}, {}, {}, {}, []]);
}
View.prototype.Menu_Search = function (Index, Node) {
	let Shell = {Name: 'Search'};
	if (Node.Children.length > 0) Shell.Function = () => {
		this.Prompt('Text', null, Search => this.Search(Search), true);
	}
	return Shell;
}
View.prototype.Menu_Prompt = function (Menu, Go_Function, Exit_Function) {
	Menu[1].Enter = {
		Name: 'Go',
		Function: () => Go_Function()
	};
	Menu[0].Escape = {
		Name: 'Escape',
		Function: () => Exit_Function()
	};
}
View.prototype.Menu_Tree = function () {
	return {
		Name: 'Escape Node',
		Function: async () => this.Draw(false)
	};
}
View.prototype.Menu_View = function () {
	return {
		Name: 'Enter Node',
		Function: async () => this.Draw(true)
	};
}
View.prototype.Menu_Slide_Arrows = function (Menu, Chain, Parent, Last, Siblings, Index, Children) {
	let Options = this.Tab.get(Index);
	let Child_Index = Siblings.length > 0 ? Siblings.indexOf(Index) : null;
	Menu[0].ArrowUp = {Name: 'Up'};
	Menu[1].ArrowUp = {Name: 'Move Up'};
	Menu[0].ArrowLeft = {Name: 'Back'};
	Menu[1].ArrowLeft = {Name: 'Move Back'};
	Menu[0].ArrowRight = {Name: 'Forward'};
	Menu[1].ArrowRight = {Name: 'Move Into Sibling Above'};
	Menu[0].ArrowDown = {Name: 'Down'};
	Menu[1].ArrowDown = {Name: 'Move Down'};
	if (Siblings.length > 0 && Child_Index > 0) {
		Menu[0].ArrowUp.Function = async () => {
			return await this.Navigate(Siblings[Child_Index - 1], true);
		}
		if (Parent) Menu[1].ArrowUp.Function = async () => {
			await this.Edit.Child_Move(Siblings.indexOf(Index), true, Last);
			return await this.Draw();
		}
	}
	if (!Chain.includes(Index) && Children.length > 0) Menu[0].ArrowRight.Function = async () => {
		let Favorite_Child = this.Tab.get(Index).Favorite_Child;
		if (Favorite_Child && Children.includes(Favorite_Child)) return await this.Navigate(Favorite_Child);
		else return await this.Navigate(Children[0]);
	}
	if (Siblings.length > 0 && Index != 0 && Child_Index > 0) Menu[1].ArrowRight.Function = async () => {
		if (Parent) await this.Edit.Child_Remove(Siblings.indexOf(Index), Last);
		await this.Edit.Child_Add(Index, Siblings[Child_Index - 1]);
		await this.Navigate(Siblings[Child_Index - 1], true);
		return await this.Navigate(Index);
	}
	if (Last !== null) {
		Menu[0].ArrowLeft.Function = async () => {
			return await this.Navigate(false);
		}
		Menu[1].ArrowLeft.Function = async () => {
			if (Parent) await this.Edit.Child_Remove(Siblings.indexOf(Index), Last);
			if (Parent && Chain.length > 1) await this.Edit.Child_Add(Index, Chain[Chain.length - 2]);
			else if (Chain.length > 0) await this.Edit.Child_Add(Index, Chain[Chain.length - 1]);
			return await this.Navigate(false);
		}
	}
	if (Siblings.length > 1 && Child_Index < Siblings.length - 1) {
		Menu[0].ArrowDown.Function = async () => {
			return await this.Navigate(Siblings[Child_Index + 1], true);
		}
		if (Parent) Menu[1].ArrowDown.Function = async () => {
			await this.Edit.Child_Move(Siblings.indexOf(Index), false, Last);
			return await this.Draw();
		}
	}
}
View.prototype.Menu_Back = function () {
	return {Name: 'Back', Function: async () => this.Navigate(false)}
}
View.prototype.Menu_Link = function (Menu, Index, Link_Index, Link, Callback) {
	Menu[0].Enter = {
		Name: 'Open',
		Function: () => IPC.Link_Open(Link)
	};
	Menu[1].Enter = {
		Name: 'Edit',
		Function: () => {
			this.Prompt('Link', Link, async New_Link => {
				await this.Edit.Link_Modify(Link_Index(), New_Link, Index);
				this.GUI.Navigate(false);
				return await this.Draw();
			});
		}
	};
	Menu[0].ArrowUp = {
		Name: 'Move Up',
		Function: async () => {
			let link_index = Link_Index();
			if (link_index != 0) {
				let new_index = await this.Edit.Link_Move(link_Index, true, Index);
				Callback(new_index);
			}
			return await this.Draw();
		}
	};
	Menu[0].ArrowDown = {
		Name: 'Move Down',
		Function: async () => {
			let Node = await this.Edit.Node(Index);
			let link_index = Index();
			if (link_index > Node.Links.lenght - 1) {
				let new_index = await this.Edit.Link_Move(link_index, false, Index);
				Callback(new_index);
			}
			return await this.Draw();
		}
	};
	Menu[1].Delete = {
		Name: 'Delete',
		Function: async () => {
			await this.Edit.Link_Remove(Link_Index(), Index);
			this.GUI.Navigate(false);
			return await this.Draw();
		}
	}
}
View.prototype.Menu_Tabs = function () {
	return {Name: 'Tabs', Function: () => this.Tabview()};
}
View.prototype.Menu_Close_Tab = function () {
	return {Name: 'Close Tab', Function: async () => {
		if (this.Tabs.length == 1) return;
		let Index = this.Tabs.indexOf(this.Tab);
		this.Tabs.splice(Index, 1);
		if (Index > 0) Index = Index - 1;
		return await this.Navigate(null, null, this.Tabs[Index]);
	}};
}
View.prototype.Menu_Logbook = function (Index, Node) {
	return {Name: 'Open Logbook', Function: () => this.Logbook(Index, Node)};
}
View.prototype.Menu_Log_Edit = function (Menu, Index, Node, Log_Index, Log, Callback) {
	Menu[0].Enter = {
		Name: 'Edit',
		Function: () => {
			this.Prompt('Raw', Log, async New_Log => {
				await this.Edit.Log_Modify(Log_Index, New_Log, Index);
				Callback(Log_Index);
			}, true);
		}
	};
	Menu[0].ArrowUp = {Name: 'Up'};
	Menu[1].ArrowUp = {Name: 'Move Up'};
	if (Log_Index > 0) {
		Menu[0].ArrowUp.Function = () => Callback(Log_Index - 1);
		Menu[1].ArrowUp.Function = async () => {
			await this.Edit.Log_Move(Log_Index, true, Index);
			Callback(Log_Index - 1);
		}
	}
	Menu[0].ArrowDown = {Name: 'Down'};
	Menu[1].ArrowDown = {Name: 'Move Down'};
	if (Log_Index < Node.Log.length - 1) {
		Menu[0].ArrowDown.Function = () => Callback(Log_Index + 1);
		Menu[1].ArrowDown.Function = async () => {
			await this.Edit.Log_Move(Log_Index, false, Index);
			Callback(Log_Index + 1);
		}
	}
	Menu[1].Delete = {
		Name: 'Delete',
		Function: async () => {
			await this.Edit.Log_Remove(Log_Index, Index);
			Callback(Log_Index - 1);
		}
	}
}
View.prototype.Menu_Complete = function (Index, Complete) {
	let Shell = {Name: Complete ? 'Uncheck' : 'Check'}
	if (Complete !== null) Shell.Function = async () => {
		await this.Edit.Node_Modify({Complete: !Complete}, Index);
		return await this.Draw();
	}
	return Shell;
}
View.prototype.Menu_Task_Depth = function (Menu, Options) {
	Menu[0].ArrowUp = {Name: 'Increase List Depth', Function: async () => {
		if (Options.Depth >= Options.Max_Depth -1) return false;
		Options.Depth = Options.Depth + 1;
		return await this.Draw();
	}};
	Menu[0].ArrowDown = {Name: 'Decrease List Depth', Function: async () => {
		if (Options.Depth == 1) return false;
		--Options.Depth;
		return await this.Draw();
	}};
}
View.prototype.Menu_Enter_Sketch = function () {
	return {Name: 'Sketch', Function: () => {
		this.Menu_Sketch(Menu);
	}};
}
View.prototype.Menu_Sketch = async function (Refit) {
	
	let Node_Index = this.Tab.get('Node');
	let Node = await this.Edit.Node(Node_Index);
	let Options = this.Tab.get(Node_Index);
	let Session = Options.Sketch;
	
	let Menu = this.Menu_Template();

	Menu[0].Escape = {Name: 'Exit Sketch Mode', Function: async () => this.Draw()};
	Menu[0].Enter = {Name: 'Edit Item'};
	if (Number.isInteger(Session.Selected)) Menu[0].Enter.Function = () => this.Menu_Sketch_Edit();
	Menu[1].Enter = {Name: 'New Item', Function: () => {
		this.Prompt('Raw', null, async Text => {
			let Options = {
				X: Session.XPlace.toNumber(),
				Y: Session.YPlace.toNumber(),
				Z: Session.Z.toNumber(),
				Text: Text,
				Color: 'white'
			};
			Session.Selected = await this.Edit.Sketch_Add(Options, Node_Index);
			Node = await this.Edit.Node(Node_Index);
			await this.Menu_Sketch_Edit();
			Session.Draw(true);
		}, true, true);
	}};
	Menu[0]['0'] = {Name: 'Reset Navigation', Function: () => {
		Session.X = new BigNumber(-2);
		Session.Y = new BigNumber(-1);
		Session.Z = new BigNumber(0);
		Session.Draw(true);
	}};
	Menu[0].ArrowUp = {Name: 'Up', Function: () => {
		Session.Y = Session.Y.minus(Session.Increment);
		Session.Draw(true);
	}};
	Menu[0].ArrowLeft = {Name: 'Left', Function: () => {
		Session.X = Session.X.minus(Session.Increment);
		Session.Draw(true);
	}};
	Menu[0].ArrowRight = {Name: 'Right', Function: () => {
		Session.X = Session.X.plus(Session.Increment);
		Session.Draw(true);
	}};
	Menu[0].ArrowDown = {Name: 'Down', Function: () => {
		Session.Y = Session.Y.plus(Session.Increment);
		Session.Draw(true);
	}};
	Menu[1].ArrowUp = {Name: 'Zoom In', Function: () => {
		Session.Z = Session.Z.plus(1);
		Session.Draw(true);
	}};
	Menu[1].ArrowDown = {Name: 'Zoom Out', Function: () => {
		Session.Z = Session.Z.minus(1);
		Session.Draw(true);
	}};
	if (Session.Candidates.length > 0) {
		Menu[1].ArrowRight = {Name: 'Select Next', Function: () => {
			if (
				Session.Selected === null ||
				Session.Selected == Session.Candidates[Session.Candidates.length - 1] ||
				!Session.Candidates.includes(Session.Selected)
			) Session.Selected = Session.Candidates[0];
			else Session.Selected = Session.Candidates[Session.Candidates.indexOf(Session.Selected) + 1];
			Session.Draw(true);
		}};
		Menu[1].ArrowLeft = {Name: 'Select Previous', Function: () => {
			if (
				Session.Selected === null ||
				Session.Selected == Session.Candidates[0] ||
				!Session.Candidates.includes(Session.Selected)
			) Session.Selected = Session.Candidates[Session.Candidates.length - 1];
			else Session.Selected = Session.Candidates[Session.Candidates.indexOf(Session.Selected) - 1];
			Session.Draw(true);
		}};
	}

	if (Refit) this.GUI.Navigate(false);
	this.GUI.Navigate(Menu);
}
View.prototype.Menu_Sketch_Edit = async function (Refit) {
	
	let Node_Index = this.Tab.get('Node');
	let Node = await this.Edit.Node(Node_Index);
	let Options = this.Tab.get(Node_Index);
	let Session = Options.Sketch;

	if (!Number.isInteger(Session.Selected)) return;
	let Index = Session.Selected;
	let Item = Node.Sketch[Index];

	if (!Session.Edit) {
		Session.Edit = true;
		Session.Save = structuredClone(Item);
	}

	this.Tab.set('Menulock', true);

	let Menu = this.Menu_Template();
	Menu[0].Escape = {Name: 'Save', Function: () => {
		this.Tab.set('Menulock', false);
		this.GUI.Navigate(false);
		Session.Save = null;
		Session.Selected = null;
		Session.Edit = false;
		Session.Draw(true);
	}};
	Menu[1].Escape = {Name: 'Abandon', Function: async () => {
		if (Session.Save) await this.Edit.Sketch_Modify(Index, Session.Save, Node_Index);
		Session.Save = null;
		this.Tab.set('Menulock', false);
		this.GUI.Navigate(false);
		Session.Selected = null;
		Session.Edit = false;
		Session.Draw(true);
	}};
	Menu[0].ArrowUp = {Name: 'Move Up', Function: async  () => {
		let Y = new BigNumber(Item.Y).minus(Session.Increment).toNumber();
		await this.Edit.Sketch_Modify(Index, {Y: Y}, Node_Index);
		Session.Draw(true);
	}};
	Menu[0].ArrowLeft = {Name: 'Move Left', Function: async () => {
		let X = new BigNumber(Item.X).minus(Session.Increment).toNumber();
		await this.Edit.Sketch_Modify(Index, {X: X}, Node_Index);
		Session.Draw(true);
	}};
	Menu[0].ArrowRight = {Name: 'Move Right', Function: async () => {
		let X = new BigNumber(Item.X).plus(Session.Increment).toNumber();
		await this.Edit.Sketch_Modify(Index, {X: X}, Node_Index);
		Session.Draw(true);
	}};
	Menu[0].ArrowDown = {Name: 'Move Down', Function: async () => {
		let Y = new BigNumber(Item.Y).plus(Session.Increment).toNumber();
		await this.Edit.Sketch_Modify(Index, {Y: Y}, Node_Index);
		Session.Draw(true);
	}};
	Menu[1].ArrowUp = {Name: 'Scale Up', Function: async () => {
		let Z = Item.Z + 1;
		await this.Edit.Sketch_Modify(Index, {Z: Z}, Node_Index);
		Session.Draw(true);
	}};
	Menu[1].ArrowDown = {Name: 'Scale Down', Function: async () => {
		let Z = Item.Z - 1;
		await this.Edit.Sketch_Modify(Index, {Z: Z}, Node_Index);
		Session.Draw(true);
	}};
	Menu[1].c = {Name: 'Color', Function: () => {
		this.Prompt('Color', Item.Color, async Color => {
			await this.Edit.Sketch_Modify(Index, {Color: Color}, Node_Index);
			Session.Draw(true);
		}, true, true);
	}};
	Menu[1].t = {Name: 'Edit', Function: () => {
		this.Prompt('Raw', Item.Text, async Text => {
			await this.Edit.Sketch_Modify(Index, {Text: Text}, Node_Index);
			Session.Draw(true);
		}, true, true);
	}};
	Menu[0].Delete = {Name: 'Delete Item', Function: () => {
		let Menu = this.Menu_Template();
		Menu[0].Enter ={Name: 'Delete', Function: async() => {
			await this.Edit.Sketch_Remove(Index, Node_Index) ;
			this.Tab.set('Menulock', false);
			this.GUI.Navigate(false);
			this.GUI.Navigate(false);
			Session.Save = null;
			Session.Selected = false;
			Session.Edit = false;
			Session.Draw(true);
		}};
		this.GUI.Navigate(Menu);
	}};
	if (Refit) this.GUI.Navigate(false);
	this.GUI.Navigate(Menu);
}
View.prototype.Menu_Kanban_Item = async function (Kanban_Index, Parent_Index, Node_Index, Options) {
	let Kanban_Node = await this.Edit.Node(Kanban_Index); // NODE
	let Stage_Child_Index = Kanban_Node.Children.indexOf(Parent_Index);
	let Kanban_Children = [...Kanban_Node.Children];
	for (let i = 0, l = Kanban_Children.length; i < l; i++) await this.Edit.Node(Kanban_Children[i]).then(Node => Kanban_Children[i] = Node);
	let Stages = Kanban_Children.filter(Node => Node.Complete === null);
	let Stage = Stages.findIndex(Node => Node.Index == Parent_Index);
	let Parent_Node = await this.Edit.Node(Parent_Index); // NODE
	let Node_Child_Index = Parent_Node.Children.indexOf(Node_Index); // NODE's CHILD INDEX
	let Parent_Children = [...Parent_Node.Children]; // INDEXES -> NODES
	let Item = Parent_Node.Children.indexOf(Node_Index); // CHILD INDEX of ITEM
	for (let i = 0, l = Parent_Children.length; i < l; i++) Parent_Children[i] = await this.Edit.Node(Parent_Children[i]);
	let Node = await this.Edit.Node(Node_Index); // NODE
	let Menu = this.Menu_Template();
	Menu[0].Escape = {
		Name: 'Escape Item',
		Function: async () => {
			Options.Focus = null;
			Options.Stage = null;
			return await this.Draw();
		}
	};
	Menu[0].ArrowUp = {Name: 'Up'};
	Menu[1].ArrowUp = {Name: 'Move Up'};
	if (Item > 0) {
		Menu[0].ArrowUp.Function = async () => {
			Options.Focus = Parent_Node[Item - 1];
			return await this.Draw();
		}
		Menu[1].ArrowUp.Function = async () => {
			await this.Edit.Child_Move(Node_Child_Index, true, Parent_Index);
			return await this.Draw();
		}
	}
	Menu[0].ArrowLeft = {Name: 'Left'};
	Menu[1].ArrowLeft = {Name: 'Move Back'};
	if (Stage > 0) {
		if (Stages.slice(0, Stage).some(stage => stage.Children.length > 0)) Menu[0].ArrowLeft.Function = async () => {
			let source = Stage - 1;
			while (Stages[source].Children.length == 0) --source;
			let index = Item;
			if (index >= Stages[source].Children.length) index = Stages[source].Children.length - 1;
			Options.Focus = Stages[source].Children[index];
			return await this.Draw();
		}
		Menu[1].ArrowLeft.Function = async () => {
			await this.Edit.Child_Remove(Node_Child_Index, Parent_Index);
			await this.Edit.Child_Add(Node_Index, Kanban_Node.Children[Stage_Child_Index - 1]);
			return await this.Draw();
		}
	}
	Menu[0].ArrowRight = {Name: 'Right'};
	Menu[1].ArrowRight = {Name: 'Move Forward'};
	if (Stage < Stages.length - 1) {
		if (Stages.slice(Stage).some(stage => stage.Children.length > 0)) Menu[0].ArrowRight.Function = async () => {
			let source = Stage + 1;
			while (Stages[source].Children.length == 0) ++source;
			let index = Item;
			if (index >= Stages[source].Children.length) index = Stages[source].Children.length - 1;
			Options.Focus = Stages[source].Children[index];
			return await this.Draw();
		}
		Menu[1].ArrowRight.Function = async () => {
			await this.Edit.Child_Remove(Node_Child_Index, Parent_Index);
			await this.Edit.Child_Add(Node_Index, Kanban_Node.Children[Stage_Child_Index + 1]);
			return await this.Draw();
		}
	}
	Menu[0].ArrowDown = {Name: 'Down'};
	Menu[1].ArrowDown = {Name:'Move Down'};
	if (Item < Parent_Children.length - 1) {
		Menu[0].ArrowDown.Function = async () => {
			Options.Focus = Parent_Node.Children[Item + 1];
			return await this.Draw();
		}
		Menu[1].ArrowDown.Function = async () => {
			await this.Edit.Child_Move(Node_Child_Index, false, Parent_Index);
			return await this.Draw();
		}
	}
	Menu[1].Enter = {Name: 'Enter Node', Function: async () => this.Navigate(Node)};
	if (Node.Complete !== null) Menu[0].q = {Name: Node.Complete ? 'Check' : 'Uncheck', Function: async () => {
		await this.Edit.Node_Modify({Complete: !Node.Complete}, Node_Index);
		return await this.Draw();
	}};
	Menu[1].q = {Name: 'Toggle Tracking', Function: async () => {
		await this.Edit.Node_Modify({Complete: Node.Complete === null ? false : null}, Node_Index);
		return await this.Draw();
	}};
	this.GUI.Navigate(Menu, true);
}
