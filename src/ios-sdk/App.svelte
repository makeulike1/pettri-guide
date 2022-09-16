<script>
	import { Router, Route } 	from "svelte-navigator";
	import SDKGuide2 			from "./SDKGuide2.svelte";	
	import IOSSDK1 				from "./ios-sdk/page1.svelte";	
	import IOSSDK2 				from "./ios-sdk/page2.svelte";	
	import IOSSDK3 				from "./ios-sdk/page3.svelte";	
	import IOSSDK4 				from "./ios-sdk/page4.svelte";	
	import IOSSDK5 				from "./ios-sdk/page5.svelte";	
	import IOSSDK6 				from "./ios-sdk/page6.svelte";	
	import IOSSDK7 				from "./ios-sdk/page7.svelte";	
	import IOSSDK8 				from "./ios-sdk/page8.svelte";	
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
							<a href="/ios-sdk-1"><li>페트리 초기화</li></a>
							<a href="/ios-sdk-2"><li>딥 링크 이벤트</li></a>
							<a href="/ios-sdk-3"><li>이벤트 분석</li></a>
							<ul>
								<a href="/ios-sdk-4"><li>회원 분석</li></a>
								<a href="/ios-sdk-7"><li>커머스 분석</li></a>
								<a href="/ios-sdk-8"><li>게임 분석</li></a>
							</ul>
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

				<!-- Router : iOS SDK Guide - Page 1 -->
				<Route path="/ios-sdk-1" primary={false}>
					<IOSSDK1/>
				</Route>

				<!-- Router : iOS SDK Guide - Page 2 -->
				<Route path="/ios-sdk-2" primary={false}>
					<IOSSDK2/>
				</Route>

				<!-- Router : iOS SDK Guide - Page 3 -->
				<Route path="/ios-sdk-3" primary={false}>
					<IOSSDK3/>
				</Route>

				<!-- Router : iOS SDK Guide - Page 4 -->
				<Route path="/ios-sdk-4" primary={false}>
					<IOSSDK4/>
				</Route>

				<!-- Router : iOS SDK Guide - Page 5 -->
				<Route path="/ios-sdk-5" primary={false}>
					<IOSSDK5/>
				</Route>

				<!-- Router : iOS SDK Guide - Page 6 -->
				<Route path="/ios-sdk-6" primary={false}>
					<IOSSDK6/>
				</Route>

				<!-- Router : iOS SDK Guide - Page 7 -->
				<Route path="/ios-sdk-7" primary={false}>
					<IOSSDK7/>
				</Route>

				<!-- Router : iOS SDK Guide - Page 8 -->
				<Route path="/ios-sdk-8" primary={false}>
					<IOSSDK8/>
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