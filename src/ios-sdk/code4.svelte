<script>
    export let leftbrace
    export let rightbrace
</script>
<div class='code'>
    <div class='line'>import Pettri</div>
    <br>
    <div class='line'>func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {leftbrace}</div>
    <br>
    <div class='remark left-space'>// 페트리 객체를 불러옵니다.</div>
    <div class='line left-space'>let pettri = Pettri.getInstance</div>
    <br>
    <div class='remark left-space'>// 딥 링크가 오픈되었음을 패트리 트래커 서버로 알리는 함수</div>
    <div class='line left-space'>
        pettri.open(Pettri.LinkType.DeepLink, url:url)
    </div>
    <br>
    <div class='line left-space'>return true</div>
    <br>
    {rightbrace}
</div>