<script>
    export let leftbrace
    export let rightbrace
</script>
<div class='code'>
    <div class='line'>import Pettri</div>
    <br>
    <div class='line'>func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {leftbrace}</div>
    <br>
    <div class='remark left-space'>// 페트리 객체를 불러옵니다.</div>
    <div class='line left-space'>let pettri = Pettri.getInstance</div>
    <br>
    <div class='remark left-space'>// 콘솔에서 발급받은 액세스키와 시크릿키를 입력합니다.</div>
    <div class='line left-space'>
        pettri.configure(accessKey : "...", secretKey : "...")
    </div>
    <br>
    <div class='remark left-space'>// 페트리 트래커를 초기화합니다.</div>
    <div class='line left-space'>
        pettri.init
    </div>
    <br>
    <div class='line left-space'>return true</div>
    <br>
    {rightbrace}
</div>