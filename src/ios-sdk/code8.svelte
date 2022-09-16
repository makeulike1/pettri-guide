<script>
</script>
<div class='code'>
    <br>
    <div class='remark'>// 페트리 객체를 불러옵니다.</div>
    <div class='line'>let pettri = Pettri.getInstance</div>
    <br>
    <br>
    <div class='remark'>// 구매 이벤트에 대해서 속성을 선언합니다. 예를 들어서 앱 사용자가 5000원 가격의 pettri라는 모자를 구매했다고 가정합니다.</div>
    <div class='line'>
        let eventProps = PettriEventProperties()
        <br>
        eventProps.setIntegerData("price", 5000)
        <br>
        eventProps.setStringData("name", "pettri")
        <br>
        eventProps.setStringData("type", "hat")
        <br>
        
    </div>
    <br>
    <br>
    <div class='remark'>// 이벤트 발생이 이루어지면 선언된 속성값을 패트리 서버에 전송함으로써 분석에 활용할 수 있습니다.</div>
    <div class='line'>
        pettri.sendEvent(name: "purchase", value: eventProps)
    </div>

    <br>
    <br>
    <div class='line'>return true</div>
    <br>
</div>