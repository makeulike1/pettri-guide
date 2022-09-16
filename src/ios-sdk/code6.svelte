<script>
</script>
<div class='code'>
    <br>
    <div class='remark'>// 페트리 객체를 불러옵니다.</div>
    <div class='line'>let pettri = Pettri.getInstance</div>
    <br><br>
    <div class='remark'>// 회원이 로그인하였을 때 로그인 알림을 페트리 서버로 전송합니다.</div>
    <div class='line'>
        pettri.login().setId(userId: "user1234")
    </div>
    <br>
    <br>
    <div class='remark'>// 회원이 로그아웃하였을 때 로그아웃 알림을 페트리 서버로 전송합니다.</div>
    <div class='line'>
        pettri.logout()
    </div>
    <br>
    <br>
    <div class='line'>return true</div>
    <br>
</div>