const View = function (Edit, Container, GUI) {
	this.Edit = Edit;
	this.Container = Container;
	this.GUI = GUI;
	this.Tabs = [];
	this.Clipboard = null;
	this.Navigate(this.Edit.Data[0], false, true);
	this.Save = null;
}
View.prototype.Navigate = function (Node, Silent, Tab) {
	if (Tab === true) {
		let New_Tab = new Map();
		New_Tab.set('Chain', []);
		New_Tab.set('Enter', false);
		New_Tab.set('Node', Node ? Node : this.Tab.get('Node'));
		New_Tab.set(New_Tab.get('Node'), Object.create(null));
		this.Tabs.push(New_Tab);
		this.Tab = New_Tab;
	} else if (Tab && this.Tabs.includes(Tab)) this.Tab = Tab;
	if (this.Tab.get('Menulock')) return;
	this.Tab.set('Active', false);
	let Chain = this.Tab.get('Chain');
	if (Node === false && Chain.length > 0) this.Tab.set('Node', Chain.pop());
	else if (Node === false) this.Tab.set('Node', this.Edit.Data[0]);
	else if (Node && Tab !== true) {
		if (!Silent && this.Tab.has('Node')) Chain.push(this.Tab.get('Node'));
		this.Tab.set('Node', Node);
		if (!this.Tab.has(Node)) this.Tab.set(Node, Object.create(null));
	}
	this.Draw();
}
View.prototype.Draw = function (Enter) {
	if (this.Save) this.Save();
	this.Save = null;
	this.Container.innerHTML = '';
	if (typeof Enter == 'boolean') this.Tab.set('Enter', Enter);
	Enter = this.Tab.get('Enter');
	let Node = this.Tab.get('Node');
	if (Enter) switch (Node.Type) {
		case 'Kanban':
			this.Kanban(Node);
			break;
		default:
			this.Task(Node);
	} else this.Tree(Node);
}
View.prototype.Tree = function (Current_Node) {

	let Chain = this.Tab.get('Chain');
	let Parent, Last, Siblings;
	let Node_Options = this.Tab.get(Current_Node);
	if (!Node_Options.Tree) Node_Options.Tree = Object.create(null);
	let Options = Node_Options.Tree;
	if (!Options.Depth) Options.Depth = 1;

	if (Chain.length > 0 && Chain[Chain.length - 1].Children.includes(Current_Node)) Parent = Chain[Chain.length - 1];
	else Parent = null;
	if (Parent) Last = Parent;
	else if (Chain.length > 0) Last = Chain[Chain.length - 1];
	else Last = null;
	if (Parent) Siblings = Parent.Children;
	else if (!Parent && !Last) Siblings = this.Edit.Node_Orphans(true);
	else Siblings = [Current_Node];
	if (!Siblings.includes(Current_Node)) Siblings.unshift(Current_Node);
	if (Parent) this.Tab.get(Parent).Favorite_Child = Current_Node;

	let Draw_Node = (Node, Highlight, Full) => {
		let Box = this.Element({Class: 'Tree-Node-Box'});
		let Item = this.Element({Parent: Box, Class: 'Tree-Node', Click: () => {
			if (Node == Current_Node) return;
			else if (Node == Chain[Chain.length - 1]) this.Navigate(false);
			else if (Siblings.includes(Node)) this.Navigate(Node, true);
			else this.Navigate(Node);
		}});
		let Warn = Chain.includes(Node);
		if (Warn || Highlight === false) Item.classList.add('Tree-Node-Warn');
		else if (Highlight === true) Item.classList.add('Tree-Node-Active');
		let Header = this.Element({Parent: Item, Class: 'Tree-Node-Header'});
		if (Node.Complete !== null) this.Element({
			Parent: Header,
			Class: ['Tree-Checkbox', Node.Complete ? 'Tree-Complete' : 'Tree-Incomplete' ],
			Click: e => {
				e.stopPropagation();
				this.Edit.Node_Modify({Complete: !Node.Complete}, Node);
				this.Draw();
			}
		});
		this.Element({Parent: Header, Class: 'Tree-Title', In: Node.Title});
		if (Full && Node.Statement) this.Element({Type: 'xmp', Parent: Item, Class: 'Tree-Statement', In: Node.Statement});
		return Box;
	}

	let Column_1 = this.Element({Parent: this.Container, Class: 'Tree-Column'});
	if (Parent) Column_1.appendChild(Draw_Node(Parent, false));
	Column_1.appendChild(Draw_Node(Current_Node, null, true));
	if (Current_Node.Links.length > 0) Current_Node.Links.forEach((Link, I) => {
		this.Element({Parent: Column_1, Type: 'button', Class: 'Tree-Link', In: Link, Click: () => {
			let Menu = this.Menu_Template();
			let Index = I;
			this.Menu_Link(Menu, Current_Node, () => {return Index}, Link, New_Index => Index = New_Index);
			this.GUI.Navigate(Menu);
		}, Attributes: {tabindex: '0'}, Listeners: {keydown: function (e) {
			if (e.key == 'Enter') this.click();
		}}});
	});
	let Canvas_Box = this.Element({Parent: Column_1, Class: 'Tree-Sketch'});
	let Canvas = this.Sketch(Current_Node, Canvas_Box);
	if (Current_Node.Log.length > 0) this.Element({
		Parent: Column_1,
		Type: 'xmp',
		Class: 'Tree-Log',
		In: Current_Node.Log[Current_Node.Log.length - 1]
	});
	if (Options.Position) Column_1.scrollTo(0, Options.Position);
	let Target;
	let Column_2 = this.Element({Parent: this.Container, Class: 'Tree-Column'});
	Siblings.forEach(Sibling => {
		let Current = Sibling == Current_Node;
		let Element = Draw_Node(Sibling, Current ? true : null);
		if (Current) {
			Element.classList.add('Tree-Active');
			Target = Element;
		}
		Column_2.appendChild(Element);
	});

	let Column_3 = this.Element({Parent: this.Container, Class: ['Tree-Column', 'Tree-Active']});
	if (!Chain.includes(Current_Node)) Current_Node.Children.forEach(Child => Column_3.appendChild(Draw_Node(Child)));

	Target.scrollIntoViewIfNeeded();
	Target.focus();

	this.Save = () => Options.Position = Column_1.scrollTop;

	if (!this.Tab.get('Menulock')) {
		let Menu = this.Menu_Template();
		this.Menu_File(Menu);
		this.Menu_Edit(Menu, Current_Node, Parent);
		this.Menu_Slide_Arrows(Menu, Chain, Parent, Last, Siblings, Current_Node, Current_Node.Children);
		Menu[0].Enter = this.Menu_View();
		Menu[0].q = this.Menu_Complete(Current_Node);
		Menu[0].f = this.Menu_Search(Current_Node);
		Menu[0].b = this.Menu_Logbook(Current_Node);
		this.GUI.Navigate(Menu, true);
	}
}
View.prototype.Task = function (Current_Node) {

	let Chain = this.Tab.get('Chain');
	let Parent, Last, Siblings;
	let Node_Options = this.Tab.get(Current_Node);
	if (!Node_Options.Task) Node_Options.Task = Object.create(null);
	let Options = Node_Options.Task;
	if (!Options.Depth) Options.Depth = 1;

	if (Chain.length > 0 && Chain[Chain.length - 1].Children.includes(Current_Node)) Parent = Chain[Chain.length - 1];
	else Parent = null;
	if (Parent) Last = Parent;
	else if (Chain.length > 0) Last = Chain[Chain.length - 1];
	else Last = null;
	if (Parent) Siblings = Parent.Children;
	else if (!Parent && !Last) Siblings = this.Edit.Node_Orphans(true);
	else Siblings = [Current_Node];
	if (!Siblings.includes(Current_Node)) Siblings.unshift(Current_Node);
	if (Parent) this.Tab.get(Parent).Favorite_Child = Current_Node;

	let Column_Left = this.Element({Parent: this.Container, Class: 'Task-Column'});
	let Header = this.Element({Parent: Column_Left, Class: 'Task-Header'});
	if (Current_Node.Complete !== null) this.Element({
		Parent: Header,
		Class: ['Tree-Checkbox', Current_Node.Complete ? 'Tree-Complete' : 'Tree-Incomplete'],	
		Click: () => {
			this.Edit.Node_Modify({Complete: !Current_Node.Complete}, Current_Node);
			this.Draw();
		}
	});
	this.Element({Parent: Header, Class: 'Task-Title', In: Current_Node.Title});
	if (Current_Node.Statement) this.Element({Parent: Column_Left, Type: 'xmp', Class: 'Task-Statement', In: Current_Node.Statement});
	Current_Node.Links.forEach((Link, I) => {
		this.Element({Parent: Column_Left, Type: 'button', Class: 'Task-Link', In: Link,  Click: () => {
			let Index = I;
			let Menu = this.Menu_Template();
			this.Menu_Link(Menu, Current_Node, () => {return Index}, Link, New_Index => Index = New_Index);
			this.GUI.Navigate(Menu);		
		}});

	});
	if (Current_Node.Children.length > 0) {
		let Draw_Checklist = (Node, Depth, Chain2, Invert, Parent) => {
			if (!Invert && Node.Complete === null) return;
			else if (Invert && Node.Complete !== null) return;
			let Row = this.Element({Parent: Parent, Class: 'Task-Checklist-Row'});
			let Level = Options.Depth - Depth;
			for (let i = 0; i < Level; i++) this.Element({Parent: Row, Class: 'Task-Checkbox'});
			if (Node.Complete === null) this.Element({Parent: Row, Class: 'Task-Checkbox'});
			else this.Element({Parent: Row,
				Class: ['Task-Checkbox', Node.Complete ? 'Task-Complete' : 'Task-Incomplete'],
				Click: () => {
					this.Edit.Node_Modify({Complete: !Node.Complete}, Node);
					this.Draw();
				}
			});
			this.Element({Parent: Row, Class: 'Task-Checklist-Item', In: Node.Title, Click: () => {
				this.Navigate(Node);
			}, Attributes: {tabindex: '0'}, Listeners: {keydown: function (e) {
				if (e.key == 'Enter') this.click();
			}}});
			if (Chain2.includes(Node)) return;
			Chain2.push(Node);
			if (Node.Children.length > 0 && Depth > 1) Node.Children.forEach(Child => {
				Draw_Checklist(Child, Depth - 1, Chain2, Invert, Parent)
			});
		}
		let Depth_Explorer = (Node, Chain2) => {
			if (Chain.includes(Node) || Node.Children.length == 0) return 1;
			Chain2.push(Node);
			return Math.max(...Node.Children.map(Child => Depth_Explorer(Child, Chain2) + 1));
		}
		Options.Max_Depth = Depth_Explorer(Current_Node, []);
		let Chain2 = [Current_Node];
		if (Current_Node.Children.some(Child => Child.Complete !== null)) {
			let Checklist = this.Element({Parent: Column_Left, Class: 'Task-Checklist'});
			Current_Node.Children.forEach(Child => Draw_Checklist(Child, Options.Depth, Chain2, false, Checklist));
		}
		if (Current_Node.Children.some(Child => Child.Complete === null)) {
			let Checklist2 = this.Element({Parent: Column_Left, Class: 'Task-Checklist'});
			Current_Node.Children.forEach(Child => Draw_Checklist(Child, Options.Depth, Chain2, true, Checklist2));
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
	let Canvas = this.Sketch(Current_Node, Column_Right);

	this.Save = () => Options.Position = Column_Left.scrollTop;

	if (!this.Tab.get('Menulock')) {
		let Menu = this.Menu_Template();
		Menu[0].Escape = this.Menu_Tree();
		if (Chain.length > 0) Menu[0].ArrowLeft = this.Menu_Back();
		this.Menu_File(Menu);
		this.Menu_Edit(Menu, Current_Node, Parent);
		if (Current_Node.Children.length > 0) this.Menu_Task_Depth(Menu, Options);
		Menu[0].s = this.Menu_Enter_Sketch();
		Menu[0].q = this.Menu_Complete(Current_Node);
		Menu[0].f = this.Menu_Search(Current_Node);
		Menu[0].b = this.Menu_Logbook(Current_Node);
		Menu[0].t = this.Menu_Tabs();
		this.GUI.Navigate(Menu, true);
	}
}
View.prototype.Kanban = function (Current_Node) {

	let Chain = this.Tab.get('Chain');
	let Parent, Last, Siblings;
	let Node_Options = this.Tab.get(Current_Node);
	if (!Node_Options.Kanban) Node_Options.Kanban = Object.create(null);
	let Options = Node_Options.Kanban;
	if (!Options.Depth) Options.Depth = 1;
	if (!Options.PositionX) Options.PositionX = 0;
	if (!Options.PositionY) Options.PositionY = 0;

	if (Chain.length > 0 && Chain[Chain.length - 1].Children.includes(Current_Node)) Parent = Chain[Chain.length - 1];
	else Parent = null;
	if (Parent) Last = Parent;
	else if (Chain.length > 0) Last = Chain[Chain.length - 1];
	else Last = null;
	if (Parent) Siblings = Parent.Children;
	else if (!Parent && !Last) Siblings = this.Edit.Node_Orphans(true);
	else Siblings = [Current_Node];
	if (!Siblings.includes(Current_Node)) Siblings.unshift(Current_Node);
	if (Parent) this.Tab.get(Parent).Favorite_Child = Current_Node;

	let Board = this.Element({Parent: this.Container, Class: 'Kanban-Board'});

	let Column_Tasklist = this.Element({Parent: Board, Class: ['Kanban-Column', 'Kanban-Tasklist']});
	let Header = this.Element({Parent: Column_Tasklist, Class: 'Task-Header'});
	if (Current_Node.Complete !== null) this.Element({
		Parent: Header,
		Class: ['Tree-Checkbox', Current_Node.Complete ? 'Tree-Complete' : 'Tree-Incomplete'],
		Click: () => {
			this.Edit.Node_Modify({Complete: !Current_Node.Complete}, Current_Node);
			this.Draw();
		}
	});
	this.Element({Parent: Header, Class: 'Task-Title', In: Current_Node.Title});
	if (Current_Node.Statement) this.Element({Parent: Column_Tasklist, Type: 'xmp', Class: 'Task-Statement', In: Current_Node.Statement});
	Current_Node.Links.forEach((Link, I) => {
		this.Element({Parent: Column_Tasklist, Type: 'button', Class: 'Task-Link', In: Link,  Click: () => {
			let Index = I;
			let Menu = this.Menu_Template();
			this.Menu_Link(Menu, Current_Node, () => {return Index}, Link, New_Index => Index = New_Index);
			this.GUI.Navigate(Menu);		
		}});

	});
	let Draw_Checklist = (Node, Parent) => {
		let Row = this.Element({Parent: Parent, Class: 'Task-Checklist-Row'});
		if (Node.Complete === null) this.Element({Parent: Row, Class: 'Task-Checkbox'});
		else this.Element({Parent: Row,
			Class: ['Task-Checkbox', Node.Complete ? 'Task-Complete' : 'Task-Incomplete'],
			Click: () => {
				this.Edit.Node_Modify({Complete: !Node.Complete}, Node);
				this.Draw();
			}
		});
		this.Element({Parent: Row, Class: 'Task-Checklist-Item', In: Node.Title, Click: () => {
			this.Navigate(Node);
		}, Attributes: {tabindex: '0'}, Listeners: {keydown: function (e) {
			if (e.key == 'Enter') this.click();
		}}});
	}
	if (Current_Node.Children.some(Child => Child.Complete !== null)) {
		let Checklist = this.Element({Parent: Column_Tasklist, Class: 'Task-Checklist'});
		Current_Node.Children.filter(Child => Child.Complete !== null).forEach(Child => Draw_Checklist(Child, Checklist));
	}
	if (Current_Node.Log.length > 0) this.Element({
		Parent: Column_Tasklist,
		Type: 'xmp',
		Class: 'Task-Log',
		In: Current_Node.Log[Current_Node.Log.length - 1]
	});

	let Foundfocus = false;
	let Node_Symbol = Symbol();	
	let Draw_Items = (Node, Stage) => {
		Node.Children.forEach(Child => {
			let Item = this.Element({
				Parent: Stage,
				Class: 'Kanban-Item',
				Attributes: {tabindex: '0'},
				Listeners: {keydown:function(e){if(e.key=='Enter')this.click();}},
				Click: () => {
					Options.Focus = Child;
					Options.Stage = Node;
					this.Draw();
				}
			});
			if (Options.Focus == Child) {
				Item.classList.add('Kanban-Focus');
				Options.Stage = Node;
				Foundfocus = Item;
			}
			Item[Node_Symbol] = Child;
			let Header = this.Element({Parent: Item, Class: 'Kanban-Header'});
			if (Child.Complete !== null) this.Element({
				Parent: Header,
				Class: ['Kanban-Checkbox', Child.Complete ? 'Kanban-Complete' : 'Kanban-Incomplete'],
				Click: e => {
					e.stopPropagation();
					this.Edit.Node_Modify({Complete: !Child.Complete}, Child);
					this.Draw();
				}
			});
			this.Element({Parent: Header, Class: 'Kanban-Item-Title', In: Child.Title});
			if (Child.Statement) this.Element({Parent: Item, Type: 'xmp', Class: 'Kanban-Statement', In: Child.Statement});
		});
	}

	let sl = Current_Node.Children.filter(Child => Child.Complete == null).length;
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
	Current_Node.Children.filter(Child => Child.Complete === null).forEach((Child, i) => {
		let Stage = this.Element({
			Parent: Board,
			Class: ['Kanban-Column', 'Kanban-Stage'],
		});
		this.Element({Parent: Stage, Class: 'Kanban-Stage-Title', In: Child.Title, Attributes: {style: `background:${colors[i]};`}});
		Draw_Items(Child, Stage);
	});

	let Column_Sketch = this.Element({Parent: Board, Class: ['Kanban-Column', 'Kanban-Sketch']});
	let Canvas = this.Sketch(Current_Node, Column_Sketch);

	Board.scrollTo(Options.PositionX, Options.PositionY);

	this.Save = () => {
		Options.PositionX = Board.scrollLeft;
		Options.PositionY = Board.scrollTop;
	}
	
	if (!this.Tab.get('Menulock')) {
		if (Foundfocus) {
			Foundfocus.scrollIntoViewIfNeeded();
			return this.Menu_Kanban_Item(Current_Node, Options.Stage, Options.Focus, Options);
		} else {
			Options.Focus = null;
			Options.Stage = null;
		}
		let Menu = this.Menu_Template();
		Menu[0].Escape = this.Menu_Tree();
		if (Chain.length > 0) Menu[0].ArrowLeft = this.Menu_Back();
		this.Menu_File(Menu);
		this.Menu_Edit(Menu, Current_Node, Parent);
		Menu[0].i = {
			Name: 'Navigate Items',
			Function: () => {
				let First_Stage = Current_Node.Children.find(Stage => Stage.Children.length > 0);
				if (First_Stage) Options.Focus = First_Stage.Children[0];
				this.Draw();
			}
		};
		Menu[0].s = this.Menu_Enter_Sketch();
		Menu[0].q = this.Menu_Complete(Current_Node);
		Menu[0].f = this.Menu_Search(Current_Node);
		Menu[0].b = this.Menu_Logbook(Current_Node);
		Menu[0].t = this.Menu_Tabs();
		this.GUI.Navigate(Menu, true);
	}
}
View.prototype.Sketch = function (Node, Parent) {

	let Options = this.Tab.get(Node);
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
	
	let Draw = Update => {
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
		/*if (Session.Z.eq(0)) Color = '#FFFFFF';
		else if (Session.Z.lt(0)) {
			let Red = BigNumber.max(Session.Z, -15).abs();
			let HexR = Red.toString(16);
			let Diff = new BigNumber(15).minus(Red).toString(16);
			Color = '#FF' + Diff + Diff + Diff + Diff; 
		} else if (Session.Z.gt(0)) {
			let Blue = BigNumber.min(Session.Z, 15);
			let HexB = Blue.toString(16);
			let Diff = new BigNumber(15).minus(Blue).toString(16);
			Color = '#' + Diff + Diff + Diff + Diff + 'FF';
		}
		Color += '44';*/
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
		Node.Sketch.forEach(Item => {
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
			if (Session.Selected && Session.Selected == Item) Context.fillRect(x, y, w.reduce((b,c)=>c>b?c:b), font.times(l));
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
		Session.Candidates = Node.Sketch.filter(Item => (X.lte(Item.X) && Xt.gt(Item.X) && Y.lte(Item.Y) && Yt.gt(Item.Y)));
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
View.prototype.Logbook = function (Node) {
	this.Tab.set('Menulock', true);
	let Index = Node.Log.length > 0 ? Node.Log.length - 1 : null;
	let Exit_Function = Reboot => {
		[...this.Container.getElementsByClassName('Prompt-Background')].forEach(Element => Element.remove());
		if (!Reboot) {
			this.Tab.set('Menulock', false);
			this.GUI.Navigate(false);
			this.Draw();
		}
	}
	let Draw_Function = () => {
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
		if (Index !== null && Entries.length > 0) {
			Entries[Index].scrollIntoViewIfNeeded();
			Entries[Index].focus();
			this.Menu_Log_Edit(Menu, Node, Index, Node.Log[Index], Reload_Function);
		}
		this.Menu_File(Menu);
		this.GUI.Navigate(Menu, true);

	}
	let Reload_Function = New_Index => {
		if (Node.Log.length == 0) Index = null;
		else if (New_Index < 0) Index = 0;
		else if (New_Index >= Node.Log.length) Index = Node.Log.length - 1;
		else Index = New_Index;
		Exit_Function(true);
		Draw_Function();
	}
	Draw_Function();
}
View.prototype.Search = function (Search) {
	if (!Search || Search.trim().length == 0) return;
	else Search = Search.trim();
	let Current_Node = this.Tab.get('Node');
	let Options = this.Tab.get(Current_Node);
	let Elements = this.Edit.Node_Search(Search, Infinity, Current_Node);
	let Chain = [];
	let Box = this.Element({Parent: this.Container, Class: 'Search-Box'});
	let Result = this.Element({Parent: Box, Class: 'Search-Result'});
	this.Element({Parent: Result, Class: 'Search-Head', In: Search, Click: () => {
		this.Draw();
		this.Prompt('Text', null, Search => this.Search(Search), true);
	}});
	let Table = this.Element({Parent: Result, Type: 'table', Class: 'Search-Table'});
	let Draw_Match = Node => {
		if (Chain.includes(Node)) return null;
		else Chain.push(Node);
		let Header = this.Element({Class: 'Search-Item-Head', In: [
			Node.Complete === null ? null : this.Element({Class: ['Search-Checkbox', Node.Complete ? 'Search-Complete' : 'Search-Incomplete']}),
			this.Element({Class: 'Search-Title', In: Node.Title})
		]});
		let Statement = Node.Statement ? this.Element({Class: 'Search-Statement', In: Node.Statement}) : null;
		let Cell_Box = this.Element({Class: 'Search-Item', In: [Header, Statement], Click: () => {
			this.Navigate(Node);
		}, Attributes: {tabindex: '0'}, Listeners: {keydown: function (e) {
			if (e.key == 'Enter') this.click();
		}}});
		let Cell = this.Element({Type: 'td', In: Cell_Box});
		this.Element({Parent: Table, Type: 'tr', In: Cell});
	}
	Draw_Match(Current_Node);
	Elements.forEach(Element => Draw_Match(Element));
	if (!this.Tab.get('Menulock')) {
		let Menu = this.Menu_Template();
		Menu[0].Escape = {Name: 'Escape', Function: () => this.Draw()};
		this.Menu_File(Menu);
		this.GUI.Navigate(Menu, true);
	}
}
View.prototype.Tabview = function () {
	let Backdrop = this.Element({Parent: this.Container, Class: 'Prompt-Background'});
	let Box = this.Element({Parent: Backdrop, Class: 'Search-Result'});
	this.Tabs.forEach(Tab => this.Element({Parent: Box, Type: 'button', Class: 'Tab', In: Tab.get('Node').Title, Click: () => {
		this.Navigate(null, null, Tab);
	}}));
	let Menu = this.Menu_Template();
	Menu[0].Escape = {
		Name: 'Escape',
		Function: () => this.Draw()
	};
	Menu[1].Enter = {
		Name: 'New Tab',
		Function: () => this.Navigate(null, null,true)
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
	let Exit_Function = () => {
		[...this.Container.getElementsByClassName('Prompt-Background')].forEach(Element => Element.remove());
		this.Tab.set('Menulock', false);
		this.GUI.Navigate(false);
		if (!Silent) this.Draw();
	}
	let Go_Function = () => {}
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
	let Save_Function = () => {
		if (!After) Go_Function();
		Exit_Function();
		if (After) Go_Function();
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
		Function: () => IPC.File_Save(this.Edit.Export())
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
View.prototype.Menu_Edit = function (Menu, Node, Parent) {
	Menu[0].Alt = {Name: 'Edit'};
	Menu[1].Enter = {
		Name: 'New Child',
		Function: () => {
			this.Prompt('Text', null, Title => {
				let Child = this.Edit.Node_Add({Title: Title, Complete: false});
				this.Edit.Child_Add(Child, Node);
				this.Draw();
			});
		}
	};
	Menu[1].c = {
		Name: 'Copy Element',
		Function: () => {
			this.Clipboard = Node;
			return true;
		}
	};
	Menu[1].x = {Name: 'Cut Element'};
	if (Parent) Menu[1].x.Function =  () => {
		this.Clipboard = Parent.Children.splice(Parent.Children.indexOf(Node), 1)[0];
		this.Navigate(false);
		return true;
	}
	Menu[1].v = {Name: 'Paste Element'};
	if (this.Clipboard) Menu[1].v.Function = () => {
		this.Edit.Child_Add(this.Clipboard, Node);
		this.Draw();
		return true;
	}
	Menu[1].t = {
		Name: 'Edit Title',
		Function: () => {
			this.Prompt('Text', Node.Title, Title => {
				this.Edit.Node_Modify({Title: Title}, Node);
				this.Draw();
			});
		}
	};
	Menu[1].s = {
		Name: 'Edit Statement',
		Function: () => {
			this.Prompt('Raw', Node.Statement, Statement => {
				this.Edit.Node_Modify({Statement: Statement}, Node);
				this.Draw();
			});
		}
	};
	Menu[1].q = {
		Name: 'Toggle Tracking',
		Function: () => {
			this.Edit.Node_Modify({Complete: Node.Complete === null ? false : null}, Node);
			this.Draw();
		}
	};
	Menu[1].l = {
		Name: 'New Link',
		Function: () => {
			this.Prompt('Link', null, Link => {
				this.Edit.Link_Add(Link, Node);
				this.Draw();
			});
		}
	};
	Menu[1].b = {
		Name: 'New Log Entry',
		Function: () => {
			this.Prompt('Raw', null, Log => {
				this.Edit.Log_Add(Log, Node);
				this.Draw();
			});
		}
	};
	Menu[1].m = {
		Name: 'Set Type',
		Function: () => {
			let Menu = this.Menu_Template();
			let Go = Type => {
				this.Edit.Node_Modify({Type: Type}, Node);
				this.GUI.Navigate(false);
				this.Draw();
			}
			Menu[0][1] = {Name: 'Task', Function: () => Go('Task')};
			Menu[0][2] = {Name: 'Kanban', Function: () => Go('Kanban')};
			this.GUI.Navigate(Menu);
		}
	};
	Menu[1].Delete = {Name: 'Delete'};
	if (Node != this.Edit.Data[0]) Menu[1].Delete.Function = () => this.GUI.Navigate([{Enter:{Name:'Perminently Delete Node', Function: () => {
		this.Edit.Node_Remove(Node);
		this.GUI.Navigate(false);
		this.Navigate(false);
	}}}, {}, {}, {}, []]);
}
View.prototype.Menu_Search = function (Node) {
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
View.prototype.Menu_Tree = function (Node) {
	return {
		Name: 'Escape Node',
		Function: () => this.Draw(false)
	};
}
View.prototype.Menu_View = function (Node) {
	return {
		Name: 'Enter Node',
		Function: () => this.Draw(true)
	};
}
View.prototype.Menu_Slide_Arrows = function (Menu, Chain, Parent, Last, Siblings, Node, Children) {
	let Options = this.Tab.get(Node);
	let Index = Siblings ? Siblings.indexOf(Node) : null;
	Menu[0].ArrowUp = {Name: 'Up'};
	Menu[1].ArrowUp = {Name: 'Move Up'};
	Menu[0].ArrowLeft = {Name: 'Back'};
	Menu[1].ArrowLeft = {Name: 'Move Back'};
	Menu[0].ArrowRight = {Name: 'Forward'};
	Menu[1].ArrowRight = {Name: 'Move Into Sibling Above'};
	Menu[0].ArrowDown = {Name: 'Down'};
	Menu[1].ArrowDown = {Name: 'Move Down'};
	if (Siblings && Index > 0) {
		Menu[0].ArrowUp.Function = () => {
			this.Navigate(Siblings[Index - 1], true);
		}
		if (Parent) Menu[1].ArrowUp.Function = () => {
			this.Edit.Child_Move(Node, true, Parent);
			this.Draw();
		}
	}
	if (!Chain.includes(Node) && Children.length > 0) Menu[0].ArrowRight.Function = () => {
		let Favorite_Child = this.Tab.get(Node).Favorite_Child;
		if (Favorite_Child && Node.Children.includes(Favorite_Child)) this.Navigate(Favorite_Child);
		else this.Navigate(Children[0]);
	}
	if (Siblings && Node != this.Edit.Data[0] && Index > 0) Menu[1].ArrowRight.Function = () => {
		if (Parent) this.Edit.Child_Remove(Node, Parent);
		this.Edit.Child_Add(Node, Siblings[Index - 1]);
		this.Navigate(Siblings[Index - 1], true);
		this.Navigate(Node);
	}
	if (Last) {
		Menu[0].ArrowLeft.Function = () => {
			this.Navigate(false);
		}
		Menu[1].ArrowLeft.Function = () => {
			if (Parent) this.Edit.Child_Remove(Node, Parent);
			if (Parent && Chain.length > 1) this.Edit.Child_Add(Node, Chain[Chain.length - 2]);
			else if (Chain.length > 0) this.Edit.Child_Add(Node, Chain[Chain.length - 1]);
			this.Navigate(false);
		}
	}
	if (Siblings && Index < Siblings.length - 1) {
		Menu[0].ArrowDown.Function = () => {
			this.Navigate(Siblings[Index + 1], true);
		}
		if (Parent) Menu[1].ArrowDown.Function = () => {
			this.Edit.Child_Move(Node, false, Parent);
			this.Draw();
		}
	}
}
View.prototype.Menu_Back = function () {
	return {Name: 'Back', Function: () => this.Navigate(false)}
}
View.prototype.Menu_Link = function (Menu, Node, Index, Link, Callback) {
	Menu[0].Enter = {
		Name: 'Open',
		Function: () => IPC.Link_Open(Link)
	};
	Menu[1].Enter = {
		Name: 'Edit',
		Function: () => {
			this.Prompt('Link', Link, New_Link => {
				this.Edit.Link_Modify(Index(), New_Link, Node);
				this.GUI.Navigate(false);
				this.Draw();
			});
		}
	};
	Menu[0].ArrowUp = {
		Name: 'Move Up',
		Function: () => {
			if (this.Edit.Link_Move(Index(), true, Node)) Callback(Index() - 1);
			this.Draw();
		}
	};
	Menu[0].ArrowDown = {
		Name: 'Move Down',
		Function: () => {
			if (this.Edit.Link_Move(Index(), false, Node)) Callback(Index() + 1);
			this.Draw();
		}
	};
	Menu[1].Delete = {
		Name: 'Delete',
		Function: () => {
			this.Edit.Link_Remove(Index(), Node);
			this.GUI.Navigate(false);
			this.Draw();
		}
	}
}
View.prototype.Menu_Tabs = function () {
	return {Name: 'Tabs', Function: () => this.Tabview()};
}
View.prototype.Menu_Close_Tab = function () {
	return {Name: 'Close Tab', Function: () => {
		if (this.Tabs.length == 1) return;
		let Index = this.Tabs.indexOf(this.Tab);
		this.Tabs.splice(Index, 1);
		if (Index > 0) Index = Index - 1;
		this.Navigate(null, null, this.Tabs[Index]);
	}};
}
View.prototype.Menu_Logbook = function (Node) {
	return {Name: 'Open Logbook', Function: () => {this.Logbook(Node)}};
}
View.prototype.Menu_Log = function (Node) {
	return {Name: 'New Log Entry', Function: () => this.Prompt('Raw', null, Log => {
		this.Edit.Log_Add(Log, Node);
		this.Draw();
	})};
}
View.prototype.Menu_Log_Edit = function (Menu, Node, Index, Log, Callback) {
	Menu[0].Enter = {
		Name: 'Edit',
		Function: () => {
			this.Prompt('Raw', Log, New_Log => {
				this.Edit.Log_Modify(Index, New_Log, Node);
				Callback(Index);
			}, true);
		}
	};
	Menu[0].ArrowUp = {Name: 'Up'};
	Menu[1].ArrowUp = {Name: 'Move Up'};
	if (Index > 0) {
		Menu[0].ArrowUp.Function = () => Callback(Index - 1);
		Menu[1].ArrowUp.Function = () => {
			this.Edit.Log_Move(Index, true, Node);
			Callback(Index - 1);
		}
	}
	Menu[0].ArrowDown = {Name: 'Down'};
	Menu[1].ArrowDown = {Name: 'Move Down'};
	if (Index < Node.Log.length - 1) {
		Menu[0].ArrowDown.Function = () => Callback(Index + 1);
		Menu[1].ArrowDown.Function = () => {
			this.Edit.Log_Move(Index, false, Node);
			Callback(Index + 1);
		}
	}
	Menu[1].Delete = {
		Name: 'Delete',
		Function: () => {
			this.Edit.Log_Remove(Index, Node);
			Callback(Index - 1);
		}
	}
}
View.prototype.Menu_Complete = function (Node) {
	let Shell = {Name: Node.Complete ? 'Uncheck' : 'Check'}
	if (Node.Complete !== null) Shell.Function = () => {
		this.Edit.Node_Modify({Complete: !Node.Complete}, Node);
		this.Draw();
	}
	return Shell;
}
View.prototype.Menu_Task_Depth = function (Menu, Options) {
	Menu[0].ArrowUp = {Name: 'Increase List Depth', Function: () => {
		if (Options.Depth >= Options.Max_Depth -1) return false;
		Options.Depth = Options.Depth + 1;
		this.Draw();
	}};
	Menu[0].ArrowDown = {Name: 'Decrease List Depth', Function: () => {
		if (Options.Depth == 1) return false;
		--Options.Depth;
		this.Draw();
		return true;
	}};
}
View.prototype.Menu_Enter_Sketch = function () {
	return {Name: 'Sketch', Function: () => {
		this.Menu_Sketch(Menu);
	}};
}
View.prototype.Menu_Sketch = function (Refit) {
	
	let Node = this.Tab.get('Node');
	let Options = this.Tab.get(Node);
	let Session = Options.Sketch;
	
	let Menu = this.Menu_Template();

	Menu[0].Escape = {Name: 'Exit Sketch Mode', Function: () => this.Draw()};
	Menu[0].Enter = {Name: 'Edit Item'};
	if (Session.Selected) Menu[0].Enter.Function = () => this.Menu_Sketch_Edit();
	Menu[1].Enter = {Name: 'New Item', Function: () => {
		this.Prompt('Raw', null, Text => {
			let Options = {X: Session.XPlace.toNumber(), Y: Session.YPlace.toNumber(), Z: Session.Z.toNumber(), Text: Text, Color: 'white'};
			this.Edit.Sketch_Add(Options, Node);
			Session.Selected = Node.Sketch[Node.Sketch.length - 1];
			this.Menu_Sketch_Edit();
			Session.Draw();
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
View.prototype.Menu_Sketch_Edit = function (Refit) {
	
	let Node = this.Tab.get('Node');
	let Options = this.Tab.get(Node);
	let Session = Options.Sketch;

	if (!Session.Selected) return;
	let Index = Node.Sketch.indexOf(Session.Selected);

	if (!Session.Edit) {
		Session.Edit = true;
		Session.Save = structuredClone(Session.Selected);
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
	Menu[1].Escape = {Name: 'Abandon', Function: () => {
		if (Session.Save) this.Edit.Sketch_Modify(Index, Session.Save, Node);
		Session.Save = null;
		this.Tab.set('Menulock', false);
		this.GUI.Navigate(false);
		Session.Selected = null;
		Session.Edit = false;
		Session.Draw(true);
	}};
	Menu[0].ArrowUp = {Name: 'Move Up', Function: () => {
		let Y = new BigNumber(Session.Selected.Y).minus(Session.Increment).toNumber();
		this.Edit.Sketch_Modify(Index, {Y: Y}, Node);
		Session.Draw(true);
	}};
	Menu[0].ArrowLeft = {Name: 'Move Left', Function: () => {
		let X = new BigNumber(Session.Selected.X).minus(Session.Increment).toNumber();
		this.Edit.Sketch_Modify(Index, {X: X}, Node);
		Session.Draw(true);
	}};
	Menu[0].ArrowRight = {Name: 'Move Right', Function: () => {
		let X = new BigNumber(Session.Selected.X).plus(Session.Increment).toNumber();
		this.Edit.Sketch_Modify(Index, {X: X}, Node);
		Session.Draw(true);
	}};
	Menu[0].ArrowDown = {Name: 'Move Down', Function: () => {
		let Y = new BigNumber(Session.Selected.Y).plus(Session.Increment).toNumber();
		this.Edit.Sketch_Modify(Index, {Y: Y}, Node);
		Session.Draw(true);
	}};
	Menu[1].ArrowUp = {Name: 'Scale Up', Function: () => {
		let Z = Session.Selected.Z + 1;
		this.Edit.Sketch_Modify(Index, {Z: Z}, Node);
		Session.Draw(true);
	}};
	Menu[1].ArrowDown = {Name: 'Scale Down', Function: () => {
		let Z = Session.Selected.Z - 1;
		this.Edit.Sketch_Modify(Index, {Z: Z}, Node);
		Session.Draw(true);
	}};
	Menu[1].c = {Name: 'Color', Function: () => {
		let Item = Session.Selected;
		this.Prompt('Color', Item.Color, Color => {
			this.Edit.Sketch_Modify(Index, {Color: Color}, Node);
			Session.Draw(true);
		}, true, true);
	}};
	Menu[1].t = {Name: 'Edit', Function: () => {
		let Item = Session.Selected;
		this.Prompt('Raw', Item.Text, Text => {
			this.Edit.Sketch_Modify(Index, {Text: Text}, Node);
			Session.Draw(true);
		}, true, true);
	}};
	Menu[0].Delete = {Name: 'Delete Item', Function: () => {
		let Menu = this.Menu_Template();
		Menu[0].Enter ={Name: 'Delete', Function: () => {
			this.Edit.Sketch_Remove(Index, Node) ;
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
View.prototype.Menu_Kanban_Item = function (Kanban, Parent, Node, Options) {
	let Stages = Kanban.Children.filter(Child => Child.Complete === null);
	let Stage = Stages.indexOf(Parent);
	let Items = Parent.Children;
	let Item = Items.indexOf(Node);
	let Menu = this.Menu_Template();
	Menu[0].Escape = {
		Name: 'Escape Item',
		Function: () => {
			Options.Focus = null;
			Options.Stage = null;
			this.Draw();
		}
	};
	Menu[0].ArrowUp = {Name: 'Up'};
	Menu[1].ArrowUp = {Name: 'Move Up'};
	if (Item > 0) {
		Menu[0].ArrowUp.Function = () => {
			Options.Focus = Items[Item - 1];
			this.Draw();
		}
		Menu[1].ArrowUp.Function = () => {
			this.Edit.Child_Move(Node, true, Parent);
			this.Draw();
		}
	}
	Menu[0].ArrowLeft = {Name: 'Left'};
	Menu[1].ArrowLeft = {Name: 'Move Back'};
	if (Stage > 0) {
		if (Stages.slice(0, Stage).some(stage => stage.Children.length > 0)) Menu[0].ArrowLeft.Function = () => {
			let source = Stage - 1;
			while (Stages[source].length == 0) --source;
			let index = Item;
			if (index >= Stages[source].Children.length) index = Stages[source].Children.length - 1;
			Options.Focus = Stages[source].Children[index];
			this.Draw();
		}
		Menu[1].ArrowLeft.Function = () => {
			this.Edit.Child_Remove(Node, Parent);
			this.Edit.Child_Add(Node, Stages[Stage - 1]);
			this.Draw();
		}
	}
	Menu[0].ArrowRight = {Name: 'Right'};
	Menu[1].ArrowRight = {Name: 'Move Forward'};
	if (Stage < Stages.length - 1) {
		if (Stages.slice(Stage).some(stage => stage.Children.length > 0)) Menu[0].ArrowRight.Function = () => {
			let source = Stage + 1;
			while (Stages[source].Children.length == 0) ++source;
			let index = Item;
			if (index >= Stages[source].Children.length) index = Stages[source].Children.length - 1;
			Options.Focus = Stages[source].Children[index];
			this.Draw();
		}
		Menu[1].ArrowRight.Function = () => {
			this.Edit.Child_Remove(Node, Parent);
			this.Edit.Child_Add(Node, Stages[Stage + 1]);
			this.Draw();
		}
	}
	Menu[0].ArrowDown = {Name: 'Down'};
	Menu[1].ArrowDown = {Name:'Move Down'};
	if (Item < Items.length - 1) {
		Menu[0].ArrowDown.Function = () => {
			Options.Focus = Items[Item + 1];
			this.Draw();
		}
		Menu[1].ArrowDown.Function = () => {
			this.Edit.Child_Move(Node, false, Parent);
			this.Draw();
		}
	}
	Menu[1].Enter = {Name: 'Enter Node', Function: () => this.Navigate(Node)};
	if (Node.Complete !== null) Menu[0].q = {Name: Node.Complete ? 'Check' : 'Uncheck', Function: () => {
		this.Edit.Node_Modify({Complete: !Node.Complete}, Node);
		this.Draw();
	}};
	Menu[1].q = {Name: 'Toggle Tracking', Function: () => {
		this.Edit.Node_Modify({Complete: Node.Complete === null ? false : null}, Node);
		this.Draw();
	}};
	this.GUI.Navigate(Menu, true);
}
