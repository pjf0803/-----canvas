(function(){
	var Game = window.Game = function(params){
		//得到画布
		this.canvas = document.querySelector(params.canvasid);
		//上下文
		this.ctx = this.canvas.getContext("2d");
		//资源文件地址
		this.Rjsonurl = params.Rjsonurl;
		//帧编号
		this.fno = 0;
		//设置画布的宽度和高度，设置为和屏幕一样宽、一样高
		this.init();
		//计算一些数值
		this.basex = 6; 			//最左列的x值
		this.paddingBottom = 70; 	//最下行的y值
		this.spritewh =  (this.canvas.width - this.basex * 2) / 7; //宽度、高度，因为是正方形所以一样
		this.basey = this.canvas.height - this.spritewh * 7 - this.paddingBottom;  //最上行的y值
		
		//回调函数数组，key是帧编号，value是这个帧编号要做的事情
		this.callbacks = {}
		//读取资源
		var self = this;
		//读取资源是一个异步函数，所以我们不知道什么时候执行完毕。但是其他的事情必须等到他完毕之后再执行，必须用回调函数。
		this.loadAllResource(function(){
			//我们封装的回调函数，这里表示全部资源读取完毕
			self.start();
			//绑定监听
			self.bindEvent();
		});
	}
	//初始化，设置画布的宽度和高度
	Game.prototype.init = function(){
		//读取视口的宽度和高度，
		var windowW = document.documentElement.clientWidth;
		var windowH = document.documentElement.clientHeight;
		//验收
		if(windowW > 414){
			windowW = 414;
		}else if(windowW < 320){
			windowW = 320;
		}
		if(windowH > 736){
			windowH = 736;
		}else if(windowH < 500){
			windowH = 500;
		}
		//让canvas匹配视口
		this.canvas.width = windowW;
		this.canvas.height = windowH;
	}

	//读取资源
	Game.prototype.loadAllResource = function(callback){
		//准备一个R对象
		this.R = {};
		var self = this;	//备份
		//计数器
		var alreadyDoneNumber = 0;
		//发出请求，请求JSON文件。
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function(){
			if(xhr.readyState == 4){
				var Robj = JSON.parse(xhr.responseText);
				//遍历数组
				for (var i = 0; i < Robj.images.length; i++) {
					//创建一个同名的key
					self.R[Robj.images[i].name] = new Image();
					//请求
					self.R[Robj.images[i].name].src = Robj.images[i].url;
					//监听
					self.R[Robj.images[i].name].onload = function(){
						alreadyDoneNumber++;
						//清屏
						self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
						//提示文字
						var txt = "正在加载资源" + alreadyDoneNumber + "/" + Robj.images.length + "请稍后";
						//放置居中的位置，屏幕的黄金分割点
						self.ctx.textAlign = "center";
						self.ctx.font = "20px 微软雅黑";
						self.ctx.fillText(txt, self.canvas.width / 2 ,self.canvas.height * (1 - 0.618));
						//判断是否已经全部加载完毕
						if(alreadyDoneNumber == Robj.images.length){
							callback();
						}
					}
				};
			}
		}
		xhr.open("get",this.Rjsonurl,true);
		xhr.send(null);
	}
	//开始游戏
	Game.prototype.start = function(){
		var self = this;
		//状态机
		this.fsm = "B";	//A静稳 B检查 C消除下落补充新的
		//实例化地图
		this.map = new Map();
		//设置定时器，游戏唯一定时器
		this.timer = setInterval(function(){
			//清屏
			self.ctx.clearRect(0,0,self.canvas.width,self.canvas.height);
			//帧编号
			self.fno ++;
			//绘制背景，背景不在运动，所以它不是一个类，就是直接画上去
			self.ctx.drawImage(self.R["bg2"],0,0,self.canvas.width,self.canvas.height);
			//渲染地图，这个render里面包括精灵的update和render
			self.map.render();
			//检查当前帧编号是不是回调函数中的帧编号
			if(self.callbacks.hasOwnProperty(self.fno)){
				//执行回调函数
				self.callbacks[self.fno]();
				//当这个事件做完之后，删除这个事件
				delete self.callbacks[self.fno];
			}

			//根据有限状态机，来决定做什么事情
			switch(self.fsm){
				case "A" :

					break;
				case "B" :
					//B状态表示检查是否能消除
					if(self.map.check().length != 0){
						//如果能的话，就去C状态
						self.fsm = "C";
					}else{
						//如果不能的话，就去A状态
						self.fsm = "A";
					}
					break;
				case "C" :
					self.map.eliminate(function(){
						self.map.dropdown(6,function(){
							self.map.supply(6,function(){
								self.fsm = "B";
							});
						});
					});
					//C这个状态是一个瞬间状态，这一个状态要发出动画指令。
					//而动画执行的时候不能维持C状态的，要不然动画指令会被持续发出。
					self.fsm = "动画状态";
					break;
			}

			//下面的语句都是为了测试用的
			// 在codeTable中实时打印map的code值
			for (var i = 0; i < 7; i++) {
				for (var j = 0; j < 7; j++) {
					document.getElementById("codeTable").getElementsByTagName("tr")[i].getElementsByTagName("td")[j].innerHTML = self.map.code[i][j];
 				}
			}

			//打印帧编号
			self.ctx.font = "16px consolas";
			self.ctx.textAlign = "left";
			self.ctx.fillStyle = "gold";
			self.ctx.fillText("FNO:" + self.fno , 10 ,20);
			self.ctx.fillText("FSM:" + self.fsm , 10 ,40);
		},20);
	}

	//回调函数方法
	Game.prototype.registCallback = function(howmanyframelater,fn){
		this.callbacks[this.fno + howmanyframelater] = fn;
	}

	//监听
	Game.prototype.bindEvent = function(){
		var self = this;
		this.canvas.onmousedown = function(event){
			//如果当期那的状态机不是A状态，那么点击是无效的
			if(self.fsm != "A") return;

			var x = event.offsetX;
			var y = event.offsetY;
			//判断当前的鼠标点在了哪个元素身上
			//先根据鼠标的x值来决定点击到了第几列上，两边padding是12，精灵宽度是7分之一的屏幕宽度。
			//看x中蕴含了多少个精灵宽度，就是点击到了第几列
			var startCol = parseInt(x / self.spritewh);
			var startRow = parseInt((y - self.basey) / self.spritewh);

			//验收
			if(startCol < 0 || startCol > 6 || startRow < 0 || startRow > 6){
				return;
			}

			self.canvas.onmousemove = function(event){
				var x = event.offsetX;
				var y = event.offsetY;
				//终点元素
				var targetCol = parseInt(x / self.spritewh);
				var targetRow = parseInt((y - self.basey) / self.spritewh);
				//验收
				if(targetCol < 0 || targetCol > 6 || targetRow < 0 || targetRow > 6){
					self.canvas.onmousemove = null;
					return;
				}

				//等待鼠标移动到旁边的元素上
				//要么行号一样，列号差1；要么列号一样，行号差1。
				if(
					startRow == targetRow && Math.abs(targetCol - startCol) == 1
					||   //这是一个或者符号
					startCol == startCol && Math.abs(targetRow - startRow) == 1
				){
					self.canvas.onmousemove = null;
					//调用交换函数
					self.map.exchange(startRow,startCol,targetRow,targetCol);
				}
			}
		}

		this.canvas.onmouseup = function(){
			self.canvas.onmousemove = null;
		}
	}
})();