<script>
	import { Router, Route } 	from "svelte-navigator";
	import SDKGuide2 			from "./SDKGuide2.svelte";	
	import SDKGuide1P1 			from "./sdkguide1/page1.svelte";	
	import SDKGuide1P2 			from "./sdkguide1/page2.svelte";	
	import SDKGuide1P3 			from "./sdkguide1/page3.svelte";	
</script>

<main>
	<div class='top-cont'><span class='nav-open-menu' id='open-menu' onclick='openMenu()'>메뉴 펼치기</span></div>
	<div class='nav' id='left-menu'>
		<Router>
			<ul class='nav-no-bullets'>
				<li>
					<ul class='nav-link-li'>
						<i class="bi bi-gear nav-icon"></i>SDK 연동 가이드 
						<li class='sdk'>iOS SDK</li>
						<ul class='sdk'>
							<a href="/sdkguide1p1"><li>페트리 초기화</li></a>
							<a href="/sdkguide1p2"><li>딥 링크 이벤트 분석</li></a>
							<a href="/sdkguide1p3"><li>이벤트 분석</li></a>
						</ul>
						<a href ="/sdkguide2"><li class='sdk'>Android SDK</li></a>
					</ul>
				</li>
			</ul>
		</Router> 

	</div>
	<div class='cont' id='main'>
		

		<div class='mid-cont'>
			<Router>

				<!-- Router : SDK Guide 2 -->
				<Route path="/sdkguide2" primary={false}>
					<SDKGuide2/>
				</Route>

				<!-- Router : SDK Guide 1 - Page 1 -->
				<Route path="/sdkguide1p1" primary={false}>
					<SDKGuide1P1/>
				</Route>

				<!-- Router : SDK Guide 1 - Page 2 -->
				<Route path="/sdkguide1p2" primary={false}>
					<SDKGuide1P2/>
				</Route>

				<!-- Router : SDK Guide 1 - Page 3 -->
				<Route path="/sdkguide1p3" primary={false}>
					<SDKGuide1P3/>
				</Route>


			</Router>
		</div>

		
	</div>
</main>




<style>
	
	main{
		width:100%;
		height:100%;
	}


	.cont {
		height:100%;
		display:inline-block;
		position:relative;
		left:430px;
	}

	.nav {
		width:430px;
		height:100%;
		border-right:1px solid #ececec;
		display:inline-block;
		background-color: white;
		position:fixed;

		list-style-type: none; /* Remove bullets */
		padding: 0; /* Remove padding */
		margin: 0; /* Remove margins */
		top:0;
		z-index:999;
	}
	

	.top-cont{
		height:50px;
		padding-top:11px;
		padding-left:20px;
		font-weight:500;
		color:#00264d;
		width:100%;

	}

	.mid-cont{
		padding-top:55px;
		padding-left:100px;
		padding-bottom:60px;
	}

	ul.nav-no-bullets{
        list-style-type: none; /* Remove bullets */
        padding:0;
    }

	li.sdk{
		margin-left: 67px;
		font-size: 20px;
		line-height: 60px;
	}


	.nav-icon{margin-right:20px;}
 

	.nav-open-menu{
		cursor:pointer; 
		font-weight:600;
		position:fixed;
		left:17px;
		font-size:16px;
		display:none;
		color:#00264d;
		top:14px;
		z-index:999;
	}

	.nav-open-menu:hover{
		text-decoration: underline;
	}
 
	
</style>