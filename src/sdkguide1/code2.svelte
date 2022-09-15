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
    <div class='remark left-space'>// 이벤트 개수를 기준으로 페트리에 업로드 요청합니다.</div>
    <div class='line left-space'>
        pettri.setUploadMetric(Pettri.UploadMetric.Event)
    </div>
    <br>
    <div class='remark left-space'>// 기준에 해당하는 개수가 되면 패트리로 업로드가 요청이 됩니다. 5번 이벤트가 발생되었을 경우 페트리에 업로드 됩니다.</div>
    <div class='line left-space'>
        pettri.setUploadMetric(5)
    </div>
    <br>
    <div class='line left-space'>return true</div>
    <br>
    {rightbrace}
</div>